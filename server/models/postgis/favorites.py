from server import db
from server.models.dtos.favorites_dto import FavoriteDTO


class Favorite(db.Model):
    __tablename__ = "project_favorites"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)

    @staticmethod
    def get_from_project(project_id: int, user_id: int):
        return Favorite.query.filter_by(project_id=project_id, user_id=user_id).first()

    @classmethod
    def create_from_dto(cls, dto: FavoriteDTO) -> int:
        """ Creates a new License class from dto """
        new_favorite = cls()
        new_favorite.user_id = dto.user_id
        new_favorite.project_id = dto.project_id

        db.session.add(new_favorite)
        db.session.commit()

        return new_favorite.id

    def as_dto(self) -> FavoriteDTO:
        dto = FavoriteDTO()
        dto.project_id = self.project_id
        dto.user_id = self.user_id

        return dto

    def delete(self):
        """ Deletes the current model from the DB """
        db.session.delete(self)
        db.session.commit()