import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from '@reach/router';

import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';

import messages from './messages';
import { useFetch } from '../hooks/UseFetch';
import { pushToLocalJSONAPI } from '../network/genericJSONRequest';
import {
  CampaignsManagement,
  CampaignInformation,
  CampaignForm,
} from '../components/teamsAndOrgs/campaigns';
import { Projects } from '../components/teamsAndOrgs/projects';
import { FormSubmitButton, CustomButton } from '../components/button';
import { DeleteModal } from '../components/deleteModal';
import { useSetTitleTag } from '../hooks/UseMetaTags';
import { Alert } from '../components/alert';
import { useAsync } from '../hooks/UseAsync';

const CampaignError = ({ error }) => {
  return (
    <>
      {error && (
        <div className="cf pv2">
          <Alert type="error">
            <FormattedMessage {...messages.campaignError} />
          </Alert>
        </div>
      )}
    </>
  );
};

export function ListCampaigns() {
  useSetTitleTag('Manage campaigns');
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  // TO DO: filter teams of current user
  const [error, loading, campaigns] = useFetch(`campaigns/`);
  const isCampaignsFetched = !loading && !error;

  return (
    <CampaignsManagement
      campaigns={campaigns.campaigns}
      userDetails={userDetails}
      isCampaignsFetched={isCampaignsFetched}
    />
  );
}

export function CreateCampaign() {
  useSetTitleTag('Create new campaign');
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.get('token'));
  const [error, setError] = useState(false);

  const createCampaign = (payload) => {
    return pushToLocalJSONAPI('campaigns/', JSON.stringify(payload), token, 'POST')
      .then((result) => {
        setError(false);
        navigate(`/manage/campaigns/${result.campaignId}`);
      })
      .catch((e) => setError(true));
  };

  const createCampaignAsync = useAsync(createCampaign);

  return (
    <Form
      onSubmit={(values) => createCampaignAsync.execute(values)}
      render={({ handleSubmit, pristine, form, submitting, values }) => {
        return (
          <form onSubmit={handleSubmit} className="blue-grey">
            <div className="cf vh-100">
              <h3 className="f2 mb3 ttu blue-dark fw7 barlow-condensed">
                <FormattedMessage {...messages.newCampaign} />
              </h3>
              <div className="w-40-l w-100 fl">
                <div className="bg-white b--grey-light ba pa4 mb3">
                  <h3 className="f3 blue-dark mv0 fw6">
                    <FormattedMessage {...messages.campaignInfo} />
                  </h3>
                  <CampaignInformation />
                  <CampaignError error={error} />
                </div>
              </div>
            </div>
            <div className="fixed left-0 bottom-0 cf bg-white h3 w-100">
              <div className="w-80-ns w-60-m w-50 h-100 fl tr">
                <Link to={'../'}>
                  <CustomButton className="bg-white mr5 pr2 h-100 bn bg-white blue-dark">
                    <FormattedMessage {...messages.cancel} />
                  </CustomButton>
                </Link>
              </div>
              <div className="w-20-l w-40-m w-50 h-100 fr">
                <FormSubmitButton
                  disabled={submitting || pristine || createCampaignAsync.status === 'pending'}
                  loading={submitting || createCampaignAsync.status === 'pending'}
                  className="w-100 h-100 bg-primary white"
                  disabledClassName="bg-primary o-50 white w-100 h-100"
                >
                  <FormattedMessage {...messages.createCampaign} />
                </FormSubmitButton>
              </div>
            </div>
          </form>
        );
      }}
    ></Form>
  );
}

export function EditCampaign(props) {
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const token = useSelector((state) => state.auth.get('token'));
  const [error, loading, campaign] = useFetch(`campaigns/${props.id}/`, props.id);
  useSetTitleTag(`Edit ${campaign.name}`);
  const [projectsError, projectsLoading, projects] = useFetch(
    `projects/?campaign=${encodeURIComponent(campaign.name)}&omitMapResults=true`,
    campaign.name !== undefined,
  );
  const [nameError, setNameError] = useState(false);

  const updateCampaign = (payload) => {
    return pushToLocalJSONAPI(`campaigns/${props.id}/`, JSON.stringify(payload), token, 'PATCH')
      .then((res) => setNameError(false))
      .catch((e) => setNameError(true));
  };

  const updateCampaignAsync = useAsync(updateCampaign);

  return (
    <div className="cf pv4 bg-tan">
      <div className="cf">
        <h3 className="f2 ttu blue-dark fw7 barlow-condensed v-mid ma0 dib ttu">
          <FormattedMessage {...messages.manageCampaign} />
        </h3>
        <DeleteModal id={campaign.id} name={campaign.name} type="campaigns" />
      </div>
      <div className="w-40-l w-100 mt4 fl">
        <CampaignForm
          userDetails={userDetails}
          campaign={{ name: campaign.name }}
          updateCampaignAsync={updateCampaignAsync}
          disabled={error || loading}
          disableErrorAlert={() => nameError && setNameError(false)}
        />
        <CampaignError error={nameError} />
      </div>
      <div className="w-60-l w-100 mt4 pl5-l pl0 fl">
        <Projects
          projects={!projectsLoading && !projectsError && projects}
          viewAllEndpoint={`/manage/projects/?campaign=${encodeURIComponent(campaign.name)}`}
          ownerEntity="campaign"
        />
      </div>
    </div>
  );
}
