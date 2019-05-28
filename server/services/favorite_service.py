from server.models.dtos.favorites_dto import FavoriteDTO
from server.models.postgis.favorites import Favorite
from server.models.postgis.utils import NotFound


class FavoriteService:
    @staticmethod
    def create_favorite(favorite_dto: FavoriteDTO) -> int:
        """ Create project favorite in DB """
        new_favorite_id = Favorite.create_from_dto(favorite_dto)
        return new_favorite_id

    @staticmethod
    def delete_favorite(project_id: int, user_id: int):
        """ Deletes project favorite from DB """
        fav = FavoriteService.get_from_project(project_id, user_id)
        if fav is None:
            raise NotFound()
        fav.delete()

    @staticmethod
    def get_from_project(project_id: int, user_id: int) -> Favorite:
        return Favorite.get_from_project(project_id, user_id)

    @staticmethod
    def get_favorite_as_dto(project_id: int, user_id: int) -> FavoriteDTO:
        """ Deletes project favorite from DB """
        fav = FavoriteService.get_from_project(project_id, user_id)
        if fav is None:
            raise NotFound()
        return fav.as_dto()

