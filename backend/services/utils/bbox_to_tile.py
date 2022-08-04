import math


# TODO docstring for all utils + credit to Mapbox
def bbox_to_tile(bbox_coords):
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
    tile = point_to_tile_fraction(lon, lat, z)
    tile[0] = math.floor(tile[0])
    tile[1] = math.floor(tile[1])
    return tile
