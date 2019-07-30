from schematics import Model
from schematics.exceptions import ValidationError
from schematics.types import StringType, IntType, DateTimeType, BooleanType
from schematics.types.compound import ListType, ModelType
from server.models.postgis.statuses import TaskStatus
from server.models.dtos.stats_dto import Pagination


def is_valid_validated_status(value):
    """ Validates that Task Status is in correct range for after validation """
    valid_values = f"{TaskStatus.MAPPED.name}, {TaskStatus.INVALIDATED.name}, {TaskStatus.VALIDATED.name}"

    try:
        validated_status = TaskStatus[value.upper()]
    except KeyError:
        raise ValidationError(f"Unknown task status. Valid values are {valid_values}")

    if validated_status not in [
        TaskStatus.MAPPED,
        TaskStatus.INVALIDATED,
        TaskStatus.VALIDATED,
    ]:
        raise ValidationError(f"Invalid status.  Valid values are {valid_values}")


class LockForValidationDTO(Model):
    """ DTO used to lock multiple tasks for validation """

    project_id = IntType(required=True)
    task_ids = ListType(IntType, required=True, serialized_name="taskIds")
    user_id = IntType(required=True)
    preferred_locale = StringType(default="en")


class ValidationMappingIssue(Model):
    """ Describes one or more occurences of an identified mapping problem during validation """

    mapping_issue_category_id = IntType(
        required=True, serialized_name="mappingIssueCategoryId"
    )
    issue = StringType(required=True)
    count = IntType(required=True)


class ValidatedTask(Model):
    """ Describes the model used to update the status of one task after validation """

    task_id = IntType(required=True, serialized_name="taskId")
    status = StringType(required=True, validators=[is_valid_validated_status])
    comment = StringType()
    issues = ListType(
        ModelType(ValidationMappingIssue), serialized_name="validationIssues"
    )


class ResetValidatingTask(Model):
    """ Describes the model used to stop validating and reset the status of one task """

    task_id = IntType(required=True, serialized_name="taskId")
    comment = StringType()
    issues = ListType(
        ModelType(ValidationMappingIssue), serialized_name="validationIssues"
    )


class UnlockAfterValidationDTO(Model):
    """ DTO used to transmit the status of multiple tasks after validation """

    project_id = IntType(required=True)
    validated_tasks = ListType(
        ModelType(ValidatedTask), required=True, serialized_name="validatedTasks"
    )
    user_id = IntType(required=True)
    preferred_locale = StringType(default="en")


class StopValidationDTO(Model):
    """ DTO used to transmit the the request to stop validating multiple tasks """

    project_id = IntType(required=True)
    reset_tasks = ListType(
        ModelType(ResetValidatingTask), required=True, serialized_name="resetTasks"
    )
    user_id = IntType(required=True)
    preferred_locale = StringType(default="en")


class MappedTasksByUser(Model):
    """ Describes number of tasks user has mapped on a project"""

    username = StringType(required=True)
    mapped_task_count = IntType(required=True, serialized_name="mappedTaskCount")
    tasks_mapped = ListType(IntType, required=True, serialized_name="tasksMapped")
    last_seen = DateTimeType(required=True, serialized_name="lastSeen")
    mapping_level = StringType(required=True, serialized_name="mappingLevel")
    date_registered = DateTimeType(serialized_name="dateRegistered")
    last_validation_date = DateTimeType(serialized_name="lastValidationDate")


class InvalidatedTask(Model):
    """ Describes invalidated tasks with which user is involved """

    task_id = IntType(required=True, serialized_name="taskId")
    project_id = IntType(required=True, serialized_name="projectId")
    project_name = StringType(serialized_name="projectName")
    history_id = IntType(serialized_name="historyId")
    closed = BooleanType()
    updated_date = DateTimeType(serialized_name="updatedDate")


class InvalidatedTasks(Model):
    def __init__(self):
        """ DTO constructor initialise all arrays to empty"""
        super().__init__()
        self.invalidated_tasks = []

    invalidated_tasks = ListType(
        ModelType(InvalidatedTask), serialized_name="invalidatedTasks"
    )
    pagination = ModelType(Pagination)


class MappedTasks(Model):
    """ Describes all tasks currently mapped on a project """

    def __init__(self):
        """ DTO constructor initialise all arrays to empty"""
        super().__init__()
        self.mapped_tasks = []

    mapped_tasks = ListType(ModelType(MappedTasksByUser), serialized_name="mappedTasks")
