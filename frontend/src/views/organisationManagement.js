import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from '@reach/router';
import ReactPlaceholder from 'react-placeholder';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';

import messages from './messages';
import { useFetch } from '../hooks/UseFetch';
import { useEditOrgAllowed } from '../hooks/UsePermissions';
import { pushToLocalJSONAPI, fetchLocalJSONAPI } from '../network/genericJSONRequest';
import { Members } from '../components/teamsAndOrgs/members';
import { Teams } from '../components/teamsAndOrgs/teams';
import { Projects } from '../components/teamsAndOrgs/projects';
import {
  OrganisationForm,
  CreateOrgInfo,
  OrgsManagement,
} from '../components/teamsAndOrgs/organisations';
import { FormSubmitButton, CustomButton } from '../components/button';
import { ChartLineIcon } from '../components/svgIcons';
import { DeleteModal } from '../components/deleteModal';
import { useSetTitleTag } from '../hooks/UseMetaTags';
import { Alert } from '../components/alert';

export function ListOrganisations() {
  useSetTitleTag('Manage organizations');
  const token = useSelector((state) => state.auth.token);
  const userDetails = useSelector((state) => state.auth.userDetails);
  const isOrgManager = useSelector(
    (state) => state.auth.organisations && state.auth.organisations.length > 0,
  );
  const [organisations, setOrganisations] = useState(null);
  const [userOrgsOnly, setUserOrgsOnly] = useState(userDetails.role === 'ADMIN' ? false : true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token && userDetails && userDetails.id) {
      setLoading(true);
      const queryParam = `${userOrgsOnly ? `?manager_user_id=${userDetails.id}` : ''}`;
      fetchLocalJSONAPI(`organisations/${queryParam}`, token)
        .then((orgs) => {
          setOrganisations(orgs.organisations);
          setLoading(false);
        })
        .catch((err) => setError(err));
    }
  }, [userDetails, token, userOrgsOnly]);

  return (
    <OrgsManagement
      organisations={organisations}
      userOrgsOnly={userOrgsOnly}
      setUserOrgsOnly={setUserOrgsOnly}
      isOrgManager={userDetails.role === 'ADMIN' || isOrgManager}
      isAdmin={userDetails.role === 'ADMIN'}
      isOrganisationsFetched={!loading && !error}
    />
  );
}

