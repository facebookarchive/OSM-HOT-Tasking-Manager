from flask_restful import Resource, current_app, request
from server.services.stats_service import StatsService, NotFound
from server.services.project_service import ProjectService
from server.services.users.user_service import UserService


class StatsContributionsAPI(Resource):
    def get(self, project_id):
        """
        Get all user contributions on a project
        ---
        tags:
          - stats
        produces:
          - application/json
        parameters:
            - name: project_id
              in: path
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: User contributions
            404:
                description: No contributions
            500:
                description: Internal Server Error
        """
        try:
            contributions = StatsService.get_user_contributions(project_id)
            return contributions.to_primitive(), 200
        except NotFound:
            return {"Error": "No contributions on project"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class StatsContributionsByDayAPI(Resource):
    def get(self, project_id):
        """
        Get contributions by day of a project
        ---
        tags:
          - stats
        produces:
          - application/json
        parameters:
            - name: project_id
              in: path
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Project contributions by day
            404:
                description: Not found
            500:
                description: Internal Server Error
        """
        try:
            contribs = ProjectService.get_contribs_by_day(project_id)
            return contribs.to_primitive(), 200
        except NotFound:
            return {"Error": "Project not found"}, 404
        except Exception as e:
            error_msg = f"Project contributions GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class StatsActivityAPI(Resource):
    def get(self, project_id):
        """
        Get user actvity on a project
        ---
        tags:
          - stats
        produces:
          - application/json
        parameters:
            - name: project_id
              in: path
              required: true
              type: integer
              default: 1
            - in: query
              name: page
              description: Page of results user requested
              type: integer
        responses:
            200:
                description: Project activity
            404:
                description: No activity
            500:
                description: Internal Server Error
        """
        try:
            page = int(request.args.get("page")) if request.args.get("page") else 1
            activity = StatsService.get_latest_activity(project_id, page)
            return activity.to_primitive(), 200
        except NotFound:
            return {"Error": "No activity on project"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class StatsProjectAPI(Resource):
    def get(self, project_id):
        """
        Get Project Stats
        ---
        tags:
          - stats
        produces:
          - application/json
        parameters:
            - in: header
              name: Accept-Language
              description: Language user is requesting
              type: string
              required: true
              default: en
            - name: project_id
              in: path
              required: true
              type: integer
              default: 1
        responses:
            200:
                description: Project stats
            404:
                description: Not found
            500:
                description: Internal Server Error
        """
        try:
            # preferred_locale = request.environ.get("HTTP_ACCEPT_LANGUAGE")
            summary = ProjectService.get_project_stats(project_id)
            return summary.to_primitive(), 200
        except NotFound:
            return {"Error": "Project not found"}, 404
        except Exception as e:
            error_msg = f"Project Summary GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class HomePageStatsAPI(Resource):
    def get(self):
        """
        Get HomePage Stats
        ---
        tags:
          - stats
        produces:
          - application/json
        responses:
            200:
                description: Project stats
            500:
                description: Internal Server Error
        """
        try:
            stats = StatsService.get_homepage_stats()
            return stats.to_primitive(), 200
        except Exception as e:
            error_msg = f"Unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class StatsUserAPI(Resource):
    def get(self, username):
        """
        Get detailed stats about user
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - name: username
              in: path
              description: The users username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: User found
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            stats_dto = UserService.get_detailed_stats(username)
            return stats_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500


class StatsProjectUserAPI(Resource):
    def get(self, project_id, username):
        """
        Get detailed stats about user
        ---
        tags:
          - user
        produces:
          - application/json
        parameters:
            - name: project_id
              in: path
              required: true
              type: integer
              default: 1
            - name: username
              in: path
              description: The users username
              required: true
              type: string
              default: Thinkwhere
        responses:
            200:
                description: User found
            404:
                description: User not found
            500:
                description: Internal Server Error
        """
        try:
            stats_dto = ProjectService.get_project_user_stats(project_id, username)
            return stats_dto.to_primitive(), 200
        except NotFound:
            return {"Error": "User not found"}, 404
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {"error": error_msg}, 500
