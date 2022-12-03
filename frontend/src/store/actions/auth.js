import * as safeStorage from '../../utils/safe_storage';
import { pushToLocalJSONAPI, fetchLocalJSONAPI } from '../../network/genericJSONRequest';
import { setLoader } from './loader';

export const types = {
  REGISTER_USER: 'REGISTER_USER',
  SET_USER_DETAILS: 'SET_USER_DETAILS',
  SET_OSM: 'SET_OSM',
  SET_ORGANISATIONS: 'SET_ORGANISATIONS',
  SET_PM_TEAMS: 'SET_PM_TEAMS',
  UPDATE_OSM_INFO: 'UPDATE_OSM_INFO',
  GET_USER_DETAILS: 'GET_USER_DETAILS',
  SET_TOKEN: 'SET_TOKEN',
  SET_SESSION: 'SET_SESSION',
  CLEAR_SESSION: 'CLEAR_SESSION',
};

export function clearUserDetails() {
  return {
    type: types.CLEAR_SESSION,
  };
}

export const updateUserEmail = (userDetails, token, relevant_fields) => (dispatch) => {
  const filtered = Object.keys(userDetails)
    .filter((key) => relevant_fields.includes(key))
    .reduce((obj, key) => {
      obj[key] = userDetails[key];
      return obj;
    }, {});
  const payload = JSON.stringify(filtered);

  pushToLocalJSONAPI(`users/me/actions/set-user/`, payload, token, 'PATCH').then(() => {
    dispatch({
      type: types.SET_USER_DETAILS,
      userDetails: userDetails,
    });
  });
};

export const logout = () => (dispatch) => {
  safeStorage.removeItem('username');
  safeStorage.removeItem('token');
  safeStorage.removeItem('action');
  safeStorage.removeItem('osm_oauth_token');
  safeStorage.removeItem('osm_oauth_token_secret');
  safeStorage.removeItem('tasksSortOrder');
  dispatch(clearUserDetails());
};

export function updateUserDetails(userDetails) {
  return {
    type: types.SET_USER_DETAILS,
    userDetails: userDetails,
  };
}

export function updateOSMInfo(osm) {
  return {
    type: types.SET_OSM,
    osm: osm,
  };
}

export function updateOrgsInfo(organisations) {
  return {
    type: types.SET_ORGANISATIONS,
    organisations: organisations,
  };
}

export function updatePMsTeams(teams) {
  return {
    type: types.SET_PM_TEAMS,
    teams: teams,
  };
}

export function updateToken(token) {
  return {
    type: types.SET_TOKEN,
    token: token,
  };
}

export function updateSession(session) {
  return {
    type: types.SET_SESSION,
    session: session,
  };
}

export const setAuthDetails =
  (username, token, osm_oauth_token, osm_oauth_token_secret) => (dispatch) => {
    const encoded_token = btoa(token);
    safeStorage.setItem('token', encoded_token);
    safeStorage.setItem('username', username);
    safeStorage.setItem('osm_oauth_token', osm_oauth_token);
    safeStorage.setItem('osm_oauth_token_secret', osm_oauth_token_secret);
    dispatch(updateToken(encoded_token));
    dispatch(
      updateSession({
        osm_oauth_token: osm_oauth_token,
        osm_oauth_token_secret: osm_oauth_token_secret,
      }),
    );
    dispatch(setUserDetails(username, encoded_token));
  };

// UPDATES OSM INFORMATION OF THE USER
export const setUserDetails =
  (username, encodedToken, update = false) =>
  (dispatch) => {
    // only trigger the loader if this function is not being triggered to update the user information
    if (!update) dispatch(setLoader(true));
    fetchLocalJSONAPI(`users/${username}/openstreetmap/`, encodedToken)
      .then((osmInfo) => dispatch(updateOSMInfo(osmInfo)))
      .catch((error) => {
        console.log(error);
        dispatch(setLoader(false));
      });
    // GET USER DETAILS
    fetchLocalJSONAPI(`users/queries/${username}/`, encodedToken)
      .then((userDetails) => {
        dispatch(updateUserDetails(userDetails));
        // GET USER ORGS INFO
        fetchLocalJSONAPI(
          `organisations/?omitManagerList=true&manager_user_id=${userDetails.id}`,
          encodedToken,
        )
          .then((orgs) =>
            dispatch(updateOrgsInfo(orgs.organisations.map((org) => org.organisationId))),
          )
          .catch((error) => dispatch(updateOrgsInfo([])));
        fetchLocalJSONAPI(
          `teams/?omitMemberList=true&team_role=PROJECT_MANAGER&member=${userDetails.id}`,
          encodedToken,
        )
          .then((teams) => dispatch(updatePMsTeams(teams.teams.map((team) => team.teamId))))
          .catch((error) => dispatch(updatePMsTeams([])));
        dispatch(setLoader(false));
      })
      .catch((error) => {
        dispatch(logout());
        dispatch(setLoader(false));
      });
  };

export const getUserDetails = (state) => (dispatch) => {
  if (state.auth.getIn(['userDetails', 'username'])) {
    dispatch(
      setUserDetails(state.auth.getIn(['userDetails', 'username']), state.auth.get('token')),
    );
  }
};

export const pushUserDetails =
  (userDetails, token, update = false) =>
  (dispatch) => {
    pushToLocalJSONAPI(`users/me/actions/set-user/`, userDetails, token, 'PATCH').then((data) =>
      dispatch(setUserDetails(safeStorage.getItem('username'), token, update)),
    );
  };
