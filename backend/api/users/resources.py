from flask_restful import Resource, current_app, request
from schematics.exceptions import DataError

from backend.models.dtos.user_dto import UserSearchQuery
from backend.services.users.authentication_service import token_auth, tm
from backend.services.users.user_service import UserService, NotFound


class UsersRestAPI(Resource):
    @token_auth.login_required
    def get(self, user_id):
        """
        Get user information by id
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
            - name: user_id
              in: path
              description: The id of the user
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: User found
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            user_dto = UserService.get_user_dto_by_id(user_id)
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"Userid GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch user details"}, 500


class UsersAllAPI(Resource):
    @token_auth.login_required
    def get(self):
        """
        Get paged list of all usernames
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
            - in: query
              name: page
              description: Page of results user requested
              type: integer
            - in: query
              name: username
              description: Full or part username
              type: string
            - in: query
              name: role
              description: Role of User, eg ADMIN, PROJECT_MANAGER
              type: string
            - in: query
              name: level
              description: Level of User, eg BEGINNER
              type: string
        responses:
            200:
                description: Users found
            401:
                description: Unauthorized - Invalid credentials
            500:
                description: Internal Server Error
        """
        try:
            query = UserSearchQuery()
            query.page = (
                int(request.args.get("page")) if request.args.get("page") else 1
            )
            query.username = request.args.get("username")
            query.mapping_level = request.args.get("level")
            query.role = request.args.get("role")
            query.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Unable to fetch user list"}, 400

        try:
            users_dto = UserService.get_all_users(query)
            return users_dto.to_primitive(), 200
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch user list"}, 500


class UsersQueriesUsernameAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get user information by OpenStreetMap username
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
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
        """
        try:
            user_dto = UserService.get_user_dto_by_username(
                username, tm.authenticated_user_id
            )
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch user details"}, 500


class UsersQueriesUsernameFilterAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get paged lists of users matching OpenStreetMap username filter
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: Mapper's partial or full OpenStreetMap username
              type: string
              default: ab
            - in: query
              name: page
              description: Page of results user requested
              type: integer
            - in: query
              name: projectId
              description: Optional, promote project participants to head of results
              type: integer
        responses:
            200:
                description: Users found
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            page = int(request.args.get("page")) if request.args.get("page") else 1
            project_id = request.args.get("projectId", None, int)
            users_dto = UserService.filter_users(username, project_id, page)
            return users_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to fetch matching users"}, 500


class UserFavoritesAPI(Resource):
    @token_auth.login_required
    def get(self):
        """
        Get projects favorited by a user
        ---
        tags:
          - favorites
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
        responses:
            200:
                description: Projects favorited by user
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            favs_dto = UserService.get_projects_favorited(tm.authenticated_user_id)
            return favs_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"UserFavorites GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UserRecommendedProjectsAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get recommended projects for a user
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - in: header
              name: Authorization
              description: Base64 encoded session token
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
                description: Recommended projects found
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: No recommended projects found
            500:
                description: Internal Server Error
        """
        try:
            locale = (
                request.environ.get("HTTP_ACCEPT_LANGUAGE")
                if request.environ.get("HTTP_ACCEPT_LANGUAGE")
                else "en"
            )
            user_dto = UserService.get_recommended_projects(username, locale)
            return user_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UserInterestsAPI(Resource):
    @token_auth.login_required
    def get(self, username):
        """
        Get interests by username
        ---
        tags:
          - interests
        produces:
          - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: username
              in: path
              description: Mapper's OpenStreetMap username
              required: true
              type: string
        responses:
            200:
                description: User interests returned
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            user = UserService.get_user_by_username(username)
            interests_dto = UserService.get_interests(user)
            return interests_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"UserInterests GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500
