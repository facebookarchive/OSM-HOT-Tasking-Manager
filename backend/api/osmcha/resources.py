import io
from distutils.util import strtobool

from flask import send_file, Response
from flask_restful import Resource, current_app, request
from schematics.exceptions import DataError

from backend.services.mapping_service import MappingService, NotFound
from backend.models.dtos.grid_dto import GridDTO
from backend.models.dtos.osmcha_dto import (
    OsmDTO,
)
from backend.models.dtos.user_dto import UserDTO
from backend.services.users.authentication_service import token_auth, tm
from backend.services.users.user_service import UserService
from backend.services.validator_service import ValidatorService
from backend.services.grid.grid_service import GridService
from backend.models.postgis.statuses import UserRole
from backend.models.postgis.utils import InvalidGeoJson
from backend.services.osmcha_service import OSMCHA



class OSMAPI(Resource):
    @token_auth.login_required
    def post(self):
        """
        Get osm metadata 
        ---
        tags:
            - osm
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              type: string
              default: Token sessionTokenHere=
              required: true
            - in: body
              name: body
              required: true
              description: JSON object to update osmcha data
              schema:
                properties:
                    project_id:
                        type: int
                        description: project id
        responses:
            200:
                description: osm data found
            404:
                description: osm data not found
            500:
                description: Internal Server Error
        """
        try:
            osm_dto=OsmDTO(request.get_json())       
            osm_dto.validate()
            osm = OSMCHA.OSM(osm_dto)
            return osm, 200

        except Exception as e:
            error_msg = f"OSMAPI - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch osm data"}, 500


class GETOSMAPI(Resource):
    @token_auth.login_required
    def get(self, project_id):
        """
        Get osm metadata 
        ---
        tags:
            - osm
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              type: string
              default: Token sessionTokenHere=
              required: true
            - in: path
              name: project_id
              description: project id
              type: integer
              required: true
        responses:
            200:
                description: osm data found
            404:
                description: osm data not found
            500:
                description: Internal Server Error
        """
        try:
            osm = OSMCHA.get_osm_data(project_id)
            return osm, 200

        except Exception as e:
            error_msg = f"OSMAPI - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch osm data"}, 500