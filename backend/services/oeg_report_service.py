from flask import current_app
import requests
from requests.exceptions import ConnectionError
import json

from backend import create_app
from backend.api.utils import TMAPIDecorators
from backend.models.dtos.project_dto import ProjectDTO
from backend.models.postgis.project import Project
from backend.models.postgis.licenses import License
from backend.models.postgis.organisation import Organisation
from backend.models.postgis.project_info import ProjectInfo
from backend.models.dtos.oeg_report_dto import (
    ExternalSourceReportDTO,
    ProjectReportDTO,
    OrganisationReportDTO,
    OegReportDTO,
)


tm = TMAPIDecorators()


class OegReportServiceError(Exception):
    """ Custom Exception to notify callers an error occurred when validating a OsmReport """

    def __init__(self, message):
        if current_app:
            current_app.logger.error(message)


class OegReportService:
    @tm.asynchronous()
    def report_data_to_osm(self, project_id: int):
        app = (
            create_app()
        )  # Because message-all run on background thread it needs it's own app context

        with app.app_context():
            # Format project report data
            project = Project.get(project_id)
            project_dto = project.as_dto_for_report()
            project_report = self.format_project_data(project_dto)
            report_data = self.generate_project_report_data(project_report)

            # Validate report data
            oeg_report_dto = OegReportDTO(report_data)
            oeg_report_dto.validate()
            osm_report_data = oeg_report_dto.to_primitive(role="report")
            oeg_reporter_url = current_app.config["OEG_REPORTER_SERVICE_BASE_URL"]
            try:
                # Report to git
                response_git = requests.post(
                    f"{oeg_reporter_url}git/",
                    data=json.dumps(osm_report_data),
                    headers={"Content-Type": "application/json"},
                )
                if response_git.status_code != 201:
                    current_app.logger.debug("Bad response from OEG reporter")

                # Report to wiki
                response_wiki = requests.post(
                    f"{oeg_reporter_url}wiki/",
                    data=json.dumps(osm_report_data),
                    headers={"Content-Type": "application/json"},
                )
                if response_wiki.status_code != 201:
                    current_app.logger.debug("Bad response from OEG reporter")
            except ConnectionError:
                current_app.logger.error("Can't connect to OEG reporter")
            else:
                # Update reported project field
                project_info_dto = project_dto.project_info
                project_info_dto.reported = True

                update_project = ProjectInfo.get(project_id)
                if update_project is not None:
                    update_project.update_from_dto(project_info_dto)
                    update_project.save()
                    return report_data
                else:
                    current_app.logger.error(f"Project {project_id} not found")

    def get_project_report_external_source(self, project: dict) -> dict:
        external_source = {
            "imagery": project["imagery"],
            "license": project["license"],
            "instructions": project["instructions"],
            "perTaskInstructions": project["perTaskInstructions"],
        }
        external_source_dto = ExternalSourceReportDTO(external_source)
        external_source_dto.validate()

        project.pop("imagery")
        project.pop("license")
        project.pop("instructions")
        project.pop("perTaskInstructions")
        return external_source

    def get_project_report_license(self, project: dict) -> dict:
        project_license = License.get_by_id(project["licenseId"])
        project_license_dto = project_license.as_dto()
        project["license"] = project.pop("licenseId")
        project_license_dto.validate()

        project_license = project_license_dto.to_primitive(role="report")
        return project_license["description"]

    def format_project_data(self, project_dto: ProjectDTO) -> dict:
        """ Format project data according to OegReportDTO """
        project = project_dto.to_primitive(role="report")

        # Add project info data into project data directly
        project.update(project["projectInfo"])
        project.pop("projectInfo")

        # Add users presents in project into project data
        project_users = Project.get_users_project(project["projectId"])
        project_users_dict = project_users.to_primitive()
        project.update(project_users_dict)

        # Add license, external source  and url into project data
        project["license"] = self.get_project_report_license(project)
        project["externalSource"] = self.get_project_report_external_source(project)
        project["url"] = (
            current_app.config["FRONTEND_BASE_URL"]
            + "/projects/"
            + str(project["projectId"])
        )
        return project

    def get_project_report_organisation(self, project: dict) -> dict:
        project_organisation = Organisation.get(project["organisation"])
        organisation = {
            "name": project_organisation.name,
            "url": project_organisation.url,
            "description": project_organisation.description,
        }
        project_organisation_dto = OrganisationReportDTO(organisation)
        project_organisation_dto.validate()
        return project_organisation_dto.to_primitive(role="report")

    def generate_project_report_data(self, project: dict) -> dict:
        # Get project organisation
        project_organisation = self.get_project_report_organisation(project)
        project.pop("organisation")

        project_dto = ProjectReportDTO(project)
        project_dto.validate()

        report_data = {
            "project": project,
            "organisation": (project_organisation),
            "platform": {
                "name": current_app.config["ORG_CODE"] + " Tasking Manager",
                "url": current_app.config["FRONTEND_BASE_URL"],
            },
        }
        return report_data
