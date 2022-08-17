import math
import os
import requests
import re


class TileUtils:
    """ Class for Tasking Manager Tile Helper Functions """

    def bbox_to_tile(self, bbox_coords):
        """
        Get the smallest tile to cover a bbox. Ported over from Mapbox's tilebelt
        https://github.com/mapbox/tilebelt/blob/master/index.js#L235
        :param bbox_coords: bbox in lon/lat format eg [ -178, 84, -177, 85 ]
        :return: tile x, y, z
        """
        min = self.point_to_tile(bbox_coords[0], bbox_coords[1], 32)
        max = self.point_to_tile(bbox_coords[2], bbox_coords[3], 32)

        bbox = [min[0], min[1], max[0], max[1]]

        z = self.get_bbox_zoom(bbox)
        if z == 0:
            return [0, 0, 0]
        x = bbox[0] >> (32 - z)
        y = bbox[1] >> (32 - z)
        return [x, y, z]

    def get_bbox_zoom(self, bbox):
        max_zoom = 28
        for z in range(max_zoom):
            mask = 1 << (32 - (z + 1))
            if ((bbox[0] & mask) != (bbox[2] & mask)) or (
                (bbox[1] & mask) != (bbox[3] & mask)
            ):
                return z

    def point_to_tile_fraction(self, lon, lat, z):
        """
        Get the precise fractional tile location for a point at a zoom level. Ported over from Mapbox's tilebelt
        https://github.com/mapbox/tilebelt/blob/master/index.js#L271
        :param lon: longitude
        :param lat: latitude
        :param z: zoom level
        :return: tile fraction
        """
        sin = math.sin(lat * (math.pi / 180))
        z2 = math.pow(2, z)
        x = z2 * (lon / 360 + 0.5)
        y = z2 * (0.5 - 0.25 * math.log((1 + sin) / (1 - sin)) / math.pi)

        # Wrap Tile X
        x %= z2
        if x < 0:
            x += z2
        return [x, y, z]

    def point_to_tile(self, lon, lat, z):
        """
        Get the tile for a point at a specified zoom level. Ported over from Mapbox's tilebelt
        https://github.com/mapbox/tilebelt/blob/master/index.js#L70
        :param lon: longitude
        :param lat: latitude
        :param z: zoom level
        :return: tile rounded down
        """
        tile = self.point_to_tile_fraction(lon, lat, z)
        tile[0] = math.floor(tile[0])
        tile[1] = math.floor(tile[1])
        return tile

    def tile_to_bbox(x: int, y: int, zoom: int) -> tuple:
        """
        Helper method to convert tile's xyz to bbox.
        Code from https://www.flother.is/til/map-tile-bounding-box-python/
        Tested against Mapbox's Tilebelt https://github.com/mapbox/tilebelt
        :param x: tile's x coordinate
        :param y: tile's y coordinate
        :param z: tile's zoom level
        :return: tuple containing bbox in format of Mapbox's Tilebelt
        """

        def tile_lon(x: int, z: int) -> float:
            return x / math.pow(2.0, z) * 360.0 - 180

        def tile_lat(y: int, z: int) -> float:
            return math.degrees(
                math.atan(math.sinh(math.pi - (2.0 * math.pi * y) / math.pow(2.0, z)))
            )

        north = tile_lat(y, zoom)
        south = tile_lat(y + 1, zoom)
        west = tile_lon(x, zoom)
        east = tile_lon(x + 1, zoom)
        return (west, south, east, north)

    def get_overpass_lat_lon(self, bbox):
        url = os.getenv(
            "OVERPASS_QUERY_URL"
        ) + '[out:json][timeout:25];(way["highway"]{};);out geom;'.format(bbox)
        overpass_resp = requests.get(url)
        lat_lon_arr = re.findall(
            r'"lat":\s+(-?\d+\.\d+),\s+"lon":\s+(-?\d+\.\d+)', overpass_resp.text
        )
        return lat_lon_arr
