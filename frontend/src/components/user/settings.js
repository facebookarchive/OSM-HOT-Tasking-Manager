import React from 'react';
import { useSelector } from 'react-redux';

import { UserAvatar } from './avatar';
import { MappingLevelMessage } from "../mappingLevel";





export function UserTopBar() {
  const userDetails = useSelector(state => state.auth.get('userDetails'));
  return (
    <div className="cf ph4">
      <div className="w-100 w-70-l fl">
        <div className="fl dib pr3">
          <UserAvatar className="suh4 br-100" />
        </div>
        <div className="pl2">
          <h3>{userDetails.username}</h3>
          <p>
            <MappingLevelMessage level={userDetails.mappingLevel} className="f4" />
          </p>
        </div>

      </div>
      <div className="w-100 w-30-l fl">

      </div>
    </div>
  );
}
