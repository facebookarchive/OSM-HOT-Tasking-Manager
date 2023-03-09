import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ReduxIntlProviders } from '../../../utils/testWithIntl';
import { AuthButtons } from '../index';

describe('AuthButtons', () => {
  it('without alternativeSignUpText', () => {
    render(
      <ReduxIntlProviders>
        <AuthButtons
          logInStyle="blue-dark bg-white"
          signUpStyle="bg-blue-dark white ml1 v-mid"
          redirectTo={'/welcome'}
        />
      </ReduxIntlProviders>,
    );
    expect(screen.getByText('Log in').className).toContain('blue-dark bg-white');
    expect(screen.getByText('Sign up').className).toContain('bg-blue-dark white ml1 v-mid');
    expect(screen.queryByText('Create an account')).not.toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Sign up'));
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
  it('with alternativeSignUpText', () => {
    render(
      <ReduxIntlProviders>
        <AuthButtons
          logInStyle="white bg-primary"
          signUpStyle="bg-orange black ml1 v-mid"
          redirectTo={'/welcome'}
          alternativeSignUpText={true}
        />
      </ReduxIntlProviders>,
    );
    expect(screen.getByText('Log in').className).toContain('white bg-primary');
    expect(screen.getByText('Create an account').className).toContain('bg-orange black ml1 v-mid');
    expect(screen.queryByText('Sign up')).not.toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Create an account'));
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});
