import logging
import os
from logging.handlers import RotatingFileHandler

from flask import Flask, render_template, current_app
from flask_cors import CORS
from flask_migrate import Migrate
from flask_oauthlib.client import OAuth
from flask_restful import Api
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
oauth = OAuth()

osm = oauth.remote_app("osm", app_key="OSM_OAUTH_SETTINGS")

# Import all models so that they are registered with SQLAlchemy
from server.models.postgis import *  # noqa


def create_app(env=None):
    """
    Bootstrap function to initialise the Flask app and config
    :return: Initialised Flask app
    """

    app = Flask(
        __name__,
        static_folder="../frontend/build/static",
        template_folder="../frontend/build",
    )

    # Load configuration options from environment
    app.config.from_object(f"server.config.EnvironmentConfig")

    # Enable logging to files
    initialise_logger(app)
    app.logger.info(f"Starting up a new Tasking Manager application")

    # Connect to database
    app.logger.debug(f"Connecting to the databse")
    db.init_app(app)
    migrate.init_app(app, db)

    app.logger.debug(f"Initialising frontend routes")

    # Main route to frontend
    @app.route("/")
    def index():
        return render_template("index.html")

    # Route to Swagger UI
    @app.route("/api-docs/")
    def api():
        api_url = current_app.config["API_DOCS_URL"]
        return render_template("swagger.html", doc_link=api_url)

    # Add paths to API endpoints
    add_api_endpoints(app)

    # Enables CORS on all API routes, meaning API is callable from anywhere
    CORS(app)

    # Add basic oauth setup
    app.secret_key = app.config[
        "SECRET_KEY"
    ]  # Required by itsdangeroud, Flask-OAuthlib for creating entropy
    oauth.init_app(app)

    return app


def initialise_logger(app):
    """
    Read environment config then initialise a 2MB rotating log.  Prod Log Level can be reduced to help diagnose Prod
    only issues.
    """
    log_dir = app.config["LOG_DIR"]
    log_level = app.config["LOG_LEVEL"]
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    file_handler = RotatingFileHandler(
        log_dir + "/tasking-manager.log", "a", 2 * 1024 * 1024, 3
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
        )
    )
    app.logger.addHandler(file_handler)
    app.logger.setLevel(log_level)


def initialise_counters(app):
    """ Initialise homepage counters so that users don't see 0 users on first load of application"""
    from server.services.stats_service import StatsService

    with app.app_context():
        StatsService.get_homepage_stats()


