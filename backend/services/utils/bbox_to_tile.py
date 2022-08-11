import math


def bbox_to_tile(bbox_coords):
    """
    Get the smallest tile to cover a bbox. Ported over from Mapbox's tilebelt
    https://github.com/mapbox/tilebelt/blob/master/index.js#L235
    :param bbox_coords: bbox in lon/lat format eg [ -178, 84, -177, 85 ]
    :return: tile x, y, z
    """
    min = point_to_tile(bbox_coords[0], bbox_coords[1], 32)
    max = point_to_tile(bbox_coords[2], bbox_coords[3], 32)

    bbox = [min[0], min[1], max[0], max[1]]

    z = get_bbox_zoom(bbox)
    if z == 0:
        return [0, 0, 0]
    x = bbox[0] >> (32 - z)
    y = bbox[1] >> (32 - z)
    return [x, y, z]


def get_bbox_zoom(bbox):
    max_zoom = 28
    for z in range(max_zoom):
        mask = 1 << (32 - (z + 1))
        if ((bbox[0] & mask) != (bbox[2] & mask)) or (
            (bbox[1] & mask) != (bbox[3] & mask)
        ):
            return z


def point_to_tile_fraction(lon, lat, z):
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


def point_to_tile(lon, lat, z):
    """
    Get the tile for a point at a specified zoom level. Ported over from Mapbox's tilebelt
    https://github.com/mapbox/tilebelt/blob/master/index.js#L70
    :param lon: longitude
    :param lat: latitude
    :param z: zoom level
    :return: tile rounded down
    """
    tile = point_to_tile_fraction(lon, lat, z)
    tile[0] = math.floor(tile[0])
    tile[1] = math.floor(tile[1])
    return tile
