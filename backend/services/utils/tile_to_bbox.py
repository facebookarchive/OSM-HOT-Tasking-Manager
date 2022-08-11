import math


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
