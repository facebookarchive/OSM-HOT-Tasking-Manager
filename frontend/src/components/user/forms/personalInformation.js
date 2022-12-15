import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Form, Field } from 'react-final-form';
import ReactTooltip from 'react-tooltip';
import { FormattedMessage, useIntl } from 'react-intl';

import messages from '../messages';
import { FormSubmitButton } from '../../button';
import { InfoIcon, CheckIcon, CloseIcon } from '../../svgIcons';
import { UserCountrySelect, RadioField } from '../../formInputs';
import { pushUserDetails } from '../../../store/actions/auth';
import { fetchLocalJSONAPI } from '../../../network/genericJSONRequest';
import { ORG_CODE } from '../../../config';

export const PROFILE_RELEVANT_FIELDS = [
  'name',
  'emailAddress',
  'city',
  'country',
  'twitterId',
  'facebookId',
  'linkedinId',
  'slackId',
  'gender',
];

const textInputFields = [
  {
    name: 'city',
    label: <FormattedMessage {...messages.city} />,
  },
  {
    name: 'slackId',
    label: <FormattedMessage {...messages.slackUsername} values={{ org: ORG_CODE }} />,
  },
  {
    name: 'twitterId',
    label: 'Twitter',
  },
  {
    name: 'facebookId',
    label: 'Facebook',
  },
  {
    name: 'linkedinId',
    label: 'Linkedin',
  },
];

const genderOptions = [
  {
    label: <FormattedMessage {...messages.female} />,
    value: 'FEMALE',
  },
  {
    label: <FormattedMessage {...messages.male} />,
    value: 'MALE',
  },
  {
    label: <FormattedMessage {...messages.preferNotToSay} />,
    value: 'PREFER_NOT',
  },
  {
    label: <FormattedMessage {...messages.selfDescribe} />,
    value: 'SELF_DESCRIBE',
  },
];

const mapStateToProps = (state) => ({
  userDetails: state.auth.get('userDetails'),
  token: state.auth.get('token'),
});

const RequiredIndicator = () => <span className="ml1 b red">*</span>;

