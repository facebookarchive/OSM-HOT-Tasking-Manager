from flask_restful import Resource, current_app

from backend.services.users.user_service import UserService, UserServiceError, NotFound


class UsersOpenStreetMapAPI(Resource):
    def get(self, username):
        """
        Get details from OpenStreetMap for a specified username
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded sesesion token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: Mapper's OpenStreetMap username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: User found
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
            502:
                description: Bad response from OSM
        """
        try:
            osm_dto = UserService.get_osm_details_for_user(username)
            return osm_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found", "SubCode": "NotFound"}, 404
        except UserServiceError as e:
            return {"Error": str(e)}, 502
        except Exception as e:
            error_msg = f"User OSM GET - unhandled error: {str(e)}"
            current_app.logger.error(error_msg)
            return {
                "Error": "Unable to fetch OpenStreetMap details",
                "SubCode": "InternalServerError",
            }, 500
