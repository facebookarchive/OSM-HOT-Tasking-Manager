from schematics import Model
from schematics.exceptions import ValidationError
from schematics.types import (
    StringType,
    BaseType,
    IntType,
    BooleanType,
    FloatType,
    UTCDateTimeType,
    DateType,
)
from schematics.types.compound import ListType, ModelType


class OsmDTO(Model):
    """
    OSM details to add in database
    """
    project_id = IntType(required=True)

class AddOsmDTO(Model):
    '''
    OSM details to store data from OSMCha
    '''
    project_id = IntType(required=True)
    task_id = IntType(required=True)
    reasons = ListType(StringType,required=True, serialized_name="Reasons")
    no_of_flags = IntType(required=True)
    changeset_id = ListType(StringType,required=True, serialized_name='changeset_id')
    taskhistory_id = IntType(required=True)