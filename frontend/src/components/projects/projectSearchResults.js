import React from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage, FormattedNumber } from 'react-intl';
import ReactPlaceholder from 'react-placeholder';
import 'react-placeholder/lib/reactPlaceholder.css';

import { nCardPlaceholders } from '../projectCard/nCardPlaceholder';
import { ProjectCard } from '../projectCard/projectCard';
import messages from './messages';
import { ProjectListItem } from './list';

export const ProjectSearchResults = (props) => {
  const listViewIsActive = useSelector((state) => state.preferences['projectListView']);
  const state = props.state;
  const cardWidthClass = 'w-third-l';

  return (
    <div className={`${props.className}`}>
      <p className={`blue-grey f7`}>
        {state.isLoading ? (
          <span>&nbsp;</span>
        ) : (
          !state.isError && (
            <FormattedMessage
              {...messages.paginationCount}
              values={{
                number: state.projects && state.projects.length,
                total: <FormattedNumber value={state.pagination ? state.pagination.total : 0} />,
              }}
            />
          )
        )}
      </p>
      {state.isError ? (
        <div className="bg-tan pa4">
          <FormattedMessage
            {...messages.errorLoadingTheXForY}
            values={{
              xWord: <FormattedMessage {...messages.projects} />,
              yWord: 'Explore Projects',
            }}
          />
          <div className="pa2">
            <button className="pa1" onClick={() => props.retryFn()}>
              <FormattedMessage {...messages.retry} />
            </button>
          </div>
        </div>
      ) : null}
      <div className="cf db">
        {props.management && listViewIsActive ? (
          <ReactPlaceholder
            showLoadingAnimation={true}
            rows={15}
            delay={50}
            ready={!state.isLoading}
          >
            <div className="mh2">
              <ExploreProjectList pageOfCards={state.projects} cardWidthClass={cardWidthClass} />
            </div>
          </ReactPlaceholder>
        ) : (
          <ReactPlaceholder
            customPlaceholder={nCardPlaceholders(5, cardWidthClass)}
            ready={!state.isLoading}
          >
            <ExploreProjectCards
              pageOfCards={state.projects}
              cardWidthClass={cardWidthClass}
              showBottomButtons={props.showBottomButtons}
            />
          </ReactPlaceholder>
        )}
      </div>
    </div>
  );
};

const ExploreProjectCards = (props) => {
  if (props.pageOfCards && props.pageOfCards.length === 0) {
    return null;
  }
  /* cardWidthClass={props.cardWidthClass} as a parameter offers more variability in the size of the cards, set to 'cardWidthNone' disables */
  return props.pageOfCards.map((card, n) => (
    <ProjectCard
      cardWidthClass={props.cardWidthClass}
      {...card}
      key={n}
      showBottomButtons={props.showBottomButtons}
    />
  ));
};

const ExploreProjectList = (props) => {
  if (props.pageOfCards && props.pageOfCards.length === 0) {
    return null;
  }
  /* cardWidthClass={props.cardWidthClass} as a parameter offers more variability in the size of the cards, set to 'cardWidthNone' disables */
  return props.pageOfCards.map((project, n) => <ProjectListItem project={project} key={n} />);
};
