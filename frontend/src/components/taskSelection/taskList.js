import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '@reach/router';
import Popup from 'reactjs-popup';
import { useQueryParam, NumberParam, StringParam } from 'use-query-params';
import ReactPlaceholder from 'react-placeholder';
import bbox from '@turf/bbox';
import { useCopyClipboard } from '@lokibai/react-use-copy-clipboard';
import { FormattedMessage } from 'react-intl';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import { Button } from '../button';
import { UserAvatar, UserAvatarList, UserAvatarButton } from '../user/avatar';
import messages from './messages';
import { RelativeTimeWithUnit } from '../../utils/formattedRelativeTime';
import { TaskActivity } from './taskActivity';
import { compareTaskId, compareLastUpdate } from '../../utils/sorting';
import { TASK_COLOURS } from '../../config';
import {
  LockIcon,
  ListIcon,
  ZoomPlusIcon,
  CloseIcon,
  InternalLinkIcon,
  ProfilePictureIcon,
} from '../svgIcons';
import { PaginatorLine, howManyPages } from '../paginator';
import { Dropdown } from '../dropdown';
import { CustomButton } from '../button';
import { pushToLocalJSONAPI } from '../../network/genericJSONRequest';
export function TaskStatus({ status, lockHolder }: Object) {
  const isReadyOrLockedForMapping = ['READY', 'LOCKED_FOR_MAPPING'].includes(status);
  const dotSize = isReadyOrLockedForMapping ? '0.875rem' : '1rem';
  const isLockedStatus = ['LOCKED_FOR_VALIDATION', 'LOCKED_FOR_MAPPING'].includes(status);
  return (
    <>
      <span
        className={`${isReadyOrLockedForMapping ? 'ba bw1 b--grey-light' : ''} dib v-mid`}
        style={{
          height: dotSize,
          width: dotSize,
          backgroundColor: TASK_COLOURS[status],
        }}
      ></span>
      {isLockedStatus && <LockIcon style={{ paddingTop: '1px' }} className="v-mid pl1 h1 w1" />}
      <span className="pl2 v-mid">
        {isLockedStatus && lockHolder ? (
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
    </>
  );
}

function TaskItem({
  data,
  project,
  users,
  setZoomedTaskId,
  setActiveTaskModal,
  selectTask,
  selected = [],
}: Object) {
  const [isCopied, setCopied] = useCopyClipboard();
  const location = useLocation();
  const token = useSelector((state) => state.auth.get('token'));
  const [selectedOption, setSelectedOption] = useState(null);
  const [assignTaskStatus, setAssignTaskStatus] = useState(null);
  const [assignTaskStatusError, setAssignTaskStatusError] = useState(null);
  const [unAssignTaskStatus, setUnAssignTaskStatus] = useState(null);
  const [unAssignTaskStatusError, setUnAssignTaskStatusError] = useState(null);
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const userName = userDetails.username;
  const userid = userDetails.id;
  //console.log('user details are', userDetails);
  let selectItems = [];
  if (users) {
    for (var i = 0; i < users.length; i++) {
      var obj = {};
      obj.value = users[i].id;
      obj.label = users[i].username;
      selectItems.push(obj);
    }
  }

  const assignUser = () => {
    let tasksAssign = [];
    tasksAssign.push(data.taskId);
    let assignParams = {
      taskIds: tasksAssign,
    };

    if (selectedOption) {
      let userLabel = selectedOption.label;
      pushToLocalJSONAPI(
        `project/${project.projectId}/assign/?username=${userLabel}`,
        JSON.stringify(assignParams),
        token,
      )
        .then((res) => {
          setAssignTaskStatus('Task is Assigned successfully');
          setAssignTaskStatusError('');
          setUnAssignTaskStatus('');
          setUnAssignTaskStatusError('');
        })
        .catch((e) => {
          if (e.message === 'FORBIDDEN') {
            setAssignTaskStatusError('This taks is already assigned');
            setAssignTaskStatus('');
            setUnAssignTaskStatus('');
            setUnAssignTaskStatusError('');
          } else {
            setAssignTaskStatusError('Some error has occured');
            setAssignTaskStatus('');
            setUnAssignTaskStatus('');
            setUnAssignTaskStatusError('');
          }
        });
    }
  };
  function formatName(userName) {
    //  return user.firstName + ' ' + user.lastName;
    return userName.substr(0, 1);
  }

  const unAssignUser = () => {
    let tasksAssign = [];
    tasksAssign.push(data.taskId);
    let assignParams = {
      taskIds: tasksAssign,
    };
    pushToLocalJSONAPI(
      `project/${project.projectId}/unassign/`,
      JSON.stringify(assignParams),
      token,
    )
      .then((res) => {
        setAssignTaskStatus('');
        setAssignTaskStatusError('');
        setUnAssignTaskStatus('Task is UnAssigned successfully');
        setUnAssignTaskStatusError('');
      })
      .catch((e) => {
        setAssignTaskStatus('');
        setAssignTaskStatusError('');
        setUnAssignTaskStatus('');
        setUnAssignTaskStatusError('Some error has occured');
      });
  };
  return (
    <div
      className={`cf db ba br1 mt2 ${
        selected.includes(data.taskId) ? 'b--blue-dark bw1' : 'b--tan bw1'
      }`}
    >
      <div
        className="w-80 pv3 fl cf pointer"
        onClick={() => selectTask(data.taskId, data.taskStatus)}
      >
        <div className="w-70-l w-40 fl dib truncate">
          <span className="pl3 b">
            <FormattedMessage {...messages.taskId} values={{ id: data.taskId }} />
          </span>
          {data.actionDate && (
            <div title={data.actionDate} className="dn di-l">
              <span className="ph2 blue-grey">&#183;</span>
              <span className="blue-grey">
                <FormattedMessage
                  {...messages.taskLastUpdate}
                  values={{ user: <span className="b blue-grey">{data.actionBy}</span> }}
                />{' '}
                <RelativeTimeWithUnit date={data.actionDate} />
              </span>
            </div>
          )}
        </div>
        <div className="w-30-l w-60 fl blue-grey dib truncate">
          <TaskStatus status={data.taskStatus} />
        </div>
      </div>

      <div className="w-20 pv3 fr tr dib blue-light truncate overflow-empty">
        {data.assignedTo === userid ? (
          <FormattedMessage {...messages.taskassignment}>
            {(msg) => (
              <div className="pr2 dib v-mid" title={msg}>
                <Popup
                  trigger={
                    <button
                      type="button"
                      style={{
                        borderRadius: '100%',
                        marginLeft: '.25rem',
                        marginRight: '.25rem',
                        textAlign: 'center',
                        display: 'inline-block',
                        fontize: '.875rem',
                        height: '1.5rem',
                        width: '1.5rem',
                        verticalAlign: 'middle',
                        backgroundSize: 'cover',
                        borderColor: 'green',

                        backgroundImage: `url(${data.picture_url})`,
                      }}
                    >
                      <span>{data.picture_url ? '' : formatName(data.assignedUsername)}</span>
                    </button>
                  }
                  modal
                  position="top left"
                >
                  {(close) => (
                    <div>
                      <button className="close" onClick={close}>
                        &times;
                      </button>
                      <h3 className="assign-success">{assignTaskStatus} </h3>
                      <h3 className="assign-error">{assignTaskStatusError}</h3>
                      <h3 className="assign-success">{unAssignTaskStatus} </h3>
                      <h3 className="assign-error">{unAssignTaskStatusError}</h3>
                      <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                        <FormattedMessage {...messages.taskassignmentTitle} />
                        <b> {data.taskId}</b>
                        <FormattedMessage {...messages.taskassignmentTitle1} />
                      </h1>
                      <div style={{ textAlign: 'left' }}>
                        <FormattedMessage {...messages.taskassignment}>
                          {(msg) => {
                            return (
                              <Select
                                classNamePrefix={
                                  <FormattedMessage {...messages.taskassignmentselectListTitle} />
                                }
                                defaultValue={selectedOption}
                                onChange={setSelectedOption}
                                options={selectItems}
                              />
                            );
                          }}
                        </FormattedMessage>
                        <div>
                          <br />
                          <Button className="bg-red white bg-red-float" onClick={() => {}}>
                            <FormattedMessage {...messages.taskassignmentCancel} />
                          </Button>

                          <Button
                            className="bg-red white bg-red-float"
                            onClick={() => assignUser()}
                          >
                            <FormattedMessage {...messages.taskassignment} />
                          </Button>

                          <Button
                            className="bg-red white bg-red-float"
                            onClick={() => unAssignUser()}
                          >
                            <FormattedMessage {...messages.taskassignmentUnAssign} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Popup>
              </div>
            )}
          </FormattedMessage>
        ) : (
          <span>
            {data.assignedTo ? (
              <FormattedMessage {...messages.taskassignment}>
                {(msg) => (
                  <div className="pr2 dib v-mid" title={msg}>
                    <Popup
                      trigger={
                        <button
                          type="button"
                          style={{
                            borderRadius: '100%',
                            marginLeft: '.25rem',
                            marginRight: '.25rem',
                            textAlign: 'center',
                            display: 'inline-block',
                            fontize: '.875rem',
                            height: '1.5rem',
                            width: '1.5rem',
                            verticalAlign: 'middle',
                            backgroundSize: 'cover',
                            borderColor: 'black',

                            backgroundImage: `url(${data.picture_url})`,
                          }}
                        >
                          <span>{data.picture_url ? '' : formatName(data.assignedUsername)}</span>
                        </button>
                      }
                      modal
                      position="top left"
                    >
                      {(close) => (
                        <div>
                          <button className="close" onClick={close}>
                            &times;
                          </button>
                          <h3 className="assign-success">{assignTaskStatus} </h3>
                          <h3 className="assign-error">{assignTaskStatusError}</h3>
                          <h3 className="assign-success">{unAssignTaskStatus} </h3>
                          <h3 className="assign-error">{unAssignTaskStatusError}</h3>
                          <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                            <FormattedMessage {...messages.taskassignmentTitle} />
                            <b> {data.taskId}</b>
                            <FormattedMessage {...messages.taskassignmentTitle1} />
                          </h1>
                          <div style={{ textAlign: 'left' }}>
                            <FormattedMessage {...messages.taskassignment}>
                              {(msg) => {
                                return (
                                  <Select
                                    classNamePrefix={
                                      <FormattedMessage
                                        {...messages.taskassignmentselectListTitle}
                                      />
                                    }
                                    defaultValue={selectedOption}
                                    onChange={setSelectedOption}
                                    options={selectItems}
                                  />
                                );
                              }}
                            </FormattedMessage>
                            <div>
                              <br />
                              <Button className="bg-red white bg-red-float" onClick={() => {}}>
                                <FormattedMessage {...messages.taskassignmentCancel} />
                              </Button>

                              <Button
                                className="bg-red white bg-red-float"
                                onClick={() => assignUser()}
                              >
                                <FormattedMessage {...messages.taskassignment} />
                              </Button>

                              <Button
                                className="bg-red white bg-red-float"
                                onClick={() => unAssignUser()}
                              >
                                <FormattedMessage {...messages.taskassignmentUnAssign} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Popup>
                  </div>
                )}
              </FormattedMessage>
            ) : (
              <FormattedMessage {...messages.taskassignment}>
                {(msg) => (
                  <div className="pr2 dib v-mid" title={msg}>
                    <Popup
                      trigger={
                        <ProfilePictureIcon
                          width="18px"
                          height="18px"
                          className="pointer hover-blue-grey"
                        />
                      }
                      modal
                      position="top left"
                    >
                      {(close) => (
                        <div>
                          <button className="close" onClick={close}>
                            &times;
                          </button>
                          <h3 className="assign-success">{assignTaskStatus} </h3>
                          <h3 className="assign-error">{assignTaskStatusError}</h3>
                          <h3 className="assign-success">{unAssignTaskStatus} </h3>
                          <h3 className="assign-error">{unAssignTaskStatusError}</h3>
                          <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                            <FormattedMessage {...messages.taskassignmentTitle} />
                            <b> {data.taskId}</b>
                            <FormattedMessage {...messages.taskassignmentTitle1} />
                          </h1>
                          <div style={{ textAlign: 'left' }}>
                            <FormattedMessage {...messages.taskassignment}>
                              {(msg) => {
                                return (
                                  <Select
                                    classNamePrefix={
                                      <FormattedMessage
                                        {...messages.taskassignmentselectListTitle}
                                      />
                                    }
                                    defaultValue={selectedOption}
                                    onChange={setSelectedOption}
                                    options={selectItems}
                                  />
                                );
                              }}
                            </FormattedMessage>
                            <div>
                              <br />
                              <Button className="bg-red white bg-red-float" onClick={() => {}}>
                                <FormattedMessage {...messages.taskassignmentCancel} />
                              </Button>

                              <Button
                                className="bg-red white bg-red-float"
                                onClick={() => assignUser()}
                              >
                                <FormattedMessage {...messages.taskassignment} />
                              </Button>

                              <Button
                                className="bg-red white bg-red-float"
                                onClick={() => unAssignUser()}
                              >
                                <FormattedMessage {...messages.taskassignmentUnAssign} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Popup>
                  </div>
                )}
              </FormattedMessage>
            )}
          </span>
        )}

        <FormattedMessage {...messages.seeTaskHistory}>
          {(msg) => (
            <div className="pr2 dib v-mid" title={msg}>
              <ListIcon
                width="18px"
                height="18px"
                className="pointer hover-blue-grey"
                onClick={() => setActiveTaskModal(data.taskId)}
              />
            </div>
          )}
        </FormattedMessage>
        <FormattedMessage {...messages.zoomToTask}>
          {(msg) => (
            <div className="pl2 pr1 dib v-mid" title={msg}>
              <ZoomPlusIcon
                width="18px"
                height="18px"
                className="pointer hover-blue-grey"
                onClick={() => setZoomedTaskId(data.taskId)}
              />
            </div>
          )}
        </FormattedMessage>
        <FormattedMessage {...messages[isCopied ? 'taskLinkCopied' : 'copyTaskLink']}>
          {(msg) => (
            <div className={`ph2 dib v-mid ${isCopied ? 'grey-light' : ''}`} title={msg}>
              <InternalLinkIcon
                width="18px"
                height="18px"
                className={`pointer ${isCopied ? '' : 'hover-blue-grey'}`}
                onClick={() =>
                  setCopied(`${location.origin}${location.pathname}?search=${data.taskId}`)
                }
              />
            </div>
          )}
        </FormattedMessage>
      </div>
    </div>
  );
}

export function TaskFilter({ userCanValidate, statusFilter, setStatusFn }: Object) {
  const activeClass = 'bg-blue-grey white';
  const inactiveClass = 'bg-white blue-grey';

  return (
    <div className="pv1">
      <CustomButton
        onClick={() => setStatusFn('all')}
        className={`dbi bn ph3 pv2 ${
          !statusFilter || statusFilter === 'all' ? activeClass : inactiveClass
        }`}
      >
        <FormattedMessage {...messages.filterAll} />
      </CustomButton>
      <CustomButton
        onClick={() => setStatusFn('readyToMap')}
        className={`dbi bn ph3 pv2 ${statusFilter === 'readyToMap' ? activeClass : inactiveClass}`}
      >
        <FormattedMessage {...messages.filterReadyToMap} />
      </CustomButton>
      {userCanValidate && (
        <>
          <CustomButton
            onClick={() => setStatusFn('readyToValidate')}
            className={`dbi bn ph3 pv2 ${
              statusFilter === 'readyToValidate' ? activeClass : inactiveClass
            }`}
          >
            <FormattedMessage {...messages.filterReadyToValidate} />
          </CustomButton>
          <CustomButton
            onClick={() => setStatusFn('unavailable')}
            className={`dbi bn ph3 pv2 ${
              statusFilter === 'unavailable' ? activeClass : inactiveClass
            }`}
          >
            <FormattedMessage {...messages.taskStatus_BADIMAGERY} />
          </CustomButton>
        </>
      )}
    </div>
  );
}

export function TaskList({
  project,
  tasks,
  users,
  userCanValidate,
  activeFilter,
  selectTask,
  setZoomedTaskId,
  selected,
  userContributions,
  updateActivities,
  textSearch,
  setTextSearch,
}: Object) {
  const [readyTasks, setTasks] = useState([]);
  const [activeTaskModal, setActiveTaskModal] = useState(null);
  const [sortBy, setSortingOption] = useQueryParam('sortBy', StringParam);
  const [statusFilter, setStatusFilter] = useQueryParam('filter', StringParam);

  useEffect(() => {
    if (tasks && tasks.features) {
      let newTasks = tasks.features;
      if (statusFilter === 'readyToMap') {
        newTasks = newTasks.filter((task) =>
          ['READY', 'INVALIDATED'].includes(task.properties.taskStatus),
        );
      }
      if (statusFilter === 'readyToValidate') {
        newTasks = newTasks.filter((task) =>
          ['MAPPED', 'BADIMAGERY'].includes(task.properties.taskStatus),
        );
      }
      if (statusFilter === 'unavailable') {
        newTasks = newTasks.filter((task) => task.properties.taskStatus === 'BADIMAGERY');
      }
      if (textSearch) {
        if (Number(textSearch)) {
          newTasks = newTasks.filter(
            (task) =>
              task.properties.taskId === Number(textSearch) ||
              (task.properties.actionBy && task.properties.actionBy.includes(textSearch)),
          );
        } else {
          const usersTaskIds = userContributions
            .filter((user) => user.username.toLowerCase().includes(textSearch.toLowerCase()))
            .map((user) => user.taskIds)
            .flat();
          newTasks = newTasks.filter(
            (task) =>
              usersTaskIds.includes(task.properties.taskId) ||
              (task.properties.actionBy &&
                task.properties.actionBy.toLowerCase().includes(textSearch.toLowerCase())),
          );
        }
      }
      setTasks(newTasks);
    }
  }, [textSearch, statusFilter, tasks, userContributions]);

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
        <div className="w-40-l w-50-m w-100 dib v-mid pr2 pv1 relative">
          <FormattedMessage {...messages.filterPlaceholder}>
            {(msg) => {
              return (
                <input
                  type="text"
                  placeholder={msg}
                  className="pa2 w-100"
                  value={textSearch || ''}
                  onChange={(e) => setTextSearch(e.target.value)}
                />
              );
            }}
          </FormattedMessage>
          <CloseIcon
            onClick={() => {
              setTextSearch('');
            }}
            className={`absolute w1 h1 top-0 red pt3 pointer pr3 right-0 ${
              textSearch ? 'dib' : 'dn'
            }`}
          />
        </div>
        <div className="w-60-l w-50-m w-100 dib pv1">
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
      <TaskFilter
        userCanValidate={userCanValidate}
        statusFilter={statusFilter}
        setStatusFn={setStatusFilter}
      />
      <ReactPlaceholder
        showLoadingAnimation={true}
        rows={6}
        delay={50}
        ready={tasks && tasks.features && tasks.features.length}
      >
        {readyTasks && (
          <PaginatedList
            pageSize={6}
            items={
              sortBy === 'id' ? readyTasks.sort(compareTaskId) : readyTasks.sort(compareLastUpdate)
            }
            ItemComponent={TaskItem}
            users={users}
            setZoomedTaskId={setZoomedTaskId}
            setActiveTaskModal={setActiveTaskModal}
            selected={selected}
            selectTask={selectTask}
            project={project}
          />
        )}
      </ReactPlaceholder>
      {activeTaskModal && (
        <TaskActivityModal
          project={project}
          tasks={readyTasks}
          taskId={activeTaskModal}
          setActiveTaskModal={setActiveTaskModal}
          updateActivities={updateActivities}
          userCanValidate={userCanValidate}
        />
      )}
    </div>
  );
}

function TaskActivityModal({
  taskId,
  setActiveTaskModal,
  tasks,
  project,
  updateActivities,
  userCanValidate,
}: Object) {
  const [taskData, setActiveTaskData] = useState();
  useEffect(() => {
    const filteredTasks = tasks.filter((task) => task.properties.taskId === taskId);
    setActiveTaskData(filteredTasks.length ? filteredTasks[0] : null);
  }, [tasks, taskId]);
  return (
    <Popup open modal closeOnDocumentClick onClose={() => setActiveTaskModal(null)}>
      {(close) => (
        <>
          {taskData ? (
            <TaskActivity
              taskId={taskId}
              project={project}
              status={taskData ? taskData.properties.taskStatus : 'READY'}
              bbox={taskData ? bbox(taskData.geometry) : ''}
              close={close}
              updateActivities={updateActivities}
              userCanValidate={userCanValidate}
            />
          ) : (
            <div className="w-100 pa4 blue-dark bg-white">
              <CloseIcon className="h1 w1 fr pointer" onClick={() => close()} />
              <h3 className="ttu f3 pa0 ma0 barlow-condensed b mb4">
                <FormattedMessage {...messages.taskSplitted} />
              </h3>
              <p className="pb0">
                <FormattedMessage
                  {...messages.taskSplittedDescription}
                  values={{ id: <b>#{taskId}</b> }}
                />
              </p>
            </div>
          )}
        </>
      )}
    </Popup>
  );
}

function PaginatedList({
  items,
  ItemComponent,
  users,
  pageSize,
  project,
  setZoomedTaskId,
  setActiveTaskModal,
  selectTask,
  selected,
}: Object) {
  const [page, setPage] = useQueryParam('page', NumberParam);
  const lastPage = howManyPages(items.length, pageSize);
  // change page to 1 if the page number is not valid
  if (items && page && page > lastPage) {
    setPage(1);
  }

  const latestItems = useRef(items);
  useEffect(() => {
    latestItems.current = items;
  });
  // the useEffect above avoids the next one to run everytime the items change
  useEffect(() => {
    // switch the taskList page to always show the selected task.
    // Only do it if there is only one task selected
    if (selected.length === 1) {
      const newPage =
        (latestItems.current.findIndex((task) => task.properties.taskId === selected[0]) + 1) /
        pageSize;
      if (newPage) setPage(Math.ceil(newPage));
    }
  }, [selected, latestItems, setPage, pageSize]);

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
            data={item.properties}
            users={users}
            project={project}
            selectTask={selectTask}
            selected={selected}
            setZoomedTaskId={setZoomedTaskId}
            setActiveTaskModal={setActiveTaskModal}
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
