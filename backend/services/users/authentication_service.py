import base64
import urllib.parse

from flask import current_app, request, session
from flask_httpauth import HTTPTokenAuth
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from backend import osm
from backend.api.utils import TMAPIDecorators
from backend.services.messaging.message_service import MessageService
from backend.services.users.user_service import UserService, NotFound
from werkzeug import url_quote

token_auth = HTTPTokenAuth(scheme="Token")
tm = TMAPIDecorators()


@token_auth.verify_token
def verify_token(token):
    """ Verify the supplied token and check user role is correct for the requested resource"""
    tm.authenticated_user_id = None
    if not token:
        return False

    try:
        decoded_token = base64.b64decode(token).decode("utf-8")
    except UnicodeDecodeError:
        current_app.logger.debug(f"Unable to decode token {request.base_url}")
        return False  # Can't decode token, so fail login

    valid_token, user_id = AuthenticationService.is_valid_token(decoded_token, 604800)
    if not valid_token:
        current_app.logger.debug(f"Token not valid {request.base_url}")
        return False

    tm.authenticated_user_id = (
        user_id  # Set the user ID on the decorator as a convenience
    )
    return user_id  # All tests passed token is good for the requested resource


class AuthServiceError(Exception):
    """ Custom Exception to notify callers an error occurred when authenticating """

    def __init__(self, message):
        if current_app:
            current_app.logger.debug(message)


class AuthenticationService:
    @staticmethod
    def login_user(osm_user_details, email, user_element="user") -> dict:
        """
        Generates authentication details for user, creating in DB if user is unknown to us
        :param osm_user_details: XML response from OSM
        :param redirect_to: Route to redirect user to, from callback url
        :param user_element: Exists for unit testing
        :raises AuthServiceError
        :returns A dictionary containing the keys "username", "session_token"
        and "picture."
        """
        osm_user = osm_user_details.find(user_element)

        if osm_user is None:
            raise AuthServiceError("User element not found in OSM response")

        osm_id = int(osm_user.attrib["id"])
        username = osm_user.attrib["display_name"]
        try:
            # get gravatar profile picture file name
            user_picture = osm_user.find("img").attrib["href"]
        except (AttributeError, IndexError):
            user_picture = None

        try:
            UserService.get_user_by_id(osm_id)
            UserService.update_user(osm_id, username, user_picture)
        except NotFound:
            # User not found, so must be new user
            changesets = osm_user.find("changesets")
            changeset_count = int(changesets.attrib["count"])
            new_user = UserService.register_user(
                osm_id, username, changeset_count, user_picture, email
            )
            MessageService.send_welcome_message(new_user)

        session_token = AuthenticationService.generate_session_token_for_user(osm_id)
        return {
            "username": username,
            "session_token": session_token,
            "picture": user_picture,
        }

    @staticmethod
    def authenticate_email_token(username: str, token: str):
        """ Validate that the email token is valid """
        try:
            user = UserService.get_user_by_username(username)
        except NotFound:
            raise AuthServiceError("Unable to authenticate")

        is_valid, tokenised_email = AuthenticationService.is_valid_token(token, 86400)

        if not is_valid:
            raise AuthServiceError("Unable to authenticate")

        if user.email_address != tokenised_email:
            raise AuthServiceError("Unable to authenticate")

        # Token is valid so update DB and return
        user.set_email_verified_status(is_verified=True)
        return AuthenticationService._get_email_validated_url(True)

    @staticmethod
    def _get_email_validated_url(is_valid: bool) -> str:
        """ Helper function to generate redirect url for email verification """
        base_url = current_app.config["APP_BASE_URL"]

        verification_params = {"is_valid": is_valid}
        verification_url = "{0}/validate-email?{1}".format(
            base_url, urllib.parse.urlencode(verification_params)
        )
        return verification_url

    @staticmethod
    def get_authentication_failed_url():
        """ Generates the auth-failed URL for the running app """
        base_url = current_app.config["APP_BASE_URL"]
        auth_failed_url = f"{base_url}/auth-failed"
        return auth_failed_url

    @staticmethod
    def generate_session_token_for_user(osm_id: int):
        """
        Generates a unique token with the osm_id and current time embedded within it
        :param osm_id: OSM ID of the user authenticating
        :return: Token
        """
        entropy = current_app.secret_key if current_app.secret_key else "un1testingmode"

        serializer = URLSafeTimedSerializer(entropy)
        return serializer.dumps(osm_id)

    @staticmethod
    def generate_authorize_url(callback):
        token, secret = osm.generate_request_token(callback)
        url = f"{osm.expand_url(osm.authorize_url)}?oauth_token={url_quote(token)}"

        # Remove tokens from session. The library creates it.
        session.pop("osm_oauthtok")

        return {"auth_url": url, "oauth_token": token, "oauth_token_secret": secret}

    @staticmethod
    def is_valid_token(token, token_expiry):
        """
        Validates if the supplied token is valid, and hasn't expired.
        :param token: Token to check
        :param token_expiry: When the token expires in seconds
        :return: True if token is valid, and user_id contained in token
        """
        entropy = current_app.secret_key if current_app.secret_key else "un1testingmode"
        serializer = URLSafeTimedSerializer(entropy)

        try:
            tokenised_user_id = serializer.loads(token, max_age=token_expiry)
        except SignatureExpired:
            current_app.logger.debug("Token has expired")
            return False, None
        except BadSignature:
            current_app.logger.debug("Bad Token Signature")
            return False, None

        return True, tokenised_user_id