export function CreateOrganisation() {
  useSetTitleTag('Create new organization');
  const navigate = useNavigate();
  const userDetails = useSelector((state) => state.auth.userDetails);
  const token = useSelector((state) => state.auth.token);
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userDetails && userDetails.username && managers.length === 0) {
      setManagers([{ username: userDetails.username, pictureUrl: userDetails.pictureUrl }]);
    }
  }, [userDetails, managers]);

  const addManagers = (values) => {
    const newValues = values.filter(
      (newUser) => !managers.map((i) => i.username).includes(newUser.username),
    );
    setManagers(managers.concat(newValues));
  };
  const removeManagers = (username) => {
    setManagers(managers.filter((i) => i.username !== username));
  };
  const createOrg = (payload) => {
    payload.managers = managers.map((user) => user.username);
    pushToLocalJSONAPI('organisations/', JSON.stringify(payload), token, 'POST')
      .then((result) => {
        navigate(`/manage/organisations/${result.organisationId}`);
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  return (
    <Form
      onSubmit={(values) => createOrg(values)}
      render={({ handleSubmit, pristine, form, submitting, values }) => {
        return (
          <form onSubmit={handleSubmit} className="blue-grey">
            <div className="cf pv4 pb5">
              <h3 className="f2 mb3 ttu blue-dark fw7 ma0 barlow-condensed">
                <FormattedMessage {...messages.newOrganisation} />
              </h3>
              <div className="w-40-l w-100">
                <CreateOrgInfo formState={values} />
                <Members
                  addMembers={addManagers}
                  removeMembers={removeManagers}
                  members={managers}
                  resetMembersFn={setManagers}
                  creationMode={true}
                />
              </div>
            </div>
            <div className="bottom-0 right-0 left-0 cf bg-white h3 fixed">
              <div className="w-80-ns w-60-m w-50 h-100 fl tr flex justify-between items-center">
                <div className="cf pv2 ml2">
                  {error && (
                    <Alert type="error" compact>
                      {messages[`orgCreation${error}Error`] ? (
                        <FormattedMessage {...messages[`orgCreation${error}Error`]} />
                      ) : (
                        <FormattedMessage {...messages[`errorFallback`]} />
                      )}
                    </Alert>
                  )}
                </div>
                <Link to={'../'}>
                  <CustomButton className="bg-white mr5 pr2 h-100 bn bg-white blue-dark">
                    <FormattedMessage {...messages.cancel} />
                  </CustomButton>
                </Link>
              </div>
              <div className="w-20-l w-40-m w-50 h-100 fr">
                <FormSubmitButton
                  disabled={submitting || pristine}
                  className="w-100 h-100 bg-primary white"
                  disabledClassName="bg-primary o-50 white w-100 h-100"
                >
                  <FormattedMessage {...messages.createOrganisation} />
                </FormSubmitButton>
              </div>
            </div>
          </form>
        );
      }}
    ></Form>
  );
}

export function EditOrganisation(props) {
  const userDetails = useSelector((state) => state.auth.userDetails);
  const token = useSelector((state) => state.auth.token);
  const [initManagers, setInitManagers] = useState(false);
  const [managers, setManagers] = useState([]);
  const [error, loading, organisation] = useFetch(`organisations/${props.id}/`, props.id);
  const [isUserAllowed] = useEditOrgAllowed(organisation);
  const [projectsError, projectsLoading, projects] = useFetch(
    `projects/?organisationId=${props.id}&omitMapResults=true&projectStatuses=PUBLISHED,DRAFT,ARCHIVED`,
    props.id,
  );
  const [errorMessage, setErrorMessage] = useState(null);
  useSetTitleTag(`Edit ${organisation.name}`);

  useEffect(() => {
    if (!initManagers && organisation && organisation.managers) {
      setManagers(organisation.managers);
      setInitManagers(true);
    }
  }, [organisation, managers, initManagers]);

  const addManagers = (values) => {
    const newValues = values.filter(
      (newUser) => !managers.map((i) => i.username).includes(newUser.username),
    );
    setManagers(managers.concat(newValues));
  };
  const removeManagers = (username) => {
    setManagers(managers.filter((i) => i.username !== username));
  };

  const updateManagers = () => {
    let payload = JSON.stringify({ managers: managers.map((i) => i.username) });
    pushToLocalJSONAPI(`organisations/${props.id}/`, payload, token, 'PATCH');
  };

  const updateOrg = (payload) => {
    pushToLocalJSONAPI(`organisations/${props.id}/`, JSON.stringify(payload), token, 'PATCH')
      .then(() => setErrorMessage(null))
      .catch((err) => setErrorMessage(err.message));
  };

  return (
    <ReactPlaceholder
      showLoadingAnimation={true}
      type={'media'}
      rows={26}
      delay={100}
      ready={!error && loading === false && typeof organisation === 'object'}
    >
      {isUserAllowed ? (
        <div className="cf">
          <div className="cf pv4 w-100">
            <div className="w-auto fl">
              <h3 className="f2 ttu blue-dark fw7 ma0 barlow-condensed v-mid dib">
                <FormattedMessage {...messages.manageOrganisation} />
              </h3>
              <DeleteModal
                id={organisation.organisationId}
                name={organisation.name}
                type="organisations"
              />
            </div>
            <div className="w-auto fr">
              <Link to={`/organisations/${organisation.organisationId}/stats/`}>
                <CustomButton
                  className="bg-primary ba b--primary white pv2 ph3"
                  icon={<ChartLineIcon className="h1 v-mid" />}
                >
                  <FormattedMessage {...messages.statistics} />
                </CustomButton>
              </Link>
            </div>
          </div>
          <div className="w-40-l w-100 mt4 fl">
            <OrganisationForm
              userDetails={userDetails}
              organisation={{
                name: organisation.name,
                url: organisation.url,
                slug: organisation.slug,
                logo: organisation.logo,
                description: organisation.description,
                type: organisation.type,
                subscriptionTier: organisation.subscriptionTier,
              }}
              updateOrg={updateOrg}
              disabledForm={error || loading}
              errorMessage={errorMessage}
            />
            <Members
              addMembers={addManagers}
              removeMembers={removeManagers}
              saveMembersFn={updateManagers}
              resetMembersFn={setManagers}
              members={managers}
            />
          </div>
          <div className="w-60-l w-100 mt4 pl5-l pl0 fr">
            <Projects
              projects={!projectsLoading && !projectsError && projects}
              viewAllEndpoint={`/manage/projects/?organisation=${organisation.name}`}
              ownerEntity="organisation"
            />
            <Teams
              teams={organisation.teams}
              viewAllQuery={`?organisationId=${props.id}`}
              isReady={!error && !loading}
            />
          </div>
        </div>
      ) : (
        <div className="cf w-100 pv5">
          <div className="tc">
            <h3 className="f3 fw8 mb4 barlow-condensed">
              <FormattedMessage {...messages.editOrgNotAllowed} />
            </h3>
          </div>
        </div>
      )}
    </ReactPlaceholder>
  );
}
