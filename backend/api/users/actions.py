from flask_restful import Resource, current_app, request
from schematics.exceptions import DataError

from backend.models.dtos.user_dto import (
    UserDTO,
    UserRegisterEmailDTO,
    AssignTasksDTO,
    UnassignTasksDTO,
)
from backend.services.messaging.message_service import MessageService
from backend.services.users.authentication_service import token_auth, tm
from backend.services.users.user_service import UserService, UserServiceError, NotFound
from backend.services.interests_service import InterestService
from backend.services.mapping_service import MappingServiceError, MappingService
from backend.services.validator_service import ValidatorServiceError
from backend.models.postgis.utils import UserLicenseError


class UsersActionsSetUsersAPI(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def patch(self):
        """
        Updates user info
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
            - in: body
              name: body
              required: true
              description: JSON object to update a user
              schema:
                  properties:
                      name:
                          type: string
                          example: Your Name
                      city:
                          type: string
                          example: Your City
                      country:
                          type: string
                          example: Your Country
                      emailAddress:
                          type: string
                          example: test@test.com
                      twitterId:
                          type: string
                          example: twitter handle without @
                      facebookId:
                          type: string
                          example: facebook username
                      linkedinId:
                          type: string
                          example: linkedin username
                      gender:
                          type: string
                          description: gender
                      selfDescriptionGender:
                          type: string
                          description: gender self-description
        responses:
            200:
                description: Details saved
            400:
                description: Client Error - Invalid Request
            401:
                description: Unauthorized - Invalid credentials
            500:
                description: Internal Server Error
        """
        try:
            user_dto = UserDTO(request.get_json())
            if user_dto.email_address == "":
                user_dto.email_address = (
                    None  # Replace empty string with None so validation doesn't break
                )

            user_dto.validate()
            authenticated_user_id = token_auth.current_user()
            if authenticated_user_id != user_dto.id:
                return {"Error": "Unable to authenticate"}, 401
        except ValueError as e:
            return {"Error": str(e)}, 400
        except DataError as e:
            current_app.logger.error(f"error validating request: {str(e)}")
            return {"Error": "Unable to update user details"}, 400

        try:
            verification_sent = UserService.update_user_details(
                authenticated_user_id, user_dto
            )
            return verification_sent, 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to update user details"}, 500


class UsersActionsSetLevelAPI(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def patch(self, username, level):
        """
        Allows PMs to set a user's mapping level
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
            - name: level
              in: path
              description: The mapping level that should be set
              required: true
              type: string
              default: ADVANCED
        responses:
            200:
                description: Level set
            400:
                description: Bad Request - Client Error
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            UserService.set_user_mapping_level(username, level)
            return {"Success": "Level set"}, 200
        except UserServiceError:
            return {"Error": "Not allowed"}, 400
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to update mapping level"}, 500


class UsersActionsSetRoleAPI(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def patch(self, username, role):
        """
        Allows PMs to set a user's role
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
            - name: role
              in: path
              description: The role to add
              required: true
              type: string
              default: ADMIN
        responses:
            200:
                description: Role set
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            UserService.add_role_to_user(token_auth.current_user(), username, role)
            return {"Success": "Role Added"}, 200
        except UserServiceError:
            return {"Error": "Not allowed"}, 403
        except NotFound:
            return {"Error": "User or mapping not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to update user role"}, 500


class UsersActionsSetExpertModeAPI(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def patch(self, is_expert):
        """
        Allows user to enable or disable expert mode
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
            - name: is_expert
              in: path
              description: true to enable expert mode, false to disable
              required: true
              type: string
        responses:
            200:
                description: Mode set
            400:
                description: Bad Request - Client Error
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            UserService.set_user_is_expert(
                token_auth.current_user(), is_expert == "true"
            )
            return {"Success": "Expert mode updated"}, 200
        except UserServiceError:
            return {"Error": "Not allowed"}, 400
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"UserSetExpert POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to update expert mode"}, 500


class UsersActionsVerifyEmailAPI(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def patch(self):
        """
        Resends the verification email token to the logged in user
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
        responses:
            200:
                description: Resends the user their email verification email
            500:
                description: Internal Server Error
        """
        try:
            MessageService.resend_email_validation(token_auth.current_user())
            return {"Success": "Verification email resent"}, 200
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": "Unable to send verification email"}, 500


class UsersActionsRegisterEmailAPI(Resource):
    def post(self):
        """
        Registers users without OpenStreetMap account
        ---
        tags:
          - users
        produces:
          - application/json
        parameters:
            - in: body
              name: body
              required: true
              description: JSON object to update a user
              schema:
                  properties:
                      email:
                          type: string
                          example: test@test.com
        responses:
            200:
                description: User registered
            400:
                description: Client Error - Invalid Request
            500:
                description: Internal Server Error
        """
        try:
            user_dto = UserRegisterEmailDTO(request.get_json())
            user_dto.validate()
        except DataError as e:
            current_app.logger.error(f"error validating request: {str(e)}")
            return str(e), 400

        try:
            user = UserService.register_user_with_email(user_dto)
            user_dto = UserRegisterEmailDTO(
                dict(
                    success=True,
                    email=user_dto.email,
                    details="User created successfully",
                    id=user.id,
                )
            )
            return user_dto.to_primitive(), 200
        except ValueError as e:
            user_dto = UserRegisterEmailDTO(dict(email=user_dto.email, details=str(e)))
            return user_dto.to_primitive(), 400
        except Exception as e:
            details_msg = "User POST - unhandled error: Unknown error"
            current_app.logger.critical(str(e))
            user_dto = UserRegisterEmailDTO(
                dict(email=user_dto.email, details=details_msg)
            )
            return user_dto.to_primitive(), 500


class UsersActionsSetInterestsAPI(Resource):
    @token_auth.login_required
    def post(self):
        """
        Creates a relationship between user and interests
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
            - in: body
              name: body
              required: true
              description: JSON object for creating/updating user and interests relationships
              schema:
                  properties:
                      interests:
                          type: array
                          items:
                            type: integer
        responses:
            200:
                description: New user interest relationship created
            400:
                description: Invalid Request
            401:
                description: Unauthorized - Invalid credentials
            500:
                description: Internal Server Error
        """
        try:
            data = request.get_json()
            user_interests = InterestService.create_or_update_user_interests(
                token_auth.current_user(), data["interests"]
            )
            return user_interests.to_primitive(), 200
        except ValueError as e:
            return {"Error": str(e)}, 400
        except NotFound:
            return {"Error": "Interest not Found"}, 404
        except Exception as e:
            error_msg = f"User relationship POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UserActionsAssignTasksAPI(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def post(self, project_id):
        """
        Manually assign tasks to a user
        ---
        tags:
            - project-admin
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - name: project_id
              in: path
              description: The ID of the project the task is associated with
              required: true
              type: integer
              default: 1
            - name: username
              in: query
              description: The username to assign the task to
              required: true
              type: string
              default: Thinkwhere
            - in: body
              name: tasks
              required: true
              description: JSON object for locking task(s)
              schema:
                  properties:
                      taskIds:
                          type: array
                          items:
                              type: integer
                          description: Array of taskIds for locking
                          default: [1,2]
        responses:
            200:
                description: Task(s) assigned to user
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: Task(s) or User not found
            500:
                description: Internal Server Error
        """
        try:
            assign_tasks_dto = AssignTasksDTO(request.get_json())
            assign_tasks_dto.assigner_id = tm.authenticated_user_id
            user_id = UserService.get_user_by_username(request.args.get("username")).id
            assign_tasks_dto.assignee_id = user_id
            assign_tasks_dto.project_id = project_id
            assign_tasks_dto.preferred_locale = request.environ.get(
                "HTTP_ACCEPT_LANGUAGE"
            )
            assign_tasks_dto.validate()

        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return str(e), 400

        try:
            task = MappingService.assign_tasks(assign_tasks_dto)
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found"}, 404
        except (MappingServiceError, ValidatorServiceError) as e:
            return {"Error": str(e)}, 403
        except UserLicenseError:
            return {"Error": "User not accepted license terms"}, 409
        except Exception as e:
            error_msg = f"Task Assign API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500


class UserActionsUnassignTasksAPI(Resource):
    @tm.pm_only()
    @token_auth.login_required
    def post(self, project_id):
        """
        Manually unassign tasks
        ---
        tags:
            - project-admin
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - name: project_id
              in: path
              description: The ID of the project the task is associated with
              required: true
              type: integer
              default: 1
            - in: body
              name: tasks
              required: true
              description: JSON object for unassigning task(s)
              schema:
                  properties:
                      taskIds:
                          type: array
                          items:
                              type: integer
                          description: Array of taskIds for unassigning
                          default: [1,2]
        responses:
            200:
                description: Task(s) unassigned
            401:
                description: Unauthorized - Invalid credentials
            404:
                description: Task(s) not found
            500:
                description: Internal Server Error
        """
        try:
            unassign_tasks_dto = UnassignTasksDTO(request.get_json())
            unassign_tasks_dto.project_id = project_id
            unassign_tasks_dto.assigner_id = tm.authenticated_user_id
            unassign_tasks_dto.preferred_locale = request.environ.get(
                "HTTP_ACCEPT_LANGUAGE"
            )
            unassign_tasks_dto.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return str(e), 400

        try:
            task = MappingService.unassign_tasks(unassign_tasks_dto)
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found"}, 404
        except (MappingServiceError, ValidatorServiceError) as e:
            return {"Error": str(e)}, 403
        except UserLicenseError:
            return {"Error": "User not accepted license terms"}, 409
        except Exception as e:
            error_msg = f"Task UnAssign API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"Error": error_msg}, 500
