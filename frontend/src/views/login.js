import React from 'react';
import { useSelector } from 'react-redux';
import { Redirect } from '@reach/router';
import { FormattedMessage } from 'react-intl';

import { AuthButtons } from '../components/header';
import messages from './messages';
import { useSetTitleTag } from '../hooks/UseMetaTags';
import { ORG_LOGO, ORG_NAME, ORG_CODE } from '../config';
import logo from '../assets/img/main-logo.svg';

export function Login({ redirectTo }: Object) {
  useSetTitleTag('Login');
  const userIsloggedIn = useSelector((state) => state.auth.get('token'));
  if (!userIsloggedIn) {
    return (
      <div className="cf w-100 bg-white blue-dark pv5">
        <div className="cf w-100 tc">
          <img src={ORG_LOGO || logo} alt={`${ORG_NAME} logo`} className="h3 v-mid pb3" />
        </div>
        <h3 className="f2 fw6 barlow-condensed tc mt3">
          <FormattedMessage {...messages.loginRequired} values={{ org: ORG_CODE }} />
        </h3>
        <div className="cf w-100 tc">
          <p className="lh-solid mv1">
            <FormattedMessage {...messages.loginWithOSM} />
          </p>
          <p className="lh-solid mv2">
            <FormattedMessage {...messages.createAccount} />
          </p>
        </div>
        <div className="tc pv4">
          <AuthButtons
            logInStyle="blue-dark bg-white"
            signUpStyle="bg-blue-dark white ml1 v-mid"
            redirectTo={redirectTo || '/welcome'}
            alternativeSignUpText={true}
          />
        </div>
      </div>
    );
  } else {
    return <Redirect to={redirectTo || '/welcome'} noThrow />;
  }
}
