import React from 'react';
import { useSelector } from 'react-redux'
import { redirectTo } from "@reach/router";

import { UserTopBar } from '../components/user/settings';


export function Welcome() {
  const userIsloggedIn = useSelector(state => state.auth.get('token'));
  if (userIsloggedIn) {
    return(
      <div className="pull-center">
        <UserTopBar />
      </div>
    );
  } else {
    redirectTo('login');
  }
}
