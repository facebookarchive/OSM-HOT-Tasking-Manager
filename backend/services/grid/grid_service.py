import geojson
import json
import re
import os
import requests
from shapely.geometry import MultiPolygon, mapping, MultiPoint, shape, Point
from shapely.ops import cascaded_union
import shapely.geometry
from flask import current_app
from backend.models.dtos.grid_dto import GridDTO
from backend.models.postgis.utils import InvalidGeoJson
from backend.services.utils.tile_utils import TileUtils
from collections import deque


class GridServiceError(Exception):
    """Custom Exception to notify callers an error occurred when handling projects"""

    def __init__(self, message):
        if current_app:
            current_app.logger.error(message)


class GridService:
    @staticmethod
    def trim_grid_to_aoi(grid_dto: GridDTO) -> geojson.FeatureCollection:
        """
        Removes grid squares not intersecting with the aoi.  Optionally leaves partially intersecting task squares
        complete or clips them exactly to the AOI outline
        :param grid_dto: the dto containing
        :return: geojson.FeatureCollection trimmed task grid
        """
        # get items out of the dto
        grid = grid_dto.grid
        aoi = grid_dto.area_of_interest
        clip_to_aoi = grid_dto.clip_to_aoi

        # create a shapely shape from the aoi
        aoi_multi_polygon_geojson = GridService.merge_to_multi_polygon(
            aoi, dissolve=True
        )

        aoi_multi_polygon = shapely.geometry.shape(aoi_multi_polygon_geojson)
        intersecting_features = []
        for feature in grid["features"]:
            # create a shapely shape for the tile
            tile = shapely.geometry.shape(feature["geometry"])
            if aoi_multi_polygon.contains(tile):
                # tile is completely within aoi, use as is
                intersecting_features.append(feature)
            else:
                intersection = aoi_multi_polygon.intersection(tile)
                if intersection.is_empty or intersection.geom_type not in [
                    "Polygon",
                    "MultiPolygon",
                ]:
                    continue  # this intersections which are not polygons or which are completely outside aoi
                # tile is partially intersecting the aoi
                clipped_feature = GridService._update_feature(
                    clip_to_aoi, feature, intersection
                )
                intersecting_features.append(clipped_feature)
        return geojson.FeatureCollection(intersecting_features)

    @staticmethod
    def trim_grid_to_roads(grid_dto: GridDTO) -> geojson.FeatureCollection:
        """
        Removes grid squares that don't contain roads by interacting with OpenStreetMaps' Overpass API
        :param grid_dto: the dto containing
        :return: geojson.FeatureCollection trimmed task grid
        """
        overarching_bbox = shape(
            grid_dto["area_of_interest"]["features"][0]["geometry"]
        ).bounds
        roads = []
        lat_lon_arr = TileUtils().get_overpass_lat_lon(overarching_bbox)
        for task in grid_dto["grid"]["features"]:
            task_geometry = shape(task["geometry"])
            for lat, lon in lat_lon_arr:
                if task_geometry.intersects(Point(float(lat), float(lon))):
                    roads.append(task)
                    break
        return geojson.FeatureCollection(roads)

    @staticmethod
    def tasks_from_aoi_features(feature_collection: str) -> geojson.FeatureCollection:
        """
        Creates a geojson feature collection of tasks from an aoi feature collection
        :param feature_collection:
        :return: task features
        """
        parsed_geojson = GridService._to_shapely_geometries(
            json.dumps(feature_collection)
        )
        tasks = []
        for feature in parsed_geojson:
            if not isinstance(feature.geometry, MultiPolygon):
                feature.geometry = MultiPolygon([feature.geometry])
            # put the geometry back to geojson

            if feature.geometry.has_z:
                # Strip Z dimension, as can't persist geometry otherwise.  Most likely exists in KML data
                feature.geometry = shapely.ops.transform(
                    GridService._to_2d, feature.geometry
                )

            feature.geometry = shapely.geometry.mapping(feature.geometry)

            # set default properties
            # and put any already existing properties in `extra_properties`
            feature.properties = {
                "x": None,
                "y": None,
                "zoom": None,
                "isSquare": False,
                "extra_properties": feature.properties,
            }

            tasks.append(feature)

        return geojson.FeatureCollection(tasks)

    @staticmethod
    def merge_to_multi_polygon(
        feature_collection: str, dissolve: bool
    ) -> geojson.MultiPolygon:
        """
        Merge all geometries to a single multipolygon
        :param feature_collection: geojson feature collection str containing features
        :param dissolve: flag for wther to to dissolve internal boundaries.
        :return: geojson.MultiPolygon
        """
        parsed_geojson = GridService._to_shapely_geometries(
            json.dumps(feature_collection)
        )
        multi_polygon = GridService._convert_to_multipolygon(parsed_geojson)
        if dissolve:
            multi_polygon = GridService._dissolve(multi_polygon)
        aoi_multi_polygon_geojson = geojson.loads(json.dumps(mapping(multi_polygon)))

        # validate the geometry
        if type(aoi_multi_polygon_geojson) is not geojson.MultiPolygon:
            raise InvalidGeoJson(
                "MustBeMultiPloygon- Area Of Interest: geometry must be a MultiPolygon"
            )

        is_valid_geojson = geojson.is_valid(aoi_multi_polygon_geojson)
        if is_valid_geojson["valid"] == "no":
            raise InvalidGeoJson(
                f"InvalidMultipolygon- Area of Interest: Invalid MultiPolygon - {is_valid_geojson['message']}"
            )

        return aoi_multi_polygon_geojson

    @staticmethod
    def _update_feature(clip_to_aoi: bool, feature: dict, new_shape) -> dict:
        """
        Updates the feature with the new shape, and isSquare property
        :param clip_to_aoi: value for feature's is_square property
        :param feature: feature to be updated
        :param new_shape: new shape to use for feature
        :return:
        """
        if clip_to_aoi:
            # update the feature with the clipped shape
            if new_shape.geom_type == "Polygon":
                # shapely may return a POLYGON rather than a MULTIPOLYGON if there is just one intersection area
                new_shape = MultiPolygon([new_shape])
            feature["geometry"] = mapping(new_shape)
            feature["properties"]["isSquare"] = False
        return feature

    @staticmethod
    def _to_shapely_geometries(input: str) -> list:
        """
        Parses the input geojson and returns a list of geojson.Feature objects with their geometries
        adapted to shapely geometries
        :param input: string of geojson
        :return: list of geojson.Feature objects with their geometries adapted to shapely geometries
        """
        collection = geojson.loads(input, object_hook=geojson.GeoJSON.to_instance)

        if not hasattr(collection, "features") or len(collection.features) < 1:
            raise InvalidGeoJson(
                "MustHaveFeatures- Geojson does not contain any features"
            )

        shapely_features = list(
            (
                filter(
                    lambda x: x is not None,
                    map(GridService._adapt_feature_geometry, collection.features),
                )
            )
        )

        return shapely_features

    @staticmethod
    def _adapt_feature_geometry(feature: geojson.Feature) -> geojson.Feature:
        """
        Adapts the feature geometry to be used as a shapely geometry
        :param feature: geojson.feature to be adapted
        :return: feature with geometry adapted
        """
        if isinstance(
            feature.geometry, (geojson.geometry.Polygon, geojson.geometry.MultiPolygon)
        ):
            # adapt the geometry for use as a shapely geometry
            # http://toblerity.org/shapely/manual.html#shapely.geometry.asShape
            feature.geometry = shapely.geometry.asShape(feature.geometry)
            return feature
        else:
            return None

    @staticmethod
    def _convert_to_multipolygon(features: list) -> MultiPolygon:
        """
        converts a list of (multi)polygon geometries to one single multipolygon
        :param features:
        :return:
        """
        rings = []
        for feature in features:
            if isinstance(feature.geometry, MultiPolygon):
                rings = rings + [geom for geom in feature.geometry.geoms]
            else:
                rings = rings + [feature.geometry]

        geometry = MultiPolygon(rings)

        # Downsample 3D -> 2D
        if geometry.has_z:
            geometry = shapely.ops.transform(GridService._to_2d, geometry)
        wkt2d = geometry.wkt
        geom2d = shapely.wkt.loads(wkt2d)

        return geom2d

    def _to_2d(x: tuple, y: tuple, z: tuple = None) -> tuple:
        """
        Helper method that can be used to strip out the z-coords from a shapely geometry
        :param x: tuple containing tuple of x coords
        :param y: tuple containing tuple of y coords
        :param z: tuple containing tuple of z coords
        :return: tuple of containing tuple of x coords and tuple of y coords
        """
        return tuple(filter(None, [x, y]))

    @staticmethod
    def _dissolve(geoms: MultiPolygon) -> MultiPolygon:
        """
        dissolves a Multipolygons
        :return: Multipolygon
        """
        # http://toblerity.org/shapely/manual.html#shapely.ops.cascaded_union
        geometry = cascaded_union(geoms)
        if geometry.geom_type == "Polygon":
            # shapely may return a POLYGON rather than a MULTIPOLYGON if there is just one shape
            # force Multipolygon
            geometry = MultiPolygon([geometry])
        return geometry

    def _create_overarching_bbox(
        grid_dto: GridDTO, latlng_switch: bool = False
    ) -> geojson.FeatureCollection:
        """
        Recreates the entire bbox given a grid. NOTE Potentially redundant
        :param grid_dto: the dto containing
        :param latlng_switch: switch to latlng format if needed. Default is lnglat
        :return: tuple (minX, minY, maxX, maxY)
        """
        coords = []  # to be used to create a MultiPoint obj
        for feature in grid_dto["area_of_interest"][
            "features"
        ]:  # combine all grids in to one.
            # NOTE This exists in aoi_bbox under _get_project_and_base_dto but couldn't figure out how to access
            x, y, z = (
                feature["properties"]["x"],
                feature["properties"]["y"],
                feature["properties"]["zoom"],
            )
            if z > 14:
                x, y, z = GridService._get_parent_tile(x, y, z)
            if z < 14:
                many_tiles = GridService._get_child_tile(
                    x, y, z
                )  # TODO Refactor so that it gives all 4 tiles
                x, y, z = many_tiles[0]  # arbitrarily pick the first one

            bbox = TileUtils().tile_to_bbox(x, y, z)
            coords.append((bbox[0], bbox[1]))
            coords.append((bbox[2], bbox[3]))
        overarching_bbox = MultiPoint(coords).bounds
        return (
            overarching_bbox
            if not latlng_switch
            else (
                overarching_bbox[1],
                overarching_bbox[0],
                overarching_bbox[3],
                overarching_bbox[2],
            )
        )

    def _convert_mapillary_coords_to_lat_lon(
        overarching_bbox: tuple, coordinate: list, tile_extent: int
    ) -> tuple:
        """
        Helper method to convert Mapillary's 4096 pixel based coordinates to lon/lat
        :param overarching_bbox: bounding box that covers entire tile
        :param coordinate: Mapillary coordinate arr
        :param tile_extent: Mapillary's tile extent (usually 4096 pixels)
        :return: tuple containing longitude and latitude
        """
        tile_width = abs(overarching_bbox[2] - overarching_bbox[0])  # max_x - min_x
        tile_height = abs(overarching_bbox[3] - overarching_bbox[1])  # max_y - min_y
        lon_offset = (coordinate[0] / tile_extent) * tile_width
        lat_offset = (coordinate[1] / tile_extent) * tile_height
        lon = overarching_bbox[0] + lon_offset  # max_x plus the offset
        lat = (
            overarching_bbox[3] - lat_offset
        )  # max_y minus the offset, because start at top left corner of tile in this special instance
        return (lon, lat)

    def _get_parent_tile(x: int, y: int, z: int, desired_zoom: int = 14) -> tuple:
        """
        Gets the tile at lower zoom levels until zoom (z) == desired_zoom
        Ported from mapbox's tilebelt https://github.com/mapbox/tilebelt/blob/master/index.js#L106
        :param x: tile's x value
        :param y: tile's y value
        :param z: tile's z (zoom) value
        :param desired_zoom: desired z to calculate. Default 14 is for Mapillary
        :return: tuple containing newly calculated x, y, z
        """
        while z > desired_zoom:
            x >>= 1
            y >>= 1
            z -= 1
        return (x, y, z)

    def _get_child_tile(x: int, y: int, z: int, desired_zoom: int = 14) -> list:
        """
        Gets the 4 tiles at higher zoom levels until zoom (z) == desired_zoom
        Ported from mapbox's tilebelt https://github.com/mapbox/tilebelt/blob/master/index.js#L87
        NOTE Don't let input z be too far away from desired_zoom. O(4^n) time and space.
        :param x: tile's x value
        :param y: tile's y value
        :param z: tile's z (zoom) value
        :param desired_zoom: desired z to calculate. Default 14 is for Mapillary
        :return: tuple containing newly calculated x, y, z
        """
        queue = deque([[x, y, z]])
        output = []
        while queue:
            x, y, z = queue.popleft()
            if z < desired_zoom:
                queue.append([x * 2, y * 2, z + 1])
                queue.append([x * 2 + 1, y * 2, z + 1])
                queue.append([x * 2 + 1, y * 2 + 1, z + 1])
                queue.append([x * 2, y * 2 + 1, z + 1])
            else:
                output.append([x, y, z])

        return output
