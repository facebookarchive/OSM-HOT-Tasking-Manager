from flask_restful import Resource, current_app, request
from schematics.exceptions import DataError

from backend.models.dtos.grid_dto import SplitTaskDTO
from backend.models.postgis.utils import NotFound, InvalidGeoJson
from backend.services.grid.split_service import SplitService, SplitServiceError
from backend.services.users.user_service import UserService
from backend.services.project_admin_service import ProjectAdminService
from backend.services.users.authentication_service import token_auth, tm
from backend.models.dtos.validator_dto import (
    LockForValidationDTO,
    UnlockAfterValidationDTO,
    StopValidationDTO,
)
from backend.services.validator_service import (
    ValidatorService,
    ValidatorServiceError,
    UserLicenseError,
)
from backend.models.dtos.mapping_dto import (
    LockTaskDTO,
    StopMappingTaskDTO,
    MappedTaskDTO,
)
from backend.services.mapping_service import MappingService, MappingServiceError


class TasksActionsMappingLockAPI(Resource):
    @token_auth.login_required
    def post(self, project_id, task_id):
        """
        Locks a task for mapping
        ---
        tags:
            - tasks
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
              description: Project ID the task is associated with
              required: true
              type: integer
              default: 1
            - name: task_id
              in: path
              description: Unique task ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Task locked
            400:
                description: Client Error
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: Task not found
            409:
                description: User has not accepted license terms of project
            500:
                description: Internal Server Error
        """
        try:
            lock_task_dto = LockTaskDTO()
            lock_task_dto.user_id = token_auth.current_user()
            lock_task_dto.project_id = project_id
            lock_task_dto.task_id = task_id
            lock_task_dto.preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            lock_task_dto.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Unable to lock task", "SubCode": "InvalidData"}, 400

        try:
            task = MappingService.lock_task_for_mapping(lock_task_dto)
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found", "SubCode": "NotFound"}, 404
        except MappingServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except UserLicenseError:
            return {
                "Error": "User not accepted license terms",
                "SubCode": "UserLicenseError",
            }, 409
        except Exception as e:
            error_msg = f"Task Lock API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to lock task",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsMappingStopAPI(Resource):
    @token_auth.login_required
    def post(self, project_id, task_id):
        """
        Unlock a task that is locked for mapping resetting it to its last status
        ---
        tags:
            - tasks
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
              description: Project ID the task is associated with
              required: true
              type: integer
              default: 1
            - name: task_id
              in: path
              description: Unique task ID
              required: true
              type: integer
              default: 1
            - in: body
              name: body
              required: true
              description: JSON object for unlocking a task
              schema:
                  id: TaskUpdateStop
                  properties:
                      comment:
                          type: string
                          description: Optional user comment about the task
                          default: Comment about mapping done before stop
        responses:
            200:
                description: Task unlocked
            400:
                description: Client Error
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: Task not found
            500:
                description: Internal Server Error
        """
        try:
            stop_task = StopMappingTaskDTO(request.get_json())
            stop_task.user_id = token_auth.current_user()
            stop_task.task_id = task_id
            stop_task.project_id = project_id
            stop_task.preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            stop_task.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Task unlock failed", "SubCode": "InvalidData"}, 400

        try:
            task = MappingService.stop_mapping_task(stop_task)
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found", "SubCode": "NotFound"}, 404
        except MappingServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except Exception as e:
            error_msg = f"Task Lock API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Task unlock failed",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsMappingUnlockAPI(Resource):
    @token_auth.login_required
    def post(self, project_id, task_id):
        """
        Set a task as mapped
        ---
        tags:
            - tasks
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Project ID the task is associated with
              required: true
              type: integer
              default: 1
            - name: task_id
              in: path
              description: Unique task ID
              required: true
              type: integer
              default: 1
            - in: body
              name: body
              required: true
              description: JSON object for unlocking a task
              schema:
                  id: TaskUpdateUnlock
                  required:
                      - status
                  properties:
                      status:
                          type: string
                          description: The new status for the task
                          default: MAPPED
                      comment:
                          type: string
                          description: Optional user comment about the task
                          default: Comment about the mapping
        responses:
            200:
                description: Task unlocked
            400:
                description: Client Error
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: Task not found
            500:
                description: Internal Server Error
        """
        try:
            authenticated_user_id = token_auth.current_user()
            mapped_task = MappedTaskDTO(request.get_json())
            mapped_task.user_id = authenticated_user_id
            mapped_task.task_id = task_id
            mapped_task.project_id = project_id
            mapped_task.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Task unlock failed", "SubCode": "InvalidData"}, 400

        try:
            task = MappingService.unlock_task_after_mapping(mapped_task)
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found", "SubCode": "NotFound"}, 404
        except MappingServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except Exception as e:
            error_msg = f"Task Lock API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Task unlock failed",
                "SubCode": "InternalServerError",
            }, 500
        finally:
            # Refresh mapper level after mapping
            UserService.check_and_update_mapper_level(authenticated_user_id)


