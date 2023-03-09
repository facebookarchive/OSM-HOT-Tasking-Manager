import React from 'react';
import humanizeDuration from 'humanize-duration';
import ReactTooltip from 'react-tooltip';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import {
  ClockIcon,
  RoadIcon,
  HomeIcon,
  WavesIcon,
  MarkerIcon,
  QuestionCircleIcon,
  MappedIcon,
  ValidatedIcon,
} from '../svgIcons';
import { StatsCard } from '../statsCard';

export const TaskStats = ({ userStats, username }) => {
  const {
    tasksMapped,
    tasksValidatedByOthers,
    tasksInvalidatedByOthers,
    tasksValidated,
    tasksInvalidated,
  } = userStats;
  const taskStats = [
    {
      icon: <MappedIcon className="v-mid h-100 w-50-ns w-25" />,
      title: messages.userMapped,
      items: [
        {
          label: messages.tasks,
          value: tasksMapped,
        },
        {
          label: messages.validated,
          value: tasksValidatedByOthers,
        },
        {
          label: messages.invalidated,
          value: tasksInvalidatedByOthers,
        },
      ],
    },
    {
      icon: <ValidatedIcon className="v-mid h-100 w-30-ns w-25" />,
      title: messages.userValidated,
      items: [
        {
          label: messages.tasks,
          value: tasksValidated + tasksInvalidated || 0,
        },
        {
          label: messages.finished,
          value: tasksValidated,
        },
        {
          label: messages.invalidated,
          value: tasksInvalidated,
        },
      ],
    },
  ];

  return (
    <div className="relative base-font blue-grey task-stats-ctr">
      {taskStats.map((stat, index) => (
        <article
          key={index}
          className="shadow-6 pv3 ph2 bg-white flex flex-column flex-row-ns items-center"
        >
          <div className="w-75 w-25-ns h-100 pa2 pa0-m primary tc">{stat.icon}</div>
          <div className="w-75 mt3 tc f6 b">
            <div className=" w-100">
              <p className="mb1 mt3 mt1-ns f3 fw6" style={{ letterSpacing: '1.25px' }}>
                <FormattedMessage
                  {...stat.title}
                  values={{ user: username ? username : <FormattedMessage {...messages.you} /> }}
                />
              </p>
              <hr className="w-50" />
            </div>
            <div className="w-100 pt4 flex">
              {stat.items.map((item, index) => (
                <div key={index} className=" w-33 tc">
                  <p className="ma0 mb0 barlow-condensed f2 fw5 primary">{item.value}</p>
                  <p className="mb3 ttl fw6">
                    <FormattedMessage {...item.label} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'm',
      s: () => 's',
      ms: () => 'ms',
    },
  },
});

export const ElementsMapped = ({ userStats, osmStats }) => {
  const duration = shortEnglishHumanizer(userStats.timeSpentMapping * 1000, {
    round: true,
    delimiter: ' ',
    units: ['h', 'm'],
    spacer: '',
  });

  const iconClass = 'h-50 w-50';
  const iconStyle = { height: '45px' };

  return (
    <div>
      <div className="w-100 relative stats-cards-container">
        <StatsCard
          invertColors={true}
          icon={<ClockIcon className={iconClass} style={iconStyle} />}
          description={<FormattedMessage {...messages.timeSpentMapping} />}
          value={duration}
        />
        <StatsCard
          icon={<HomeIcon className={iconClass} style={iconStyle} />}
          description={<FormattedMessage {...messages.buildingsMapped} />}
          value={osmStats.total_building_count_add || 0}
        />
        <StatsCard
          icon={<RoadIcon className={iconClass} style={iconStyle} />}
          description={<FormattedMessage {...messages.roadMapped} />}
          value={osmStats.total_road_km_add || 0}
        />
        <StatsCard
          icon={<MarkerIcon className={iconClass} style={iconStyle} />}
          description={<FormattedMessage {...messages.poiMapped} />}
          value={osmStats.total_poi_count_add || 0}
        />
        <StatsCard
          icon={<WavesIcon className={iconClass} style={iconStyle} />}
          description={<FormattedMessage {...messages.waterwaysMapped} />}
          value={osmStats.total_waterway_km_add || 0}
        />
      </div>
      <div className="cf w-100 relative tr pt3 pr3">
        <FormattedMessage {...messages.delayPopup}>
          {(msg) => (
            <QuestionCircleIcon
              className="pointer dib v-mid pl2 pb1 blue-light"
              height="1.25rem"
              data-tip={msg}
            />
          )}
        </FormattedMessage>
        <ReactTooltip />
      </div>
    </div>
  );
};
