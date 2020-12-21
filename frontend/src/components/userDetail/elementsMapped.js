import React from 'react';
import humanizeDuration from 'humanize-duration';
import ReactTooltip from 'react-tooltip';
import { FormattedMessage } from 'react-intl';
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import messages from './messages';
import { useState, useEffect } from 'react';
import { fetchLocalJSONAPI } from '../../network/genericJSONRequest';
import { useSelector } from 'react-redux';
import { Button } from '../button';
import { Line } from 'react-chartjs-2';
import Select from 'react-select';
import moment from 'moment';
import {
  exporttoCSVFile,
  convertStartDateTime,
  convertEndDateTime,
} from '../../network/genericCSVExport';
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
import { StatsCardContent } from '../statsCardContent';
import DataTable from 'react-data-table-component';
import 'react-data-table-component-extensions/dist/index.css';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';

const getFieldData = (field) => {
  const iconClass = 'h-50 w-50';
  const iconStyle = { height: '45px' };
  switch (field) {
    case 'time':
      return {
        icon: <ClockIcon className={iconClass} style={iconStyle} />,
        message: <FormattedMessage {...messages.timeSpentMapping} />,
      };
    case 'buildings':
      return {
        icon: <HomeIcon className={iconClass} style={iconStyle} />,
        message: <FormattedMessage {...messages.buildingsMapped} />,
      };
    case 'road':
      return {
        icon: <RoadIcon className={iconClass} style={iconStyle} />,
        message: <FormattedMessage {...messages.roadMapped} />,
      };
    case 'poi':
      return {
        icon: <MarkerIcon className={iconClass} style={iconStyle} />,
        message: <FormattedMessage {...messages.poiMapped} />,
      };
    case 'waterways':
      return {
        icon: <WavesIcon className={iconClass} style={iconStyle} />,
        message: <FormattedMessage {...messages.waterwaysMapped} />,
      };
    default:
      return null;
  }
};

const Element = ({ field, value }) => {
  const elements = getFieldData(field);
  return (
    <div className={`w-20-ns w-100 ph2-ns fl`}>
      <div
        className={`cf shadow-4 pt3 pb3 ph2 ${
          field === 'time' ? 'bg-red white' : 'bg-white blue-dark'
        }`}
      >
        <div className="w-30 w-100-m fl tc">{elements.icon}</div>
        <StatsCardContent
          value={field === 'time' ? value : Math.trunc(value)}
          label={elements.message}
          className="w-70 w-100-m pt3-m mb1 fl tc"
          invertColors={field === 'time'}
        />
      </div>
    </div>
  );
};

