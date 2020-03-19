import json

import geojson
from flask import current_app

from backend.models.dtos.project_dto import (
    DraftProjectDTO,
    ProjectDTO,
    ProjectCommentsDTO,
    ProjectSearchDTO,
)
from backend.models.postgis.project import Project, Task, ProjectStatus
from backend.models.postgis.statuses import TaskCreationMode, TeamRoles
from backend.models.postgis.task import TaskHistory, TaskStatus, TaskAction
from backend.models.postgis.utils import NotFound, InvalidData, InvalidGeoJson
from backend.services.grid.grid_service import GridService
from backend.services.license_service import LicenseService
from backend.services.users.user_service import UserService
from backend.services.project_search_service import ProjectSearchService
from backend.services.organisation_service import OrganisationService
from backend.services.team_service import TeamService


class ProjectAdminServiceError(Exception):
    """ Custom Exception to notify callers an error occurred when validating a Project """

    def __init__(self, message):
        if current_app:
            current_app.logger.error(message)


class ProjectStoreError(Exception):
    """ Custom Exception to notify callers an error occurred with database CRUD operations """

    def __init__(self, message):
        if current_app:
            current_app.logger.error(message)


class ProjectAdminService:
    @staticmethod
    def create_draft_project(draft_project_dto: DraftProjectDTO) -> int:
        """
        Validates and then persists draft projects in the DB
        :param draft_project_dto: Draft Project DTO with data from API
        :raises InvalidGeoJson
        :returns ID of new draft project
        """
        user_id = draft_project_dto.user_id
        is_admin = UserService.is_user_an_admin(user_id)
        user_orgs = OrganisationService.get_organisations_managed_by_user_as_dto(
            user_id
        )
        is_org_manager = len(user_orgs.organisations) > 0

        # First things first, we need to validate that the author_id is a PM. issue #1715
        if not (is_admin or is_org_manager):
            user = UserService.get_user_by_id(user_id)
            raise (
                ProjectAdminServiceError(
                    f"User {user.username} is not a project manager"
                )
            )

        # If we're cloning we'll copy all the project details from the clone, otherwise create brand new project
        if draft_project_dto.cloneFromProjectId:
            draft_project = Project.clone(draft_project_dto.cloneFromProjectId, user_id)
        else:
            draft_project = Project()
            draft_project.create_draft_project(draft_project_dto)

        draft_project.set_project_aoi(draft_project_dto)

        # if arbitrary_tasks requested, create tasks from aoi otherwise use tasks in DTO
        if draft_project_dto.has_arbitrary_tasks:
            tasks = GridService.tasks_from_aoi_features(
                draft_project_dto.area_of_interest
            )
            draft_project.task_creation_mode = TaskCreationMode.ARBITRARY.value
        else:
            tasks = draft_project_dto.tasks
        ProjectAdminService._attach_tasks_to_project(draft_project, tasks)

        if draft_project_dto.cloneFromProjectId:
            draft_project.save()  # Update the clone
        else:
            draft_project.create()  # Create the new project

        draft_project.set_default_changeset_comment()
        draft_project.set_country_info()
        return draft_project.id

    @staticmethod
    def _set_default_changeset_comment(draft_project: Project):
        """ Sets the default changesset comment when project created """
        default_comment = current_app.config["DEFAULT_CHANGESET_COMMENT"]
        draft_project.changeset_comment = f"{default_comment}-{draft_project.id}"
        draft_project.save()

    @staticmethod
    def _get_project_by_id(project_id: int) -> Project:
        project = Project.get(project_id)

        if project is None:
            raise NotFound()

        return project

    @staticmethod
    def get_project_dto_for_admin(project_id: int) -> ProjectDTO:
        """ Get the project as DTO for project managers """
        project = ProjectAdminService._get_project_by_id(project_id)
        return project.as_dto_for_admin(project_id)

    @staticmethod
    def update_project(project_dto: ProjectDTO, authenticated_user_id: int):
        project_id = project_dto.project_id

        if project_dto.project_status == ProjectStatus.PUBLISHED.name:
            ProjectAdminService._validate_default_locale(
                project_dto.default_locale, project_dto.project_info_locales
            )

        if project_dto.license_id:
            ProjectAdminService._validate_imagery_licence(project_dto.license_id)

        if project_dto.private:
            ProjectAdminService._validate_allowed_users(project_dto)

        if ProjectAdminService.is_user_action_permitted_on_project(
            authenticated_user_id, project_id
        ):
            project = ProjectAdminService._get_project_by_id(project_id)
            project.update(project_dto)
        else:
            raise ValueError("Project can only be updated by admins or by the owner")

        return project

    @staticmethod
    def _validate_imagery_licence(license_id: int):
        """ Ensures that the suppliced license Id actually exists """
        try:
            LicenseService.get_license_as_dto(license_id)
        except NotFound:
            raise ProjectAdminServiceError(f"LicenseId {license_id} not found")

    @staticmethod
    def _validate_allowed_users(project_dto: ProjectDTO):
        """ Ensures that all usernames are known and returns their user ids """
        if len(project_dto.allowed_usernames) == 0:
            raise ProjectAdminServiceError(
                "Must have at least one allowed user on a private project"
            )

        try:
            allowed_users = []
            for username in project_dto.allowed_usernames:
                user = UserService.get_user_by_username(username)
                allowed_users.append(user)

            # Dynamically attach the user object to the DTO for more efficient persistence
            project_dto.allowed_users = allowed_users
        except NotFound:
            raise ProjectAdminServiceError(
                f"allowedUsers contains an unknown username {user}"
            )

    @staticmethod
    def delete_project(project_id: int, authenticated_user_id: int):
        """ Deletes project if it has no completed tasks """

        project = ProjectAdminService._get_project_by_id(project_id)
        is_admin = UserService.is_user_an_admin(authenticated_user_id)
        user_orgs = OrganisationService.get_organisations_managed_by_user_as_dto(
            authenticated_user_id
        )
        is_org_manager = len(user_orgs.organisations) > 0

        if is_admin or is_org_manager:
            if project.can_be_deleted():
                project.delete()
            else:
                raise ProjectAdminServiceError(
                    "Project has mapped tasks, cannot be deleted"
                )
        else:
            raise ProjectAdminServiceError(
                "User does not have permissions to delete project"
            )

    @staticmethod
    def reset_all_tasks(project_id: int, user_id: int):
        """ Resets all tasks on project, preserving history"""
        tasks_to_reset = Task.query.filter(Task.project_id == project_id).all()

        for task in tasks_to_reset:
            task.set_task_history(
                TaskAction.COMMENT, user_id, "Task reset", TaskStatus.READY
            )
            task.reset_task(user_id)

        # Reset project counters
        project = ProjectAdminService._get_project_by_id(project_id)
        project.tasks_mapped = 0
        project.tasks_validated = 0
        project.tasks_bad_imagery = 0
        project.save()

    @staticmethod
    def get_all_comments(project_id: int) -> ProjectCommentsDTO:
        """ Gets all comments mappers, validators have added to tasks associated with project """
        comments = TaskHistory.get_all_comments(project_id)

        if len(comments.comments) == 0:
            raise NotFound("No comments found on project")

        return comments

    @staticmethod
    def _attach_tasks_to_project(draft_project: Project, tasks_geojson):
        """
        Validates then iterates over the array of tasks and attach them to the draft project
        :param draft_project: Draft project in scope
        :param tasks_geojson: GeoJSON feature collection of mapping tasks
        :raises InvalidGeoJson, InvalidData
        """
        tasks = geojson.loads(json.dumps(tasks_geojson))

        if type(tasks) is not geojson.FeatureCollection:
            raise InvalidGeoJson("Tasks: Invalid GeoJson must be FeatureCollection")

        is_valid_geojson = geojson.is_valid(tasks)
        if is_valid_geojson["valid"] == "no":
            raise InvalidGeoJson(
                f"Tasks: Invalid FeatureCollection - {is_valid_geojson['message']}"
            )

        task_count = 1
        for feature in tasks["features"]:
            try:
                task = Task.from_geojson_feature(task_count, feature)
            except (InvalidData, InvalidGeoJson) as e:
                raise e

            draft_project.tasks.append(task)
            task_count += 1

        task_count -= 1  # Remove last increment before falling out loop
        draft_project.total_tasks = task_count

    @staticmethod
    def _validate_default_locale(default_locale, project_info_locales):
        """
        Validates that all fields for the default project info locale have been completed
        :param default_locale: Admin supplied default locale
        :param project_info_locales: All locales supplied by admin
        :raises ProjectAdminServiceError
        :return: True if valid
        """
        default_info = None
        for info in project_info_locales:
            if info.locale.lower() == default_locale.lower():
                default_info = info
                break

        if default_info is None:
            raise ProjectAdminServiceError(
                "Project Info for Default Locale not provided"
            )

        for attr, value in default_info.items():
            if attr == "per_task_instructions":
                continue  # Not mandatory field

            if not value:
                raise (
                    ProjectAdminServiceError(f"{attr} not provided for Default Locale")
                )

        return True  # Indicates valid default locale for unit testing

    @staticmethod
    def get_projects_for_admin(
        admin_id: int, preferred_locale: str, search_dto: ProjectSearchDTO
    ):
        """ Get all projects for provided admin """
        ProjectSearchService.create_search_query()
        return Project.get_projects_for_admin(admin_id, preferred_locale, search_dto)

    @staticmethod
    def transfer_project_to(project_id: int, transfering_user_id: int, username: str):
        """ Transfers project from old owner (transfering_user_id) to new owner (username) """
        project = Project.get(project_id)

        # Check permissions for the user (transferring_user_id) who initiatied the action
        if not ProjectAdminService.is_user_action_permitted_on_project(
            transfering_user_id, project_id
        ):
            raise ValueError("User action not permitted")
        new_owner = UserService.get_user_by_username(username)

        # Check permissions for the new owner - must be an admin or project's org manager or a PM team member
        if not ProjectAdminService.is_user_action_permitted_on_project(
            new_owner.id, project_id
        ):
            raise ValueError("User action not permitted")
        else:
            project.save()

    @staticmethod
    def is_user_action_permitted_on_project(
        authenticated_user_id: int, project_id: int
    ) -> bool:
        """ Is user action permitted on project"""
        project = Project.get(project_id)
        author_id = project.author_id
        allowed_roles = [TeamRoles.PROJECT_MANAGER.value]

        is_admin = UserService.is_user_an_admin(authenticated_user_id)
        is_author = UserService.is_user_the_project_author(
            authenticated_user_id, author_id
        )
        is_org_manager = False
        if hasattr(project, "organisation_id") and project.organisation_id:
            org_id = project.organisation_id
            org = OrganisationService.get_organisation_by_id_as_dto(org_id)
            if org.is_manager:
                is_org_manager = True

        is_team_member = None
        if hasattr(project, "project_teams") and project.project_teams:
            teams_dto = TeamService.get_project_teams_as_dto(project_id)
            if teams_dto.teams:
                teams_allowed = [
                    team_dto
                    for team_dto in teams_dto.teams
                    if team_dto.role in allowed_roles
                ]
                user_membership = [
                    team_dto.team_id
                    for team_dto in teams_allowed
                    if TeamService.is_user_member_of_team(
                        team_dto.team_id, authenticated_user_id
                    )
                ]
                if user_membership:
                    is_team_member = True

        return is_admin or is_author or is_org_manager or is_team_member
