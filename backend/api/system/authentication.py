from flask import session, current_app, redirect, request
from flask_restful import Resource

from backend import osm
from backend.services.users.authentication_service import (
    AuthenticationService,
    AuthServiceError,
)


@osm.tokengetter
def get_oauth_token():
    """Required by Flask-OAuthlib.  Pulls oauth token from the session so we can make authenticated requests"""
    if "osm_oauth" in session:
        resp = session["osm_oauth"]
        return resp["oauth_token"], resp["oauth_token_secret"]


class SystemAuthenticationLoginAPI(Resource):
    def get(self):
        """
        Redirects user to OSM to authenticate
        ---
        tags:
          - system
        produces:
          - application/json
        parameters:
            - in: query
              name: callback_url
              description: Route to redirect user once authenticated
              type: string
              default: /take/me/here
        responses:
          200:
            description: oauth token params
        """
        callback_url = request.args.get("callback_url", None)
        if callback_url is None:
            callback_url = current_app.config["APP_BASE_URL"]
        params = AuthenticationService.generate_authorize_url(callback_url)

        return params, 200


class SystemAuthenticationCallbackAPI(Resource):
    def get(self):
        """
        Handles the OSM OAuth callback
        ---
        tags:
          - system
        produces:
          - application/json
        responses:
          302:
            description: Redirects to login page, or login failed page
          500:
            description: A problem occurred authenticating the user
          502:
            description: A problem occurred negotiating with the OSM API
        """

        # Create session from requests. TODO: Do not use flask session
        token_secret = request.args.get("oauth_token_secret", None)
        if token_secret is None:
            return {"Error": "Missing oauth_token_secret parameter"}, 500

        email = request.args.get("email_address", None)
        session["osm_oauthtok"] = (
            request.args.get("oauth_token"),
            request.args.get("oauth_token_secret"),
        )

        osm_resp = osm.authorized_response()
        if osm_resp is None:
            current_app.logger.critical("No response from OSM")
            return redirect(AuthenticationService.get_authentication_failed_url())
        else:
            session[
                "osm_oauth"
            ] = osm_resp  # Set OAuth details in the session temporarily
        osm_response = osm.request(
            "user/details"
        )  # Get details for the authenticating user
        if osm_response.status != 200:
            current_app.logger.critical("Error response from OSM")
            return redirect(AuthenticationService.get_authentication_failed_url())

        try:
            user_params = AuthenticationService.login_user(osm_response.data, email)
            user_params["session"] = osm_resp
            return user_params, 200
        except AuthServiceError:
            return {"Error": "Unable to authenticate", "SubCode": "AuthError"}, 500


class SystemAuthenticationEmailAPI(Resource):
    def get(self):
        """
        Authenticates user owns email address
        ---
        tags:
          - system
        produces:
          - application/json
        parameters:
            - in: query
              name: username
              type: string
              default: thinkwhere
            - in: query
              name: token
              type: string
              default: 1234dvsdf
        responses:
            301:
                description: Will redirect to email validation page
            500:
                description: Internal Server Error
        """
        try:
            username = request.args.get("username")
            token = request.args.get("token")
            AuthenticationService.authenticate_email_token(username, token)

            return {"Status": "OK"}, 200
        except AuthServiceError:
            return {"Error": "Unable to authenticate", "SubCode": "AuthError"}, 403
        except Exception as e:
            error_msg = f"User GET - unhandled error: {str(e)}"
            current_app.logger.critical(error_msg)
            return {
                "Error": "Unable to authenticate",
                "SubCode": "InternalServerError",
            }, 500
