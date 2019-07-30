from server.models.postgis.project import Project


class TagsService:
    @staticmethod
    def get_all_organisation_tags(preferred_locale):
        """ Get all org tags"""
        return Project.get_all_organisations_tag(preferred_locale=preferred_locale)

    @staticmethod
    def get_all_campaign_tags(preferred_locale):
        """ Get all campaign tags"""
        return Project.get_all_campaign_tag(preferred_locale=preferred_locale)