function _PersonalInformationForm({ userDetails, token, pushUserDetails }) {
  const intl = useIntl();
  const labelClasses = 'db pt3 pb2';
  const fieldClasses = 'blue-grey w-100 pv3 ph2 input-reset ba b--grey-light bg-transparent';
  const formFields = PROFILE_RELEVANT_FIELDS.concat(['selfDescriptionGender']);
  const [resendStatus, setResendStatus] = useState(null);

  const prepareUserDetailsToPush = (values, fields) => {
    let data = { id: userDetails.id };
    fields.filter((key) => values.hasOwnProperty(key)).forEach((key) => (data[key] = values[key]));
    return JSON.stringify(data);
  };

  const resendEmail = () => {
    fetchLocalJSONAPI('users/me/actions/verify-email/', token, 'PATCH')
      .then(() => setResendStatus(true))
      .catch(() => setResendStatus(false));
  };

  const composeValidators =
    (...validators) =>
    (value) =>
      validators.reduce((error, validator) => error || validator(value), undefined);

  const isUrl = (value) =>
    value &&
    value.match(
      /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
    ) ? (
      <FormattedMessage {...messages.urlDetectedError} />
    ) : undefined;

  async function handleFormSubmit(values) {
    await pushUserDetails(prepareUserDetailsToPush(values, formFields), token, true);
  }

  return (
    <div className="bg-white shadow-4 pa4 mb3">
      <h3 className="f3 blue-dark mt0 fw6">
        <FormattedMessage {...messages.personalInfo} />
      </h3>
      <Form
        subscription={{ submitting: true, pristine: true }}
        onSubmit={handleFormSubmit}
        initialValues={userDetails}
        render={({ handleSubmit, pristine, submitting, hasValidationErrors }) => (
          <form onSubmit={handleSubmit} className="blue-grey">
            <fieldset className="bn ph0" disabled={submitting || !userDetails.username}>
              <div className="cf">
                <label className={labelClasses}>
                  <FormattedMessage {...messages.name} />
                  <RequiredIndicator />
                </label>
                <Field
                  name="name"
                  component="input"
                  type="text"
                  className={fieldClasses}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="cf">
                <label className={labelClasses}>
                  <FormattedMessage {...messages.email} />
                  <RequiredIndicator />
                  <InfoIcon
                    className="blue-grey h1 w1 v-mid pb1 ml2"
                    data-tip={intl.formatMessage(messages.emailPrivacy)}
                  />
                  <ReactTooltip place="bottom" className="mw6" effect="solid" />
                </label>
                <Field name="emailAddress" type="email" component="input" autoComplete="email">
                  {({ input, meta }) => (
                    <div>
                      <input
                        {...input}
                        type="email"
                        className={fieldClasses}
                        pattern="^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$"
                        required
                      />
                      {meta.error && meta.touched && <div className="mt1 red">{meta.error}</div>}
                      {userDetails.emailAddress && !userDetails.isEmailVerified && !meta.dirty && (
                        <div className="mt1 red">
                          <FormattedMessage {...messages.emailConfirmationMsg} />
                          <span
                            onClick={resendEmail}
                            className="ml2 ma0 pa0 link pointer red b underline f6"
                          >
                            <FormattedMessage {...messages.emailResend} />
                          </span>
                          {resendStatus !== null && (
                            <>
                              {resendStatus ? (
                                <CheckIcon
                                  style={{ width: '0.7em', height: '0.7em' }}
                                  className="ml1 h1 w1 blue-dark"
                                />
                              ) : (
                                <CloseIcon
                                  style={{ width: '0.7em', height: '0.7em' }}
                                  className="ml1 h1 w1 red"
                                />
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Field>
              </div>

              <div className="flex-two-items-row">
                <div>
                  <label className={labelClasses}>
                    <FormattedMessage {...messages.country} />
                  </label>
                  <UserCountrySelect className={fieldClasses} isDisabled={submitting} />
                </div>
                {textInputFields.map((field) => (
                  <div key={field.name}>
                    <label className={labelClasses}>{field.label}</label>
                    <Field
                      name={field.name}
                      component="input"
                      type="text"
                      validate={composeValidators(isUrl)}
                      parse={(value) => (!value.trim() ? '' : value)}
                    >
                      {({ input, meta }) => (
                        <div>
                          <input {...input} type="text" className={fieldClasses} />
                          {meta.error && meta.touched && (
                            <div className="mt1 red">{meta.error}</div>
                          )}
                        </div>
                      )}
                    </Field>
                  </div>
                ))}
              </div>
              <div className="cf w-100">
                <label className={labelClasses}>
                  <FormattedMessage {...messages.gender} />
                  <InfoIcon
                    className="blue-grey h1 w1 v-mid pb1 ml2"
                    data-tip={intl.formatMessage(messages.genderPrivacy)}
                  />
                  <ReactTooltip place="bottom" className="mw6" effect="solid" />
                </label>
                {genderOptions.map((option) => (
                  <div className="pv2" key={option.value}>
                    <RadioField name="gender" value={option.value} />
                    {option.label}
                  </div>
                ))}
                <Field name="gender" subscription={{ value: true }}>
                  {({ input: { value } }) =>
                    value === 'SELF_DESCRIBE' && (
                      <Field
                        name="selfDescriptionGender"
                        component="input"
                        type="text"
                        className={fieldClasses}
                        required
                      />
                    )
                  }
                </Field>
              </div>
              <div className="pt2">
                <FormSubmitButton
                  disabled={pristine || hasValidationErrors}
                  className="bg-blue-dark white mh1 mv2"
                  disabledClassName="bg-grey-light white mh1 mv2"
                  loading={submitting}
                >
                  <FormattedMessage {...messages.save} />
                </FormSubmitButton>
              </div>
              <p className="f6 mt2 tr mb0">
                <RequiredIndicator /> <FormattedMessage {...messages.required} />
              </p>
            </fieldset>
          </form>
        )}
      ></Form>
    </div>
  );
}

export const PersonalInformationForm = connect(mapStateToProps, { pushUserDetails })(
  _PersonalInformationForm,
);
