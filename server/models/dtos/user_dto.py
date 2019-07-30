from schematics import Model
from schematics.exceptions import ValidationError
from schematics.types import StringType, IntType, EmailType, LongType, BooleanType

from schematics.types.compound import ListType, ModelType, BaseType
from server.models.dtos.stats_dto import Pagination
from server.models.postgis.statuses import MappingLevel, UserRole


def is_known_mapping_level(value):
    """ Validates that supplied mapping level is known value """
    if value.upper() == "ALL":
        return True

    try:
        MappingLevel[value.upper()]
    except KeyError:
        raise ValidationError(
            f"Unknown mappingLevel: {value} Valid values are {MappingLevel.BEGINNER.name}, "
            f"{MappingLevel.INTERMEDIATE.name}, {MappingLevel.ADVANCED.name}, ALL"
        )


def is_known_role(value):
    """ Validates that supplied user role is known value """
    try:
        UserRole[value.upper()]
    except KeyError:
        raise ValidationError(
            f"Unknown mappingLevel: {value} Valid values are {UserRole.ADMIN.name}, "
            f"{UserRole.PROJECT_MANAGER.name}, {UserRole.MAPPER.name}, {UserRole.VALIDATOR.name}"
        )


class UserDTO(Model):
    """ DTO for User """

    validation_message = BooleanType(default=True)
    id = LongType()
    username = StringType()
    role = StringType()
    mapping_level = StringType(
        serialized_name="mappingLevel", validators=[is_known_mapping_level]
    )
    date_registered = StringType(serialized_name="dateRegistered")
    total_time_spent = IntType(serialized_name="totalTimeSpent")
    time_spent_mapping = IntType(serialized_name="timeSpentMapping")
    time_spent_validating = IntType(serialized_name="timeSpentValidating")
    projects_mapped = IntType(serialized_name="projectsMapped")
    tasks_mapped = IntType(serialized_name="tasksMapped")
    tasks_validated = IntType(serialized_name="tasksValidated")
    tasks_invalidated = IntType(serialized_name="tasksInvalidated")
    email_address = EmailType(serialized_name="emailAddress", serialize_when_none=False)
    is_email_verified = EmailType(
        serialized_name="isEmailVerified", serialize_when_none=False
    )
    is_expert = BooleanType(serialized_name="isExpert", serialize_when_none=False)
    twitter_id = StringType(serialized_name="twitterId")
    facebook_id = StringType(serialized_name="facebookId")
    linkedin_id = StringType(serialized_name="linkedinId")


class UserStatsDTO(Model):
    """ DTO containing statistics about the user """

    total_time_spent = IntType(serialized_name="totalTimeSpent")
    time_spent_mapping = IntType(serialized_name="timeSpentMapping")
    time_spent_validating = IntType(serialized_name="timeSpentValidating")
    projects_mapped = IntType(serialized_name="projectsMapped")
    tasks_mapped = IntType(serialized_name="tasksMapped")
    tasks_validated = IntType(serialized_name="tasksValidated")


class UserOSMDTO(Model):
    """ DTO containing OSM details for the user """

    account_created = StringType(required=True, serialized_name="accountCreated")
    changeset_count = IntType(required=True, serialized_name="changesetCount")


class MappedProject(Model):
    """ Describes a single project a user has mapped """

    project_id = IntType(serialized_name="projectId")
    name = StringType()
    tasks_mapped = IntType(serialized_name="tasksMapped")
    tasks_validated = IntType(serialized_name="tasksValidated")
    status = StringType()
    centroid = BaseType()


class UserMappedProjectsDTO(Model):
    """ DTO for projects a user has mapped """

    def __init__(self):
        super().__init__()
        self.mapped_projects = []

    mapped_projects = ListType(
        ModelType(MappedProject), serialized_name="mappedProjects"
    )


class UserSearchQuery(Model):
    """ Describes a user search query, that a user may submit to filter the list of users """

    username = StringType()
    role = StringType(validators=[is_known_role])
    mapping_level = StringType(
        serialized_name="mappingLevel", validators=[is_known_mapping_level]
    )
    page = IntType()

    def __hash__(self):
        """ Make object hashable so we can cache user searches"""
        return hash((self.username, self.role, self.mapping_level, self.page))


class ListedUser(Model):
    """ Describes a user within the User List """

    id = LongType()
    username = StringType()
    role = StringType()
    mapping_level = StringType(serialized_name="mappingLevel")


class ProjectParticipantUser(Model):
    """ Describes a user who has participated in a project """

    username = StringType()
    project_id = LongType(serialized_name="projectId")
    is_participant = BooleanType(serialized_name="isParticipant")


class UserSearchDTO(Model):
    """ Paginated list of TM users """

    def __init__(self):
        super().__init__()
        self.users = []

    pagination = ModelType(Pagination)
    users = ListType(ModelType(ListedUser))


class UserFilterDTO(Model):
    """ DTO to hold all Tasking Manager users """

    def __init__(self):
        super().__init__()
        self.usernames = []
        self.users = []

    pagination = ModelType(Pagination)
    usernames = ListType(StringType)
    users = ListType(ModelType(ProjectParticipantUser))