export const TaskStats = ({ userStats, username }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [userMetricsStats, setUserMetricsStats] = useState({});
  const [userMetricsGraphData, setUserMetricsGraphData] = useState({});
  const token = useSelector((state) => state.auth.get('token'));
  const [projectNames, setProjectNames] = useState({});
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const userName = userDetails.username;

  useEffect(() => {
    getUserMetricsStats();
    getProjectNames();
  }, []);

  var convertSeconds = (sec) => {
    var hrs = Math.floor(sec / 3600);
    var min = Math.floor((sec - hrs * 3600) / 60);
    var seconds = sec - hrs * 3600 - min * 60;
    seconds = Math.round(seconds * 100) / 100;

    var result = hrs < 10 ? '0' + hrs : hrs;
    result += ':' + (min < 10 ? '0' + min : min);
    result += ':' + (seconds < 10 ? '0' + seconds : seconds);
    return result;
  };

  const maxDateApp = new Date();

  var dateObj = new Date();

  // subtract seven days from current time
  dateObj.setDate(dateObj.getDate() - 7);

  const [value, onChange] = useState([dateObj, new Date()]);
  const getProjectNames = async () => {
    const response = await fetchLocalJSONAPI(`projects/`, token);
    const jsonData = await response.results;
    setProjectNames(jsonData);
  };
  let selectItems = [{ value: 'All', label: 'All' }];
  for (var i = 0; i < projectNames.length; i++) {
    var obj = {};
    obj.value = projectNames[i].projectId;
    obj.label = projectNames[i].name;
    selectItems.push(obj);
  }
  const startDate = convertStartDateTime(value[0]);
  const endDate = convertEndDateTime(value[1]);

  const getUserMetricsStats = async () => {
    const response = await fetchLocalJSONAPI(
      `users/${userName}/userstaskmapped/?start_date=${startDate}&end_date=${endDate}`,
      token,
    );
    const jsonData = await response.task;
    const jsonDataForDays = await response.day;
    setUserMetricsStats(jsonData);
    setUserMetricsGraphData(jsonDataForDays);
  };

  const columnsSummary = [
    {
      name: 'Project Name',
      selector: 'ProjectName',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },

    {
      name: 'Total Time (hh:mm:ss) ',
      selector: 'TimeinOSMTM',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },
    {
      name: 'Mapping Total',
      selector: 'MappingTotal',
      sortable: true,
      grow: 2,

      minWidth: '100px',
    },
    {
      name: 'Validation Total',
      selector: 'ValidationTotal',
      sortable: true,
      grow: 2,

      minWidth: '200px',
    },
  ];

  let graphDays = [];
  let graphMappedValues = [];
  let graphValidationValues = [];

  for (let i = 0; i < userMetricsGraphData.length; i++) {
    let date = '';
    let mapped = '';
    let validated = '';
    date = moment(userMetricsGraphData[i].date).format('DD-MMM');

    mapped = userMetricsGraphData[i].tasks_mapped;
    validated = userMetricsGraphData[i].tasks_validated;
    graphDays.push(date);
    graphMappedValues.push(mapped);
    graphValidationValues.push(validated);
  }

  let dataSummaryResponse = [];
  for (let i = 0; i < userMetricsStats.length; i++) {
    let obj = {};
    obj.id = i + 1;
    obj.ProjectName = userMetricsStats[i].project_name;
    obj.TimeinOSMTM = convertSeconds(userMetricsStats[i].time_spent_mapping);
    obj.MappingTotal = userMetricsStats[i].tasks_mapped;
    obj.ValidationTotal = userMetricsStats[i].tasks_validated;

    dataSummaryResponse.push(obj);
  }
  let dataMappedResponse = [];
  for (let i = 0; i < userMetricsStats.length; i++) {
    let obj = {};
    obj.id = i + 1;
    obj.ProjectName = userMetricsStats[i].project_name;
    obj.TasksDone = userMetricsStats[i].tasks_mapped;
    obj.TotalTaskstime = convertSeconds(userMetricsStats[i].time_spent_mapping);
    obj.AverageTimePerTask = convertSeconds(userMetricsStats[i].average_time_spent_mapping);

    dataMappedResponse.push(obj);
  }
  let dataValidatedResponse = [];
  for (let i = 0; i < userMetricsStats.length; i++) {
    let obj = {};
    obj.id = i + 1;
    obj.ProjectName = userMetricsStats[i].project_name;
    obj.TasksDone = userMetricsStats[i].tasks_validated;
    obj.TotalTaskstime = convertSeconds(userMetricsStats[i].time_spent_validating);
    obj.AverageTimePerTask = convertSeconds(userMetricsStats[i].average_time_spent_validating);

    dataValidatedResponse.push(obj);
  }

  const columnsForMapped = [
    {
      name: 'Project Name',
      selector: 'ProjectName',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },

    {
      name: 'Tasks Done ',
      selector: 'TasksDone',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },
    {
      name: 'Total Tasks time (hh:mm:ss)',
      selector: 'TotalTaskstime',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },
    {
      name: 'Average time per task(hh:mm:ss)',
      selector: 'AverageTimePerTask',
      sortable: true,
      grow: 2,
      minWidth: '200px',
    },
  ];

  const state = {
    labels: graphDays,
    datasets: [
      {
        label: 'Mapped',
        fill: false,
        lineTension: 0.5,

        borderWidth: 2,
        data: graphMappedValues,
      },
      {
        label: 'Validated',
        fill: false,
        lineTension: 0.5,
        backgroundColor: 'rgb(173, 230, 239)',
        borderColor: 'rgb(173, 230, 239)',
        borderWidth: 2,
        data: graphValidationValues,
      },
    ],
  };

  function submitSelected(Values) {
    generateUserMetricsStats(Values.value, value[0], value[1]);
  }
  var generateUserMetricsStats = (projId, startDate, endDate) => {
    var startDateFormatted = convertStartDateTime(startDate);
    var endDateFormatted = convertEndDateTime(endDate);
    let url = '';
    if (projId === 'All') {
      url = `users/${userName}/userstaskmapped/?start_date=${startDateFormatted}&end_date=${endDateFormatted}`;
    } else {
      url = `users/${userName}/userstaskmapped/?project_id=${projId}&start_date=${startDateFormatted}&end_date=${endDateFormatted}`;
    }
    fetchLocalJSONAPI(url, token)
      .then((res) => {
        setUserMetricsStats(res.task);
        setUserMetricsGraphData(res.day);
      })
      .catch((e) => console.log('call back failed in task index file' + e));
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
    <div className="cf w-100 relative base-font blue-grey">
      <div className="w-50-ns w-100 pa2 fl">
        <div className="cf shadow-4 pv3 ph2 bg-white">
          <div className="w-25-ns w-100 h-100 pa2 pa0-m fl red tc">
            <MappedIcon className="v-mid w-50-ns w-25" />
          </div>
          <div className="w-75-ns w-100 fl tc f6 b">
            <div className="cf w-100">
              <p className="mb1 mt3 mt1-ns f4">
                <FormattedMessage
                  {...messages.userMapped}
                  values={{ user: username ? username : <FormattedMessage {...messages.you} /> }}
                />
              </p>
              <p className="ma0 mb2 barlow-condensed f2 b red">{userStats.tasksMapped}</p>
              <p className="mv1">
                <FormattedMessage {...messages.tasks} />
              </p>
            </div>
            <div className="cf w-100 pt4">
              <div className="cf w-50 fl tc">
                <span className="ma0 v-mid barlow-condensed f3 b red">
                  {userStats.tasksValidatedByOthers}
                </span>
                <p className="mv1 ttl">
                  <FormattedMessage {...messages.validated} />
                </p>
              </div>
              <div className="cf w-50 fl tc">
                <span className="ma0 v-mid barlow-condensed f3 b red">
                  {userStats.tasksInvalidatedByOthers}
                </span>
                <p className="mv1 ttl">
                  <FormattedMessage {...messages.invalidated} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-50-ns w-100 pa2 fl">
        <div className="cf shadow-4 pv3 ph2 bg-white">
          <div className="w-25-ns w-100 h-100 pa2 pa0-m fl red tc">
            <ValidatedIcon className="v-mid w-50-ns w-25" />
          </div>
          <div className="w-75-ns w-100 fl tc f6 b">
            <div className="cf w-100">
              <p className="mb1 mt3 mt1-ns f4">
                <FormattedMessage
                  {...messages.userValidated}
                  values={{ user: username ? username : <FormattedMessage {...messages.you} /> }}
                />
              </p>
              <p className="ma0 mb2 barlow-condensed f2 b red">
                {userStats.tasksValidated + userStats.tasksInvalidated || 0}
              </p>
              <p className="mv1">
                <FormattedMessage {...messages.tasks} />
              </p>
            </div>
            <div className="cf w-100 pt4">
              <div className="cf w-50 fl tc">
                <span className="ma0 v-mid barlow-condensed f3 b red">
                  {userStats.tasksValidated}
                </span>
                <p className="mv1 ttl">
                  <FormattedMessage {...messages.finished} />
                </p>
              </div>
              <div className="cf w-50 fl tc">
                <span className="ma0 v-mid barlow-condensed f3 b red">
                  {userStats.tasksInvalidated}
                </span>
                <p className="mv1 ttl">
                  <FormattedMessage {...messages.invalidated} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mv4">
          <div className="cf shadow-4 pv3 ph2 bg-white" style={{ marginTop: 250 }}>
            <div>
              <h2>Your Metrics</h2>
            </div>
            <table>
              <tr>
                <td>
                  <label className="pt3 pb2">Please Select Date Range :</label>
                </td>
                <td>
                  <DateRangePicker
                    onChange={onChange}
                    value={value}
                    maxDate={maxDateApp}
                    className="rangepicker"
                  />
                </td>

                <td>
                  <label className="pt3 pb2 " style={{ marginLeft: '420px', marginTop: 150 }}>
                    Select your Project :
                  </label>
                </td>
                <td style={{ width: 300 }}>
                  <Select
                    classNamePrefix="react-select"
                    defaultValue={selectItems[0]}
                    onChange={(value) => {
                      setSelectedOption(value);
                      submitSelected(value);
                    }}
                    options={selectItems}
                  />
                </td>
              </tr>
            </table>
          </div>
          <div className="cf shadow-4 pv3 ph2 bg-white">
            <Tabs>
              <TabList>
                <Tab>Summary</Tab>

                <Tab>Mapped</Tab>
                <Tab>Validated</Tab>
              </TabList>

              <TabPanel>
                <p>
                  <Button
                    className="bg-red white"
                    onClick={() => exporttoCSVFile(dataSummaryResponse, 'Summary')}
                  >
                    Export Results
                  </Button>
                  <DataTable
                    title="Your Tasks Summary"
                    columns={columnsSummary}
                    data={dataSummaryResponse}
                    defaultSortField="title"
                    pagination
                    highlightOnHover
                    customStyles={customStyles}
                  />
                  <br />
                  <br />

                  <Line
                    height="50vw"
                    responsive="true"
                    data={state}
                    options={{
                      title: {
                        display: true,
                        text: 'Daily Counts',
                        fontSize: 20,
                      },
                      legend: {
                        display: true,
                        position: 'right',
                      },
                    }}
                  />
                </p>
              </TabPanel>
              <TabPanel>
                <p>
                  <Button
                    className="bg-red white"
                    onClick={() => exporttoCSVFile(dataMappedResponse, 'Mapped')}
                  >
                    Export Results
                  </Button>

                  <DataTable
                    title="Your Weekly Mapping Statistics "
                    columns={columnsForMapped}
                    data={dataMappedResponse}
                    defaultSortField="title"
                    pagination
                    highlightOnHover
                    customStyles={customStyles}
                  />
                </p>
              </TabPanel>
              <TabPanel>
                <p>
                  <Button
                    className="bg-red white"
                    onClick={() => exporttoCSVFile(dataValidatedResponse, 'Validation')}
                  >
                    Export Results
                  </Button>

                  <DataTable
                    title="Your Weekly Validating Statistics "
                    columns={columnsForMapped}
                    data={dataValidatedResponse}
                    defaultSortField="title"
                    pagination
                    highlightOnHover
                    customStyles={customStyles}
                  />
                </p>
              </TabPanel>
            </Tabs>
          </div>
        </div>
      </div>
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

  return (
    <div>
      <div className="cf w-100 relative">
        <Element field={'time'} value={duration} />
        <Element field={'buildings'} value={osmStats.total_building_count_add || 0} />
        <Element field={'road'} value={osmStats.total_road_km_add || 0} />
        <Element field={'poi'} value={osmStats.total_poi_count_add || 0} />
        <Element field={'waterways'} value={osmStats.total_waterway_count_add || 0} />
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