class TasksActionsMappingUndoAPI(Resource):
    @token_auth.login_required
    def post(self, project_id, task_id):
        """
        Undo a task's mapping status
        ---
        tags:
            - tasks
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
              description: Project ID the task is associated with
              required: true
              type: integer
              default: 1
            - name: task_id
              in: path
              description: Unique task ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Task found
            403:
                description: Forbidden
            404:
                description: Task not found
            500:
                description: Internal Server Error
        """
        try:
            preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            task = MappingService.undo_mapping(
                project_id, task_id, token_auth.current_user(), preferred_locale
            )
            return task.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found", "SubCode": "NotFound"}, 404
        except MappingServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except Exception as e:
            error_msg = f"Task GET API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to lock task",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsValidationLockAPI(Resource):
    @token_auth.login_required
    def post(self, project_id):
        """
        Lock tasks for validation
        ---
        tags:
            - tasks
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
              description: Project ID the tasks are associated with
              required: true
              type: integer
              default: 1
            - in: body
              name: body
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
                description: Task(s) locked for validation
            400:
                description: Client Error
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: Task not found
            409:
                description: User has not accepted license terms of project
            500:
                description: Internal Server Error
        """
        try:
            validator_dto = LockForValidationDTO(request.get_json())
            validator_dto.project_id = project_id
            validator_dto.user_id = token_auth.current_user()
            validator_dto.preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            validator_dto.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Unable to lock task", "SubCode": "InvalidData"}, 400

        try:
            tasks = ValidatorService.lock_tasks_for_validation(validator_dto)
            return tasks.to_primitive(), 200
        except ValidatorServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except NotFound:
            return {"Error": "Task not found", "SubCode": "NotFound"}, 404
        except UserLicenseError:
            return {
                "Error": "User not accepted license terms",
                "SubCode": "UserLicenseError",
            }, 409
        except Exception as e:
            error_msg = f"Validator Lock API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to lock task",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsValidationStopAPI(Resource):
    @tm.pm_only(False)
    @token_auth.login_required
    def post(self, project_id):
        """
        Unlock tasks that are locked for validation resetting them to their last status
        ---
        tags:
            - tasks
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
              description: Project ID the task is associated with
              required: true
              type: integer
              default: 1
            - in: body
              name: body
              required: true
              description: JSON object for unlocking a task
              schema:
                  properties:
                      resetTasks:
                          type: array
                          items:
                              schema:
                                  $ref: "#/definitions/ResetTask"
        responses:
            200:
                description: Task unlocked
            400:
                description: Client Error
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: Task not found
            500:
                description: Internal Server Error
        """
        try:
            validated_dto = StopValidationDTO(request.get_json())
            validated_dto.project_id = project_id
            validated_dto.user_id = token_auth.current_user()
            validated_dto.preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            validated_dto.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Task unlock failed", "SubCode": "InvalidData"}, 400

        try:
            tasks = ValidatorService.stop_validating_tasks(validated_dto)
            return tasks.to_primitive(), 200
        except ValidatorServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except NotFound:
            return {"Error": "Task unlock failed", "SubCode": "NotFound"}, 404
        except Exception as e:
            error_msg = f"Stop Validating API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Task unlock failed",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsValidationUnlockAPI(Resource):
    @token_auth.login_required
    def post(self, project_id):
        """
        Set tasks as validated
        ---
        tags:
            - tasks
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
              description: Project ID the task is associated with
              required: true
              type: integer
              default: 1
            - in: body
              name: body
              required: true
              description: JSON object for unlocking a task
              schema:
                  properties:
                      validatedTasks:
                          type: array
                          items:
                              schema:
                                  $ref: "#/definitions/ValidatedTask"
        responses:
            200:
                description: Task unlocked
            400:
                description: Client Error
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: Task not found
            500:
                description: Internal Server Error
        """
        try:
            validated_dto = UnlockAfterValidationDTO(request.get_json())
            validated_dto.project_id = project_id
            validated_dto.user_id = token_auth.current_user()
            validated_dto.preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            validated_dto.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Task unlock failed", "SubCode": "InvalidData"}, 400

        try:
            tasks = ValidatorService.unlock_tasks_after_validation(validated_dto)
            return tasks.to_primitive(), 200
        except ValidatorServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except NotFound:
            return {"Error": "Task unlock failed", "SubCode": "NotFound"}, 404
        except Exception as e:
            error_msg = f"Validator Lock API - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Task unlock failed",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsMapAllAPI(Resource):
    @token_auth.login_required
    def post(self, project_id):
        """
        Map all tasks on a project
        ---
        tags:
            - tasks
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: All tasks mapped
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            500:
                description: Internal Server Error
        """
        try:
            authenticated_user_id = token_auth.current_user()
            if not ProjectAdminService.is_user_action_permitted_on_project(
                authenticated_user_id, project_id
            ):
                raise ValueError()
        except ValueError:
            return {
                "Error": "User is not a manager of the project",
                "SubCode": "UserPermissionError",
            }, 403

        try:
            MappingService.map_all_tasks(project_id, authenticated_user_id)
            return {"Success": "All tasks mapped"}, 200
        except Exception as e:
            error_msg = f"TasksActionsMapAllAPI POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to map all the tasks",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsValidateAllAPI(Resource):
    @token_auth.login_required
    def post(self, project_id):
        """
        Validate all mapped tasks on a project
        ---
        tags:
            - tasks
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: All mapped tasks validated
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            500:
                description: Internal Server Error
        """
        try:
            authenticated_user_id = token_auth.current_user()
            if not ProjectAdminService.is_user_action_permitted_on_project(
                authenticated_user_id, project_id
            ):
                raise ValueError()
        except ValueError:
            return {
                "Error": "User is not a manager of the project",
                "SubCode": "UserPermissionError",
            }, 403

        try:
            ValidatorService.validate_all_tasks(project_id, authenticated_user_id)
            return {"Success": "All tasks validated"}, 200
        except Exception as e:
            error_msg = f"TasksActionsValidateAllAPI POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to validate all tasks",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsInvalidateAllAPI(Resource):
    @token_auth.login_required
    def post(self, project_id):
        """
        Invalidate all mapped tasks on a project
        ---
        tags:
            - tasks
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: All mapped tasks invalidated
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            500:
                description: Internal Server Error
        """
        try:
            authenticated_user_id = token_auth.current_user()
            if not ProjectAdminService.is_user_action_permitted_on_project(
                authenticated_user_id, project_id
            ):
                raise ValueError()
        except ValueError:
            return {
                "Error": "User is not a manager of the project",
                "SubCode": "UserPermissionError",
            }, 403

        try:
            ValidatorService.invalidate_all_tasks(project_id, authenticated_user_id)
            return {"Success": "All tasks invalidated"}, 200
        except Exception as e:
            error_msg = f"TasksActionsInvalidateAllAPI POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to invalidate all tasks",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsResetBadImageryAllAPI(Resource):
    @token_auth.login_required
    def post(self, project_id):
        """
        Set all bad imagery tasks as ready for mapping
        ---
        tags:
            - tasks
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: All bad imagery tasks marked ready for mapping
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            500:
                description: Internal Server Error
        """
        try:
            authenticated_user_id = token_auth.current_user()
            if not ProjectAdminService.is_user_action_permitted_on_project(
                authenticated_user_id, project_id
            ):
                raise ValueError()
        except ValueError:
            return {
                "Error": "User is not a manager of the project",
                "SubCode": "UserPermissionError",
            }, 403

        try:
            MappingService.reset_all_badimagery(project_id, authenticated_user_id)
            return {"Success": "All bad imagery tasks marked ready for mapping"}, 200
        except Exception as e:
            error_msg = (
                f"TasksActionsResetBadImageryAllAPI POST - unhandled error: {str(e)}"
            )
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to reset tasks",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsResetAllAPI(Resource):
    @token_auth.login_required
    def post(self, project_id):
        """
        Reset all tasks on project back to ready, preserving history
        ---
        tags:
            - tasks
        produces:
            - application/json
        parameters:
            - in: header
              name: Authorization
              description: Base64 encoded session token
              required: true
              type: string
              default: Token sessionTokenHere==
            - name: project_id
              in: path
              description: Unique project ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: All tasks reset
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            500:
                description: Internal Server Error
        """
        try:
            authenticated_user_id = token_auth.current_user()
            authenticated_user_id = token_auth.current_user()
            if not ProjectAdminService.is_user_action_permitted_on_project(
                authenticated_user_id, project_id
            ):
                raise ValueError()
        except ValueError:
            return {
                "Error": "User is not a manager of the project",
                "SubCode": "UserPermissionError",
            }, 403

        try:
            ProjectAdminService.reset_all_tasks(project_id, authenticated_user_id)
            return {"Success": "All tasks reset"}, 200
        except Exception as e:
            error_msg = f"TasksActionsResetAllAPI POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to reset tasks",
                "SubCode": "InternalServerError",
            }, 500


