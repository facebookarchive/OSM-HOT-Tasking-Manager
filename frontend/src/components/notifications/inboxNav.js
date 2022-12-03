import React from 'react';
import { Link } from '@reach/router';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import contributionsMessages from '../contributions/messages';
import { useInboxQueryParams, stringify } from '../../hooks/UseInboxQueryAPI';

import { ProjectSearchBox } from '../projects/projectSearchBox';
import { NotificationOrderBySelector } from './notificationOrderBy';

const isActiveButton = (buttonName, projectQuery) => {
  const allBoolean = projectQuery.types === undefined;
  if (
    JSON.stringify(projectQuery['types']) === JSON.stringify(buttonName) ||
    (buttonName === 'All' && allBoolean)
  ) {
    return 'bg-blue-dark grey-light';
  } else {
    return 'bg-white blue-grey';
  }
};

export const InboxNavMini = (props) => {
  return (
    /* mb1 mb2-ns (removed for map, but now small gap for more-filters) */
    <header className="">
      <div className="cf">
        <div className="w-100 fl">
          <h3 className="fl f4 barlow-condensed fw8">
            <FormattedMessage {...messages.notifications} />
          </h3>
          {props.newMsgCount > 0 && (
            <Link
              to="/inbox?orderBy=read&orderByType=DESC"
              onClick={(e) => {
                props.setPopoutFocus(false);
              }}
            >
              <div className="dib fr br2 core-font b--white ba bg-primary grey-light f7 mv3 pa2">
                {props.newMsgCount === 1 ? (
                  <FormattedMessage {...messages.oneNewNotification} />
                ) : (
                  <FormattedMessage
                    {...messages.newNotifications}
                    values={{ n: props.newMsgCount }}
                  />
                )}
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
export const InboxNavMiniBottom = (props) => {
  return (
    /* mb1 mb2-ns (removed for map, but now small gap for more-filters) */
    <footer className={`relative h2 w-100 ${props.className || ''}`}>
      <Link
        className="absolute hover-darken tc pv2 w-100 b--grey-light ba bg-primary white f6 no-underline"
        to="/inbox"
        onClick={(e) => {
          props.setPopoutFocus(false);
        }}
      >
        {props.msgCount ? (
          <FormattedMessage {...messages.viewAll} />
        ) : (
          <FormattedMessage {...messages.goToNotifications} />
        )}
      </Link>
    </footer>
  );
};

export const InboxNav = (props) => {
  const [inboxQuery, setInboxQuery] = useInboxQueryParams();

  const linkCombo = 'link ph3 f6 pv2 ba b--grey-light';
  const notAnyFilter = !stringify(inboxQuery);
  return (
    <header className=" w-100 ">
      <div className="cf">
        <div className="w-75-l w-60 fl">
          <h3 className="mb2 f2 ttu barlow-condensed fw8">
            <FormattedMessage {...messages.notifications} />
          </h3>
        </div>
      </div>
      <div className="mt2 mb1 dib lh-copy w-100 cf">
        <div className="w-100 fl dib">
          <div className="dib">
            <div className="mv2 dib"></div>
            <FormattedMessage {...contributionsMessages.searchProject}>
              {(msg) => {
                return (
                  <ProjectSearchBox
                    className="dib fl mh1"
                    setQuery={setInboxQuery}
                    fullProjectsQuery={inboxQuery}
                    placeholder={msg}
                    searchField={'project'}
                  />
                );
              }}
            </FormattedMessage>
            <NotificationOrderBySelector
              className={`mt1 mt2-ns`}
              setQuery={setInboxQuery}
              allQueryParams={inboxQuery}
            />
            {!notAnyFilter && (
              <Link to="./" className="primary link ph3 f6 v-mid pv2 mh1 mt1 mt2-ns dib">
                <FormattedMessage {...messages.clearFilters} />
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="mv2">
        <Link
          to="?orderBy=date&orderByType=desc&page=1&pageSize=10"
          className={`di di-m mh1 ${isActiveButton('All', inboxQuery)} ${linkCombo}`}
        >
          <FormattedMessage {...messages.all} />
        </Link>
        <Link
          to="?orderBy=date&orderByType=desc&page=1&pageSize=10&types=3,1,6,7"
          className={`di di-m mh1 ${isActiveButton(
            ['3', '1', '6', '7'],
            inboxQuery,
          )}  ${linkCombo}`}
        >
          <FormattedMessage {...messages.messages} />
        </Link>
        <Link
          to="?orderBy=date&orderByType=desc&page=1&pageSize=10&types=2,9,10"
          className={`di di-m mh1 ${isActiveButton(['2', '9', '10'], inboxQuery)}  ${linkCombo} `}
        >
          <FormattedMessage {...messages.projects} />
        </Link>
        <Link
          to={'?orderBy=date&orderByType=desc&page=1&pageSize=10&types=8,4,5'}
          className={`di di-m mh1 ${isActiveButton(['8', '4', '5'], inboxQuery)}  ${linkCombo} `}
        >
          <FormattedMessage {...messages.tasks} />
        </Link>
        <Link
          to={'?orderBy=date&orderByType=desc&page=1&pageSize=10&types=6,7,11'}
          className={`di di-m mh1 ${isActiveButton(['6', '7', '11'], inboxQuery)}  ${linkCombo} `}
        >
          <FormattedMessage {...messages.teams} />
        </Link>
      </div>
      {props.children}
    </header>
  );
};
