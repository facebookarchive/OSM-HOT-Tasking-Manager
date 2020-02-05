import React from 'react';
import { FormattedMessage } from 'react-intl';

import messages from '../user/messages';
import { TwitterIconNoBg, FacebookIcon, LinkedinIcon } from '../svgIcons';
import { MappingLevelMessage } from '../mappingLevel';
import { NextMappingLevel } from '../user/settings';
import { SectionMenu } from '../menu';

const SocialMedia = ({ data }) => {
  const socialMediaItems = ['twitterId', 'facebookId', 'linkedinId'];

  const getSocialIcon = field => {
    const iconStyle = {
      width: '1.4em',
      height: '1.4em',
    };

    switch (field) {
      case 'twitterId':
        return <TwitterIconNoBg style={iconStyle} className="light-blue v-mid" />;
      case 'facebookId':
        return <FacebookIcon style={iconStyle} className="dark-blue v-mid" />;
      case 'linkedinId':
        return <LinkedinIcon style={iconStyle} className="blue v-mid" />;
      default:
        return null;
    }
  };

  const createLink = (field, value) => {
    const aClass = 'blue-grey no-underline';
    let url = null;
    switch (field) {
      case 'twitterId':
        url = 'https://www.twitter.com/' + value;
        break;
      case 'facebookId':
        url = 'https://www.facebook.com/' + value;
        break;
      case 'linkedinId':
        url = 'https://www.linkedin.com/' + value;
        break;
      default:
        return null;
    }

    return (
      <a className={aClass} rel="noopener noreferrer" target="_blank" href={url}>
        {value}
      </a>
    );
  };

  return (
    <ul className="list pa0">
      {socialMediaItems.map(i => {
        if (data[i] === null) {
          return null;
        }

        return (
          <li key={i} className="dib mr4-ns mr2 cf f7">
            <div className="mr2 h2">
              {getSocialIcon(i)} {createLink(i, data[i])}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const MyContributionsNav = ({ username, authUser }) => {
  const items = [
    { url: `/users/${username}`, label: <FormattedMessage {...messages.myStats} /> },
    { url: '/manage/projects', label: <FormattedMessage {...messages.myProjects} /> },
    { url: '/contributions', label: <FormattedMessage {...messages.myContribs} /> },
  ];

  return (
    <div className="fr">
      <SectionMenu items={items} />
    </div>
  );
};

export const HeaderProfile = ({ user, username, authUser }) => {
  const details = user.details.read();
  const osm = user.osmDetails.read();

  const avatarClass = 'h4 w4 br-100 pa1 ba b--grey-light bw3 red';
  return (
    <div>
      {username === authUser ? <MyContributionsNav username={username} /> : null}
      <div className="w-100 h-100 cf pt3">
        <div className="fl dib mr3">
          {details.pictureUrl ? (
            <img className={avatarClass} src={details.pictureUrl} alt={'hey'} />
          ) : (
            <div className={avatarClass + ' bg-light-gray ma1'}></div>
          )}
        </div>
        <div className="pl2 dib">
          <div className="mb4">
            <p className="barlow-condensed f2 ttu b ma0 mb2">{details.name || details.username}</p>
            <p className="f4 ma0 mb2">
              <FormattedMessage
                {...messages.mapper}
                values={{
                  level: <MappingLevelMessage level={details.mappingLevel} />,
                }}
              />
            </p>
            <NextMappingLevel changesetsCount={osm.changesetsCount} />
          </div>
          <SocialMedia data={details} />
        </div>
      </div>
    </div>
  );
};
