import copy
import os
import unittest
import geojson
from server import create_app
from server.models.postgis.project import (
    Task,
    ProjectDTO,
    ProjectStatus,
    ProjectPriority,
    Project,
)
from server.models.postgis.project_info import ProjectInfoDTO
from tests.server.helpers.test_helpers import create_canned_project


class TestProject(unittest.TestCase):
    skip_tests = False
    test_project = None
    test_user = None

    @classmethod
    def setUpClass(cls):
        env = os.getenv("CI", "false")

        # Firewall rules mean we can't hit Postgres from CI so we have to skip them in the CI build
        if env == "true":
            cls.skip_tests = True

    def setUp(self):
        """
        Setup test context so we can connect to database
        """
        self.app = create_app()
        self.ctx = self.app.app_context()
        self.ctx.push()

        if self.skip_tests:
            return

        self.test_project, self.test_user = create_canned_project()

    def tearDown(self):
        if self.skip_tests:
            return

        self.test_project.delete()
        self.test_user.delete()
        self.ctx.pop()

    def test_project_can_be_persisted_to_db(self):
        if self.skip_tests:
            return

        # Checks that code we ran in setUp actually created a project in the DB
        self.assertIsNotNone(
            self.test_project.id, "ID should be set if project successfully persisted"
        )

    def test_task_can_generate_valid_feature_collection(self):
        if self.skip_tests:
            return

        # Act
        feature_collection = Task.get_tasks_as_geojson_feature_collection(
            self.test_project.id
        )

        # Assert
        self.assertIsInstance(feature_collection, geojson.FeatureCollection)
        self.assertEqual(2, len(feature_collection.features))

    def test_project_can_be_generated_as_dto(self):
        if self.skip_tests:
            return

        # Arrange
        self.update_project_with_info()

        # Act
        project_dto = self.test_project.as_dto_for_mapping("en", False)

        # Assert
        self.assertIsInstance(project_dto.area_of_interest, geojson.MultiPolygon)
        self.assertIsInstance(project_dto.tasks, geojson.FeatureCollection)
        # TODO test for project info
        # self.assertEqual(project_dto.project_name, 'Test')
        self.assertEqual(project_dto.project_id, self.test_project.id)

    def test_update_project_adds_project_info(self):
        if self.skip_tests:
            return

        # Act
        self.update_project_with_info()

        # Assert
        self.assertEqual(self.test_project.status, ProjectStatus.PUBLISHED.value)
        self.assertEqual(self.test_project.priority, ProjectPriority.MEDIUM.value)
        self.assertEqual(self.test_project.default_locale, "en")
        self.assertEqual(self.test_project.project_info[0].name, "Thinkwhere Test")

    def test_partial_translation_uses_default_trans_for_empty_fields(self):
        if self.skip_tests:
            return

        # Arrange
        self.update_project_with_info()

        locales = []
        test_info = ProjectInfoDTO()
        test_info.locale = "it"
        locales.append(test_info)

        test_dto = ProjectDTO()
        test_dto.project_status = ProjectStatus.PUBLISHED.name
        test_dto.project_priority = ProjectPriority.MEDIUM.name
        test_dto.default_locale = "en"
        test_dto.project_info_locales = locales
        test_dto.mapper_level = "BEGINNER"
        test_dto.mapping_types = ["ROADS"]
        test_dto.mapping_editors = ["JOSM", "ID"]
        test_dto.validation_editors = ["JOSM"]

        # Act - Create empty italian translation
        self.test_project.update(test_dto)
        dto = self.test_project.as_dto_for_mapping("it", False)

        # Assert
        self.assertEqual(
            dto.project_info["name"],
            "Thinkwhere Test",
            "English translation should be returned as Italian name was not provided",
        )

    def test_project_can_be_cloned(self):

        if self.skip_tests:
            return

        # Arrange
        self.update_project_with_info()

        # Act
        original_id = copy.copy(self.test_project.id)
        cloned_project = Project.clone(original_id, self.test_user.id)

        self.assertTrue(cloned_project)
        self.assertEqual(cloned_project.project_info[0].name, "Thinkwhere Test")

        # Tidy Up
        cloned_project.delete()
        original_project = Project.get(
            original_id
        )  # SQLAlchemy is hanging on to a ref to the old project
        original_project.delete()

    def update_project_with_info(self):

        locales = []
        test_info = ProjectInfoDTO()
        test_info.locale = "en"
        test_info.name = "Thinkwhere Test"
        test_info.description = "Test Description"
        test_info.short_description = "Short description"
        test_info.instructions = "Instructions"
        locales.append(test_info)

        test_dto = ProjectDTO()
        test_dto.project_status = ProjectStatus.PUBLISHED.name
        test_dto.project_priority = ProjectPriority.MEDIUM.name
        test_dto.default_locale = "en"
        test_dto.project_info_locales = locales
        test_dto.mapper_level = "BEGINNER"
        test_dto.mapping_types = ["ROADS"]
        test_dto.mapping_editors = ["JOSM", "ID"]
        test_dto.validation_editors = ["JOSM"]
        self.test_project.update(test_dto)