class TasksActionsSplitAPI(Resource):
    @token_auth.login_required
    def post(self, project_id, task_id):
        """
        Split a task
        ---
        tags:
            - tasks
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
              description: Project ID the task is associated with
              required: true
              type: integer
              default: 1
            - name: task_id
              in: path
              description: Unique task ID
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Task split OK
            400:
                description: Client Error
            401:
                description: Unauthorized - Invalid credentials
            403:
                description: Forbidden
            404:
                description: Task not found
            500:
                description: Internal Server Error
        """
        try:
            split_task_dto = SplitTaskDTO()
            split_task_dto.user_id = token_auth.current_user()
            split_task_dto.project_id = project_id
            split_task_dto.task_id = task_id
            split_task_dto.preferred_locale = request.environ.get(
                "HTTP_ACCEPT_LANGUAGE"
            )
            split_task_dto.validate()
        except DataError as e:
            current_app.logger.error(f"Error validating request: {str(e)}")
            return {"Error": "Unable to split task", "SubCode": "InvalidData"}, 400
        try:
            tasks = SplitService.split_task(split_task_dto)
            return tasks.to_primitive(), 200
        except NotFound:
            return {"Error": "Task Not Found", "SubCode": "NotFound"}, 404
        except SplitServiceError as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except InvalidGeoJson as e:
            return {"Error": str(e).split("-")[1], "SubCode": str(e).split("-")[0]}, 403
        except Exception as e:
            error_msg = f"TasksActionsSplitAPI POST - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to split task",
                "SubCode": "InternalServerError",
            }, 500
