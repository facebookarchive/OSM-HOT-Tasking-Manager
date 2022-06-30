import axios from 'axios'
import tilebelt from "@mapbox/tilebelt"
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

export const getRoadHighwayImages = async (x, y, z) => {
    /*
    Searches individual tiles (MVT format) to see if it's a road, highway, or footpath. 
    If it is, see if there are street view images taken.
    Used to search for all rows in task grid
    ---
    tags:
        - campaign
    produces:
        - array
    parameters:
        - name: x, y, z
            in: header
            description: x, y, and zoom level of task tile
            required: true
            type: integer
    responses:
        200:
            description: Tiles and/or images fetched successfully
        400:
            description: Invalid Request or too many requests
        500:
            description: Internal Server Error
    */
    const bbox = tilebelt.tileToBBOX([x, y, z])
    const url = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node["highway"="footway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});way["highway"="footway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});relation["highway"="footway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}););out;>;out skel qt;`
    const result = await axios.get(url);
    if (result.data.elements.length > 0) { // if it's a road/highway/etc. fetch any images
        const url = `https://tiles.mapillary.com/maps/vtp/mly1_public/2/${z}/${x}/${y}?access_token=MLY%7C5458526104199012%7Cc91f32db4e70dcd39a263dce9aa7f261`
        axios.get(url, {
        responseType: 'arraybuffer'
        }).then(response => {
            const protobuf = new Protobuf(new Uint8Array(response.data))
            const tile = new VectorTile(protobuf)
            return tile
        })
    }
  };