import React ,{ useEffect, useState } from 'react';
import { FormattedMessage, FormattedNumber } from 'react-intl';
import ReactPlaceholder from 'react-placeholder';
import 'react-placeholder/lib/reactPlaceholder.css';

import messages from './messages';
import { TaskCard } from './taskCard';
import DataTable from 'react-data-table-component';
import DataTableExtensions from 'react-data-table-component-extensions';
import 'react-data-table-component-extensions/dist/index.css';
import { Link } from '@reach/router';
import {  fetchLocalJSONAPI } from '../../network/genericJSONRequest';
import { useSelector } from 'react-redux';
export const TaskResults = (props) => {
  const state = props.state;
  let isAssigned=state.statusCode;
  let isAssignedFound;
  if(isAssigned){
    isAssignedFound = isAssigned.indexOf("ASSIGNED") !==-1? true: false; //true
  }

const [userData, setUserData] = useState({});

const token = useSelector((state) => state.auth.get('token'));
const userDetails = useSelector((state) => state.auth.get('userDetails'));
const userName=userDetails.username;

    useEffect(() => {
      getTasks();
    }, []);

    const getTasks = async () => {
     //  const response = await fetchLocalJSONAPI(`user/${userName}/assigned-tasks/?closed=false`, token);
		const response = await fetchLocalJSONAPI(`user/${userName}/assigned-tasks/?pageSize=1000&closed=false`, token);
        const jsonData = await response.assignedTasks;
       setUserData(jsonData);
     
    };
        let data=[];
  
     for (var i = 0; i < userData.length; i++) {
      var obj = {};
      obj.id = i + 1;
      obj.projectName = userData[i].projectName;
      obj.project = userData[i].projectId;
      obj.taskId = userData[i].taskId;
      obj.status = userData[i].taskStatus;
  
      obj.projectState = userData[i].taskStatus;
       data.push(obj);
  
  }
 const columns = [

    {
      name: 'Project Name',
      selector: 'projectName',
      sortable: true,
      grow: 2,
      minWidth: '300px',
    },
    {
      name: 'Project',
      selector: 'project',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },
    {
      name: 'Task Id',
      selector: 'taskId',
      sortable: true,
      grow: 2,
      minWidth: '100px',
      cell: row => <Link
      
      to={`/projects/${row.project}/tasks?page=1&search=${row.taskId}`}
            > {row.taskId} </Link>
    },
    {
      name: 'Status',
      selector: 'status',
      sortable: true,
      grow: 2,
      minWidth: '200px',
    },
    {
      name: 'Project State',
      selector: 'projectState',
      sortable: true,
      grow: 2,
      minWidth: '200px',
    },
];
const tableData = {
  columns,
  data,
};
const customStyles = {
  headCells: {
    style: {
      fontSize: '15px',
      fontWeight: 'bold',
       },
  },

  cells: {
    style: {
      fontSize: '14px',
    
    },
  },
};

  return (
    <div className={props.className}>
      {state.isLoading ? (
        <span>&nbsp;</span>
      ) : (
        !state.isError && (
          <p className="blue-grey ml3 pt2 f7">
            <FormattedMessage
              {...messages.paginationCount}
              values={{
                number: state.tasks && state.tasks.length,
                total: <FormattedNumber value={state.pagination && state.pagination.total} />,
              }}
            />
          </p>
        )
      )}
     
     {state.isError  && !isAssignedFound && (
        <div className="bg-tan pa4 mt3">
          <FormattedMessage {...messages.errorLoadingTasks} />
          <div className="pa2">
            <button className="pa1" onClick={() => props.retryFn()}>
              <FormattedMessage {...messages.retry} />
            </button>
          </div>
        </div>
      )}

      {state.isError && isAssignedFound  && (
        <div className="bg-tan pa4 mt3">

          <DataTableExtensions
            {...tableData}
            print={false}
            >
            <DataTable
                title =  "Tasks Assigned to you "
                columns={columns}
                data={data}
                defaultSortField="title"
                pagination
                highlightOnHover
                customStyles={customStyles}
                />
          </DataTableExtensions>
       </div>
      )}
      {!state.isError && (
      <div className={`cf db`}>
        <ReactPlaceholder ready={!state.isLoading} type="media" rows={10}>
          <TaskCards pageOfCards={state.tasks} />
        </ReactPlaceholder>
      </div>
      )}
    </div>
  );
};

const TaskCards = (props) => {
  if (!props || !props.pageOfCards || props.pageOfCards.length === 0) {
    return null;
  }
  const filterFn = (n) => n;
  const filteredCards = props.pageOfCards.filter(filterFn);

  if (filteredCards < 1) {
    return (
      <div className="mb3 blue-grey">
        <FormattedMessage {...messages.noContributed} />
      </div>
    );
  }

  return filteredCards.map((card, n) => <TaskCard {...card} key={n} />);
};
