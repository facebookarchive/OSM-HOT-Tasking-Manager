from schematics import Model
from schematics.types import IntType

class FavoriteDTO(Model):
    """ DTO used to define project favorite by user """
    project_id = IntType(required=True)
    user_id = IntType(required=True)