def add_api_endpoints(app):
    """
    Define the routes the API exposes using Flask-Restful.  See docs here
    http://flask-restful-cn.readthedocs.org/en/0.3.5/quickstart.html#endpoints
    """
    app.logger.debug("Adding routes to API endpoints")
    api = Api(app)

    from server.api.application_apis import ApplicationAPI
    from server.api.users.authentication_apis import LoginAPI, OAuthAPI, AuthEmailAPI
    from server.api.health_check_api import HealthCheckAPI
    from server.api.license_apis import LicenseAPI, LicenceListAPI
    from server.api.mapping_apis import (
        MappingTaskAPI,
        LockTaskForMappingAPI,
        UnlockTaskForMappingAPI,
        StopMappingAPI,
        CommentOnTaskAPI,
        TasksAsJson,
        TasksAsGPX,
        TasksAsOSM,
        UndoMappingAPI,
    )
    from server.api.messaging.message_apis import (
        ProjectsMessageAll,
        HasNewMessages,
        GetAllMessages,
        MessagesAPI,
        DeleteMultipleMessages,
        ResendEmailValidationAPI,
    )
    from server.api.messaging.project_chat_apis import ProjectChatAPI
    from server.api.project_admin_api import (
        ProjectAdminAPI,
        ProjectCommentsAPI,
        ProjectInvalidateAll,
        ProjectValidateAll,
        ProjectMapAll,
        ProjectResetAll,
        ProjectResetBadImagery,
        ProjectsForAdminAPI,
        ProjectTransfer,
    )
    from server.api.project_apis import (
        ProjectAPI,
        ProjectAOIAPI,
        ProjectSearchAPI,
        HasUserTaskOnProject,
        HasUserTaskOnProjectDetails,
        ProjectSearchBBoxAPI,
        ProjectSummaryAPI,
        TaskAnnotationsAPI,
    )
    from server.api.swagger_docs_api import SwaggerDocsAPI
    from server.api.stats_api import (
        StatsContributionsAPI,
        StatsActivityAPI,
        StatsProjectAPI,
        HomePageStatsAPI,
        StatsUserAPI,
        StatsProjectUserAPI,
        StatsContributionsByDayAPI,
    )
    from server.api.tags_apis import CampaignsTagsAPI, OrganisationTagsAPI
    from server.api.mapping_issues_apis import (
        MappingIssueCategoryAPI,
        MappingIssueCategoriesAPI,
    )
    from server.api.users.user_apis import (
        UserAPI,
        UserIdAPI,
        UserOSMAPI,
        UserMappedProjects,
        UserSetRole,
        UserSetLevel,
        UserSetExpertMode,
        UserAcceptLicense,
        UserSearchFilterAPI,
        UserSearchAllAPI,
        UserUpdateAPI,
        UserContributionsAPI,
    )
    from server.api.validator_apis import (
        LockTasksForValidationAPI,
        UnlockTasksAfterValidationAPI,
        StopValidatingAPI,
        MappedTasksByUser,
        UserInvalidatedTasks,
    )
    from server.api.grid.grid_apis import IntersectingTilesAPI
    from server.api.grid.split_task_apis import SplitTaskAPI
    from server.api.settings_apis import LanguagesAPI

    api.add_resource(SwaggerDocsAPI, "/api/docs")
    api.add_resource(HealthCheckAPI, "/api/health-check")
    api.add_resource(
        ProjectAdminAPI,
        "/api/v1/admin/project",
        endpoint="create_project",
        methods=["PUT"],
    )
    api.add_resource(
        ProjectAdminAPI,
        "/api/v1/admin/project/<int:project_id>",
        methods=["GET", "POST", "DELETE"],
    )
    api.add_resource(
        ProjectCommentsAPI, "/api/v1/admin/project/<int:project_id>/comments"
    )
    api.add_resource(
        ProjectInvalidateAll, "/api/v1/admin/project/<int:project_id>/invalidate-all"
    )
    api.add_resource(
        ProjectValidateAll, "/api/v1/admin/project/<int:project_id>/validate-all"
    )
    api.add_resource(ProjectMapAll, "/api/v1/admin/project/<int:project_id>/map-all")
    api.add_resource(
        ProjectResetBadImagery,
        "/api/v1/admin/project/<int:project_id>/reset-all-badimagery",
    )
    api.add_resource(
        ProjectResetAll, "/api/v1/admin/project/<int:project_id>/reset-all"
    )
    api.add_resource(
        ProjectsMessageAll, "/api/v1/admin/project/<int:project_id>/message-all"
    )
    api.add_resource(ProjectTransfer, "/api/v1/admin/project/<int:project_id>/transfer")
    api.add_resource(ProjectsForAdminAPI, "/api/v1/admin/my-projects")
    api.add_resource(ApplicationAPI, "/api/v1/application", methods=["POST", "GET"])
    api.add_resource(
        ApplicationAPI,
        "/api/v1/application/<string:application_key>",
        endpoint="delete_application",
        methods=["DELETE"],
    )
    api.add_resource(
        ApplicationAPI,
        "/api/v1/application/<string:application_key>",
        endpoint="check_application",
        methods=["PUT"],
    )
    api.add_resource(LoginAPI, "/api/v1/auth/login")
    api.add_resource(OAuthAPI, "/api/v1/auth/oauth-callback")
    api.add_resource(AuthEmailAPI, "/api/auth/email")
    api.add_resource(
        LicenseAPI, "/api/v1/license", endpoint="create_license", methods=["PUT"]
    )
    api.add_resource(
        LicenseAPI,
        "/api/v1/license/<int:license_id>",
        methods=["GET", "POST", "DELETE"],
    )
    api.add_resource(LicenceListAPI, "/api/v1/license/list")
    api.add_resource(HasNewMessages, "/api/v1/messages/has-new-messages")
    api.add_resource(GetAllMessages, "/api/v1/messages/get-all-messages")
    api.add_resource(MessagesAPI, "/api/v1/messages/<int:message_id>")
    api.add_resource(
        DeleteMultipleMessages, "/api/v1/messages/delete-multiple", methods=["DELETE"]
    )
    api.add_resource(
        ResendEmailValidationAPI, "/api/v1/messages/resend-email-verification"
    )
    api.add_resource(ProjectSearchAPI, "/api/v1/project/search")
    api.add_resource(ProjectSearchBBoxAPI, "/api/v1/projects/within-bounding-box")
    api.add_resource(ProjectAPI, "/api/v1/project/<int:project_id>")
    api.add_resource(ProjectAOIAPI, "/api/v1/project/<int:project_id>/aoi")
    api.add_resource(ProjectChatAPI, "/api/v1/project/<int:project_id>/chat")
    api.add_resource(
        HasUserTaskOnProject, "/api/v1/project/<int:project_id>/has-user-locked-tasks"
    )
    api.add_resource(
        HasUserTaskOnProjectDetails,
        "/api/v1/project/<int:project_id>/has-user-locked-tasks/details",
    )
    api.add_resource(
        MappedTasksByUser, "/api/v1/project/<int:project_id>/mapped-tasks-by-user"
    )
    api.add_resource(ProjectSummaryAPI, "/api/v1/project/<int:project_id>/summary")
    api.add_resource(TasksAsJson, "/api/v1/project/<int:project_id>/tasks")
    api.add_resource(TasksAsGPX, "/api/v1/project/<int:project_id>/tasks_as_gpx")
    api.add_resource(TasksAsOSM, "/api/v1/project/<int:project_id>/tasks-as-osm-xml")
    api.add_resource(
        LockTaskForMappingAPI,
        "/api/v1/project/<int:project_id>/task/<int:task_id>/lock-for-mapping",
    )
    api.add_resource(
        UndoMappingAPI,
        "/api/v1/project/<int:project_id>/task/<int:task_id>/undo-mapping",
    )
    api.add_resource(
        MappingTaskAPI, "/api/v1/project/<int:project_id>/task/<int:task_id>"
    )
    api.add_resource(
        UnlockTaskForMappingAPI,
        "/api/v1/project/<int:project_id>/task/<int:task_id>/unlock-after-mapping",
    )
    api.add_resource(
        StopMappingAPI,
        "/api/v1/project/<int:project_id>/task/<int:task_id>/stop-mapping",
    )
    api.add_resource(
        CommentOnTaskAPI, "/api/v1/project/<int:project_id>/task/<int:task_id>/comment"
    )
    api.add_resource(
        LockTasksForValidationAPI,
        "/api/v1/project/<int:project_id>/lock-for-validation",
    )
    api.add_resource(
        UnlockTasksAfterValidationAPI,
        "/api/v1/project/<int:project_id>/unlock-after-validation",
    )
    api.add_resource(
        StopValidatingAPI, "/api/v1/project/<int:project_id>/stop-validating"
    )
    api.add_resource(
        StatsContributionsAPI, "/api/v1/stats/project/<int:project_id>/contributions"
    )
    api.add_resource(
        StatsContributionsByDayAPI,
        "/api/v1/stats/project/<int:project_id>/contributions/day",
    )
    api.add_resource(
        TaskAnnotationsAPI,
        "/api/v1/project/<int:project_id>/task-annotations/<string:annotation_type>",
        "/api/v1/project/<int:project_id>/task-annotations",
        methods=["GET", "POST"],
    )
    api.add_resource(
        StatsActivityAPI, "/api/v1/stats/project/<int:project_id>/activity"
    )
    api.add_resource(StatsProjectAPI, "/api/v1/stats/project/<int:project_id>")
    api.add_resource(
        StatsProjectUserAPI,
        "/api/v1/stats/project/<int:project_id>/user/<string:username>",
    )
    api.add_resource(StatsUserAPI, "/api/v1/stats/user/<string:username>")
    api.add_resource(HomePageStatsAPI, "/api/v1/stats/summary")
    api.add_resource(CampaignsTagsAPI, "/api/v1/tags/campaigns")
    api.add_resource(OrganisationTagsAPI, "/api/v1/tags/organisations")
    api.add_resource(
        MappingIssueCategoryAPI,
        "/api/v1/mapping-issue-category",
        endpoint="create_mapping_issue_category",
        methods=["POST"],
    )
    api.add_resource(
        MappingIssueCategoryAPI,
        "/api/v1/mapping-issue-category/<int:category_id>",
        methods=["GET", "PUT", "DELETE"],
    )
    api.add_resource(MappingIssueCategoriesAPI, "/api/v1/mapping-issue-categories")
    api.add_resource(UserSearchAllAPI, "/api/v1/user/search-all")
    api.add_resource(
        UserSearchFilterAPI, "/api/v1/user/search/filter/<string:username>"
    )
    api.add_resource(UserAPI, "/api/v1/user/<string:username>")
    api.add_resource(UserUpdateAPI, "/api/v1/user/update-details")
    api.add_resource(
        UserSetExpertMode, "/api/v1/user/set-expert-mode/<string:is_expert>"
    )
    api.add_resource(
        UserMappedProjects, "/api/v1/user/<string:username>/mapped-projects"
    )
    api.add_resource(
        UserInvalidatedTasks, "/api/v1/user/<string:username>/invalidated-tasks"
    )
    api.add_resource(UserOSMAPI, "/api/v1/user/<string:username>/osm-details")
    api.add_resource(
        UserSetRole, "/api/v1/user/<string:username>/set-role/<string:role>"
    )
    api.add_resource(
        UserSetLevel, "/api/v1/user/<string:username>/set-level/<string:level>"
    )
    api.add_resource(UserAcceptLicense, "/api/v1/user/accept-license/<int:license_id>")
    api.add_resource(UserIdAPI, "/api/v1/user-id/<int:userid>")
    api.add_resource(UserContributionsAPI, "/api/v1/user-id/<int:userid>/contributions")
    api.add_resource(IntersectingTilesAPI, "/api/v1/grid/intersecting-tiles")
    api.add_resource(
        SplitTaskAPI, "/api/v1/project/<int:project_id>/task/<int:task_id>/split"
    )
    api.add_resource(LanguagesAPI, "/api/v1/settings")
