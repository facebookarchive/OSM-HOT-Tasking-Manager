from cachetools import TTLCache, cached
from flask import current_app
from functools import reduce
import dateutil.parser
import datetime

from server import db
from server.models.dtos.user_dto import UserDTO, UserOSMDTO, UserFilterDTO, UserSearchQuery, UserSearchDTO, \
    UserStatsDTO
from server.models.dtos.message_dto import MessageDTO
from server.models.postgis.message import Message
from server.models.postgis.task import TaskHistory
from server.models.postgis.user import User, UserRole, MappingLevel
from server.models.postgis.utils import NotFound
from server.services.users.osm_service import OSMService, OSMServiceError
from server.services.messaging.smtp_service import SMTPService
from server.services.messaging.template_service import get_template

user_filter_cache = TTLCache(maxsize=1024, ttl=600)
user_all_cache = TTLCache(maxsize=1024, ttl=600)


class UserServiceError(Exception):
    """ Custom Exception to notify callers an error occurred when in the User Service """

    def __init__(self, message):
        if current_app:
            current_app.logger.error(message)


class UserService:
    @staticmethod
    def get_user_by_id(user_id: int) -> User:
        user = User().get_by_id(user_id)

        if user is None:
            raise NotFound()

        return user

    @staticmethod
    def get_user_by_username(username: str) -> User:
        user = User().get_by_username(username)

        if user is None:
            raise NotFound()

        return user

    @staticmethod
    def update_username(user_id: int, osm_username: str) -> User:
        user = UserService.get_user_by_id(user_id)
        if user.username != osm_username:
            user.update_username(osm_username)

        return user

    @staticmethod
    def register_user(osm_id, username, changeset_count):
        """
        Creates user in DB
        :param osm_id: Unique OSM user id
        :param username: OSM Username
        :param changeset_count: OSM changeset count
        """
        new_user = User()
        new_user.id = osm_id
        new_user.username = username

        intermediate_level = current_app.config['MAPPER_LEVEL_INTERMEDIATE']
        advanced_level = current_app.config['MAPPER_LEVEL_ADVANCED']

        if changeset_count > advanced_level:
            new_user.mapping_level = MappingLevel.ADVANCED.value
        elif intermediate_level < changeset_count < advanced_level:
            new_user.mapping_level = MappingLevel.INTERMEDIATE.value
        else:
            new_user.mapping_level = MappingLevel.BEGINNER.value

        new_user.create()
        return new_user

    @staticmethod
    def get_user_dto_by_username(requested_username: str, logged_in_user_id: int) -> UserDTO:
        """Gets user DTO for supplied username """
        requested_user = UserService.get_user_by_username(requested_username)
        logged_in_user = UserService.get_user_by_id(logged_in_user_id)
        UserService.check_and_update_mapper_level(requested_user.id)

        return requested_user.as_dto(logged_in_user.username)

    @staticmethod
    def get_user_dto_by_id(requested_user: int) -> UserDTO:
        """Gets user DTO for supplied user id """
        requested_user = UserService.get_user_by_id(requested_user)

        return requested_user.as_dto(requested_user.username)

    @staticmethod
    def get_detailed_stats(username: str):
        user = UserService.get_user_by_username(username)
        stats_dto = UserStatsDTO()

        actions = TaskHistory.query.filter(
            TaskHistory.user_id == user.id,
            TaskHistory.action_text != ''
        ).all()

        tasks_mapped = TaskHistory.query.filter(
            TaskHistory.user_id == user.id,
            TaskHistory.action_text == 'MAPPED'
        ).count()
        tasks_validated = TaskHistory.query.filter(
            TaskHistory.user_id == user.id,
            TaskHistory.action_text == 'VALIDATED'
        ).count()
        projects_mapped = TaskHistory.query.filter(
            TaskHistory.user_id == user.id,
            TaskHistory.action == 'STATE_CHANGE'
        ).distinct(TaskHistory.project_id).count()

        stats_dto.tasks_mapped = tasks_mapped
        stats_dto.tasks_validated = tasks_validated
        stats_dto.projects_mapped = projects_mapped
        stats_dto.total_time_spent = 0
        stats_dto.time_spent_mapping = 0
        stats_dto.time_spent_validating = 0

        sql = """SELECT SUM(TO_TIMESTAMP(action_text, 'HH24:MI:SS')::TIME) FROM task_history
                WHERE action='LOCKED_FOR_VALIDATION'
                and user_id = {0};""".format(user.id)
        total_validation_time = db.engine.execute(sql)
        for time in total_validation_time:
            total_validation_time = time[0]
            if total_validation_time:
                stats_dto.time_spent_validating = total_validation_time.total_seconds()
                stats_dto.total_time_spent += stats_dto.time_spent_validating

        sql = """SELECT SUM(TO_TIMESTAMP(action_text, 'HH24:MI:SS')::TIME) FROM task_history
                WHERE action='LOCKED_FOR_MAPPING'
                and user_id = {0};""".format(user.id)
        total_mapping_time = db.engine.execute(sql)
        for time in total_mapping_time:
            total_mapping_time = time[0]
            if total_mapping_time:
                stats_dto.time_spent_mapping = total_mapping_time.total_seconds()
                stats_dto.total_time_spent += stats_dto.time_spent_mapping

        return stats_dto


    @staticmethod
    def update_user_details(user_id: int, user_dto: UserDTO) -> dict:
        """ Update user with info supplied by user, if they add or change their email address a verification mail
            will be sent """
        user = UserService.get_user_by_id(user_id)

        verification_email_sent = False
        if user_dto.email_address and user.email_address != user_dto.email_address.lower():
            # Send user verification email if they are adding or changing their email address
            SMTPService.send_verification_email(user_dto.email_address.lower(), user.username)
            user.set_email_verified_status(is_verified=False)
            verification_email_sent = True

        user.update(user_dto)
        return dict(verificationEmailSent=verification_email_sent)

    @staticmethod
    @cached(user_all_cache)
    def get_all_users(query: UserSearchQuery) -> UserSearchDTO:
        """ Gets paginated list of users """
        return User.get_all_users(query)

    @staticmethod
    @cached(user_filter_cache)
    def filter_users(username: str, project_id: int, 
                     page: int, is_project_manager: bool = False) -> UserFilterDTO:
        """ Gets paginated list of users, filtered by username, for autocomplete """
        return User.filter_users(username, project_id, page, is_project_manager)

    @staticmethod
    def is_user_a_project_manager(user_id: int) -> bool:
        """ Is the user a project manager """
        user = UserService.get_user_by_id(user_id)
        if UserRole(user.role) in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            return True

        return False

    @staticmethod
    def get_mapping_level(user_id: int):
        """ Gets mapping level user is at"""
        user = UserService.get_user_by_id(user_id)

        return MappingLevel(user.mapping_level)

    @staticmethod
    def is_user_validator(user_id: int) -> bool:
        """ Determines if user is a validator """
        user = UserService.get_user_by_id(user_id)

        if UserRole(user.role) in [UserRole.VALIDATOR, UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            return True

        return False

    @staticmethod
    def is_user_blocked(user_id: int) -> bool:
        """ Determines if a user is blocked """
        user = UserService.get_user_by_id(user_id)

        if UserRole(user.role) == UserRole.READ_ONLY:
            return True

        return False

    @staticmethod
    def upsert_mapped_projects(user_id: int, project_id: int):
        """ Add project to mapped projects if it doesn't exist, otherwise return """
        User.upsert_mapped_projects(user_id, project_id)

    @staticmethod
    def get_mapped_projects(user_name: str, preferred_locale: str):
        """ Gets all projects a user has mapped or validated on """
        user = UserService.get_user_by_username(user_name)
        return User.get_mapped_projects(user.id, preferred_locale)

    @staticmethod
    def add_role_to_user(admin_user_id: int, username: str, role: str):
        """
        Add role to user
        :param admin_user_id: ID of admin attempting to add the role
        :param username: Username of user the role should be added to
        :param role: The requested role
        :raises UserServiceError
        """
        try:
            requested_role = UserRole[role.upper()]
        except KeyError:
            raise UserServiceError(f'Unknown role {role} accepted values are ADMIN, PROJECT_MANAGER, VALIDATOR')

        admin = UserService.get_user_by_id(admin_user_id)
        admin_role = UserRole(admin.role)

        if admin_role == UserRole.PROJECT_MANAGER and requested_role == UserRole.ADMIN:
            raise UserServiceError(f'You must be an Admin to assign Admin role')

        if admin_role == UserRole.PROJECT_MANAGER and requested_role == UserRole.PROJECT_MANAGER:
            raise UserServiceError(f'You must be an Admin to assign Project Manager role')

        user = UserService.get_user_by_username(username)
        user.set_user_role(requested_role)

    @staticmethod
    def set_user_mapping_level(username: str, level: str) -> User:
        """
        Sets the users mapping level
        :raises: UserServiceError
        """
        try:
            requested_level = MappingLevel[level.upper()]
        except KeyError:
            raise UserServiceError(f'Unknown role {level} accepted values are BEGINNER, INTERMEDIATE, ADVANCED')

        user = UserService.get_user_by_username(username)
        user.set_mapping_level(requested_level)

        return user

    @staticmethod
    def set_user_is_expert(user_id: int, is_expert: bool) -> User:
        """
        Enabled or disables expert mode for the user
        :raises: UserServiceError
        """
        user = UserService.get_user_by_id(user_id)
        user.set_is_expert(is_expert)

        return user

    @staticmethod
    def accept_license_terms(user_id: int, license_id: int):
        """ Saves the fact user has accepted license terms """
        user = UserService.get_user_by_id(user_id)
        user.accept_license_terms(license_id)

    @staticmethod
    def has_user_accepted_license(user_id: int, license_id: int):
        """ Checks if user has accepted specified license """
        user = UserService.get_user_by_id(user_id)
        return user.has_user_accepted_licence(license_id)

    @staticmethod
    def get_osm_details_for_user(username: str) -> UserOSMDTO:
        """
        Gets OSM details for the user from OSM API
        :param username: username in scope
        :raises UserServiceError, NotFound
        """
        user = UserService.get_user_by_username(username)
        osm_dto = OSMService.get_osm_details_for_user(user.id)
        return osm_dto

    @staticmethod
    def check_and_update_mapper_level(user_id: int):
        """ Check users mapping level and update if they have crossed threshold """
        user = UserService.get_user_by_id(user_id)
        user_level = MappingLevel(user.mapping_level)

        if user_level == MappingLevel.ADVANCED:
            return  # User has achieved highest level, so no need to do further checking

        intermediate_level = current_app.config['MAPPER_LEVEL_INTERMEDIATE']
        advanced_level = current_app.config['MAPPER_LEVEL_ADVANCED']

        try:
            osm_details = OSMService.get_osm_details_for_user(user_id)
            if (osm_details.changeset_count > advanced_level and
                user.mapping_level !=  MappingLevel.ADVANCED.value):
                user.mapping_level = MappingLevel.ADVANCED.value
                UserService.notify_level_upgrade(user_id, user.username, 'ADVANCED')
            elif (intermediate_level < osm_details.changeset_count < advanced_level and
                user.mapping_level != MappingLevel.INTERMEDIATE.value):
                user.mapping_level = MappingLevel.INTERMEDIATE.value
                UserService.notify_level_upgrade(user_id, user.username, 'INTERMEDIATE')
        except OSMServiceError:
            # Swallow exception as we don't want to blow up the server for this
            current_app.logger.error('Error attempting to update mapper level')
            return


        user.save()
        return user

    def notify_level_upgrade(user_id: int, username: str, level: str):
        text_template = get_template('level_upgrade_message_en.txt')

        if username is not None:
            text_template = text_template.replace('[USERNAME]', username)

        text_template = text_template.replace('[LEVEL]', level)
        level_upgrade_message = Message()
        level_upgrade_message.to_user_id = user_id
        level_upgrade_message.subject = 'Mapper Level Upgrade '
        level_upgrade_message.message = text_template
        level_upgrade_message.save()


    @staticmethod
    def refresh_mapper_level() -> int:
        """ Helper function to run thru all users in the DB and update their mapper level """
        users = User.get_all_users_not_pagainated()
        users_updated = 1
        total_users = len(users)

        for user in users:
            UserService.check_and_update_mapper_level(user.id)

            if users_updated % 50 == 0:
                print(f'{users_updated} users updated of {total_users}')

            users_updated += 1

        return users_updated
