import React, { useState, useEffect } from 'react';
import { FormattedMessage, FormattedRelative } from 'react-intl';
import { useSelector } from 'react-redux';
import Popup from 'reactjs-popup';
import { useQueryParam, NumberParam, StringParam } from 'use-query-params';
import ReactPlaceholder from 'react-placeholder';

import messages from './messages';
import { TaskActivity } from './taskActivity';
import { compareTaskId, compareLastUpdate } from '../../utils/sorting';
import { userCanValidate } from '../../utils/projectPermissions';
import { TASK_COLOURS } from '../../config';
import { LockIcon, ListIcon, EyeIcon, CloseIcon } from '../svgIcons';
import { PaginatorLine, howManyPages } from '../paginator';
import { Dropdown } from '../dropdown';
import { Button } from '../button';

export function TaskStatus({ status, lockHolder }: Object) {
  const dotSize = ['READY', 'LOCKED_FOR_MAPPING'].includes(status) ? '0.875rem' : '1rem';
  return (
    <span>
      <span
        className={`${['READY', 'LOCKED_FOR_MAPPING'].includes(status) &&
          'ba bw1 b--grey-light'} dib v-mid`}
        style={{
          height: dotSize,
          width: dotSize,
          backgroundColor: TASK_COLOURS[status],
        }}
      ></span>
      {status.startsWith('LOCKED_FOR_') && (
        <LockIcon style={{ paddingTop: '1px' }} className="v-mid pl1 h1 w1" />
      )}
      <span className="pl2 v-mid">
        {status.startsWith('LOCKED_FOR_') && lockHolder ? (
          <FormattedMessage
            {...messages.lockedBy}
            values={{
              user: lockHolder,
              lockStatus: <FormattedMessage {...messages[`taskStatus_${status}`]} />,
            }}
          />
        ) : (
          <FormattedMessage {...messages[`taskStatus_${status}`]} />
        )}
      </span>
    </span>
  );
}

function TaskItem({ data, projectId, selectTask, selected = [], projectName }: Object) {
  return (
    <div
      className={`cf db ba br1 mt2 ${
        selected.includes(data.taskId) ? 'b--blue-dark bw1' : 'b--tan bw1'
      }`}
    >
      <div
        className="w-90-l w-80 pv3 fl cf pointer"
        onClick={() => selectTask(data.taskId, data.taskStatus)}
      >
        <div className="w-75-l w-40 fl dib truncate">
          <span className="pl3 b">
            <FormattedMessage {...messages.taskId} values={{ id: data.taskId }} />
          </span>
          {data.actionDate && (
            <div className="dn di-l">
              <span className="ph2 blue-grey">&#183;</span>
              <span className="blue-grey">
                <FormattedMessage
                  {...messages.taskLastUpdate}
                  values={{ user: <span className="b blue-grey">{data.actionBy}</span> }}
                />{' '}
                <FormattedRelative value={data.actionDate} />
              </span>
            </div>
          )}
        </div>
        <div className="w-25-l w-60 fl blue-grey dib truncate">
          <TaskStatus status={data.taskStatus} />
        </div>
      </div>
      <div className="w-10-l w-20 pv3 fl dib blue-light">
        <div className="dib v-mid">
          <Popup
            trigger={<ListIcon width="18px" height="18px" className="pointer hover-blue-grey" />}
            modal
            closeOnDocumentClick
          >
            {close => (
              <TaskActivity
                taskId={data.taskId}
                projectName={projectName}
                projectId={projectId}
                close={close}
              />
            )}
          </Popup>
        </div>
        <div className="pl2 dib v-mid">
          <EyeIcon width="18px" height="18px" className="pointer hover-blue-grey" />
        </div>
      </div>
    </div>
  );
}

export function TaskFilter({ project, statusFilter, setStatusFn }: Object) {
  const user = useSelector(state => state.auth.get('userDetails'));
  const validationIsPossible = user && project ? userCanValidate(user, project) : false;
  const activeClass = 'bg-blue-grey white';
  const inactiveClass = 'bg-white blue-grey';

  if (user.isExpert || user.mappingLevel !== 'BEGINNER') {
    return (
      <div className="pt1">
        <Button
          onClick={() => setStatusFn('all')}
          className={`dbi ${!statusFilter || statusFilter === 'all' ? activeClass : inactiveClass}`}
        >
          <FormattedMessage {...messages.filterAll} />
        </Button>
        <Button
          onClick={() => setStatusFn('readyToMap')}
          className={`dbi ${statusFilter === 'readyToMap' ? activeClass : inactiveClass}`}
        >
          <FormattedMessage {...messages.filterReadyToMap} />
        </Button>
        {validationIsPossible && (
          <Button
            onClick={() => setStatusFn('readyToValidate')}
            className={`dbi ${statusFilter === 'readyToValidate' ? activeClass : inactiveClass}`}
          >
            <FormattedMessage {...messages.filterReadyToValidate} />
          </Button>
        )}
      </div>
    );
  }
  return <></>;
}

export function TaskList({ project, tasks, activeFilter, selectTask, selected }: Object) {
  const user = useSelector(state => state.auth.get('userDetails'));
  const [readyTasks, setTasks] = useState([]);
  const [textSearch, setTextSearch] = useQueryParam('search', StringParam);
  const [sortBy, setSortingOption] = useQueryParam('sortBy', StringParam);
  const [statusFilter, setStatusFilter] = useQueryParam('filter', StringParam);

  useEffect(() => {
    if (tasks && tasks.activity) {
      let newTasks = tasks.activity;
      if (statusFilter === 'readyToMap') {
        newTasks = newTasks.filter(task => ['READY', 'INVALIDATED'].includes(task.taskStatus));
      }
      if (statusFilter === 'readyToValidate') {
        newTasks = newTasks.filter(task => ['MAPPED', 'BADIMAGERY'].includes(task.taskStatus));
      }
      if (textSearch) {
        newTasks = newTasks.filter(
          task =>
            task.taskId === Number(textSearch) ||
            (task.actionBy && task.actionBy.includes(textSearch)),
        );
      }
      setTasks(newTasks);
    }
  }, [textSearch, statusFilter, tasks]);

  function updateSortingOption(data: Object) {
    if (data) {
      setSortingOption(data[0].value);
    }
  }

  const sortingOptions = [
    { label: <FormattedMessage {...messages.sortById} />, value: 'id' },
    { label: <FormattedMessage {...messages.sortByLastUpdate} />, value: 'date' },
  ];

  return (
    <div className="cf">
      <div className="cf">
        {user.isExpert && (
          <div>
            <div className="w-50-l w-100 dib v-mid pr2 pv1 relative">
              <input
                type="text"
                placeholder="Filter tasks by id or username"
                className="pa2 w-100"
                value={textSearch || ''}
                onChange={e => setTextSearch(e.target.value)}
              />
              <CloseIcon
                onClick={() => {
                  setTextSearch('');
                }}
                className={`absolute w1 h1 top-0 red pt3 pointer pr3 right-0 ${
                  textSearch ? 'dib' : 'dn'
                }`}
              />
            </div>
            <div className="w-50-l w-100 dib pv1">
              <Dropdown
                onAdd={() => {}}
                onRemove={() => {}}
                onChange={updateSortingOption}
                value={sortBy || 'date'}
                options={sortingOptions}
                display={sortBy || <FormattedMessage {...messages.sortById} />}
                className="blue-dark bg-white mr1 v-mid pv2 ph2 ba b--grey-light"
              />
            </div>
          </div>
        )}
        <TaskFilter project={project} statusFilter={statusFilter} setStatusFn={setStatusFilter} />
      </div>
      <ReactPlaceholder
        showLoadingAnimation={true}
        rows={6}
        delay={50}
        ready={tasks && tasks.activity && tasks.activity.length}
      >
        {readyTasks && (
          <PaginatedList
            pageSize={6}
            items={
              sortBy === 'date'
                ? readyTasks.sort(compareLastUpdate)
                : readyTasks.sort(compareTaskId)
            }
            ItemComponent={TaskItem}
            selected={selected}
            selectTask={selectTask}
            projectId={project.projectId}
            projectName={project.projectInfo.name}
          />
        )}
      </ReactPlaceholder>
    </div>
  );
}

function PaginatedList({
  items,
  ItemComponent,
  pageSize,
  projectId,
  selectTask,
  selected,
  projectName,
}: Object) {
  const [page, setPage] = useQueryParam('page', NumberParam);
  const lastPage = howManyPages(items.length, pageSize);
  // change page to 1 if the page number is not valid
  if (items && page > lastPage) {
    setPage(1);
  }
  return (
    <>
      <div>
        {(!items || !items.length) && (
          <div className="tc mt5 mb3">
            <FormattedMessage {...messages.noTasksFound} />
          </div>
        )}
        {items.slice(pageSize * ((page || 1) - 1), pageSize * (page || 1)).map((item, n) => (
          <ItemComponent
            key={n}
            data={item}
            projectId={projectId}
            selectTask={selectTask}
            selected={selected}
            projectName={projectName}
          />
        ))}
      </div>
      <div className="fr">
        <PaginatorLine
          activePage={page || 1}
          setPageFn={setPage}
          lastPage={lastPage}
          className="flex items-center pt2"
        />
      </div>
    </>
  );
}
