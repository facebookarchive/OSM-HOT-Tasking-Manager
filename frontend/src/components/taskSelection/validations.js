import React from 'react';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { fetchLocalJSONAPI } from '../../network/genericJSONRequest';
import { Link } from '@reach/router';

import { handleErrors } from '../../utils/promise';
import { htmlFromMarkdown } from '../../utils/htmlFromMarkdown';
import { ProfilePictureIcon, ListIcon } from '../svgIcons';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import { Button } from '../button';
import Popup from 'reactjs-popup';
import { OSMChaButton, OSMChaNewButton } from '../projectDetail/osmchaButton';
import { RefreshIcon } from '../svgIcons';
import { useSelector } from 'react-redux';

function ReasonsSpan({ reason }: Object) {
  return (
    <span style={{ backgroundColor: '#e0ecf9!important' }}>
      {reason.name} <br />{' '}
    </span>
  );
}

function ModalPopUpData({ falggedReason }: Object) {
  console.log('falgged reason details are', falggedReason.reasons);

  let reasonNamesArray;
  if (Object.keys(falggedReason.reasons).length === 0) {
    console.log('obj is empty');
    reasonNamesArray = [];
  } else {
    console.log('obj is non empty');
    reasonNamesArray = falggedReason.reasons;
  }

  return (
    <table
      style={{
        border: '1px solid black',
        borderCollapse: 'collapse',
      }}
    >
      <tr>
        <th
          style={{
            border: '1px solid black',
            borderCollapse: 'collapse',
            padding: '15px',
          }}
        >
          OSM ID
        </th>
        <th
          style={{
            border: '1px solid black',
            borderCollapse: 'collapse',
            padding: '15px',
          }}
        >
          Name
        </th>
        <th
          style={{
            border: '1px solid black',
            borderCollapse: 'collapse',
            padding: '15px',
          }}
        >
          Reasons
        </th>
      </tr>
      <tr>
        <td
          style={{
            border: '1px solid black',
            borderCollapse: 'collapse',
            padding: '15px',
          }}
        >
          {falggedReason.osm_id}
        </td>
        <td
          style={{
            border: '1px solid black',
            borderCollapse: 'collapse',
            padding: '15px',
          }}
        >
          {falggedReason.name}
        </td>
        <td
          style={{
            border: '1px solid black',
            borderCollapse: 'collapse',
            padding: '15px',
          }}
        >
          {reasonNamesArray.map((reasonName) => {
            return <ReasonsSpan reason={reasonName} />;
          })}
        </td>
      </tr>
    </table>
  );
}

function Validation({ validationSummary, activeUser, activeStatus, displayTasks }: Object) {
  //const intl = useIntl();
  console.log('inside small componenet', validationSummary);

  // const checkActiveUserAndStatus = (status, username) =>
  //   activeStatus === status && activeUser === username ? 'bg-blue-dark' : 'bg-grey-light';
  let modalPopUpDataArray;

  // if (validationSummary.reasons && validationSummary.reason.length > 0) {
  //   console.log('inside if condition in reasons length');
  //   modalPopUpDataArray = validationSummary.reasons;
  // }
  let emptyObject;
  if (Object.keys(validationSummary.reasons).length === 0) {
    console.log('obj is empty');
    modalPopUpDataArray = [];
    emptyObject = true;
  } else {
    console.log('obj is non empty');
    modalPopUpDataArray = validationSummary.reasons;
    emptyObject = false;
  }

  console.log('inside small modalPopUpDataArray', modalPopUpDataArray);
  const navigateToOSMCha = (changesets) => {
    console.log('changesets are @@@@ ', changesets);
    var str = changesets;
    let startposition = str.indexOf('{');
    let endposition = str.indexOf('}');
    var res = str.substring(startposition + 1, endposition);
    //osmcha.org/changesets/99884271,99883610

    window.open('https://osmcha.org/changesets/' + res);

    // window.open(
    //   'https://osmcha.org/filters?filters=%7B%22in_bbox%22%3A%5B%7B%22label%22%3A%2278.3858%2C17.5243%2C78.3884%2C17.5268%22%2C%22value%22%3A%2278.3858%2C17.5243%2C78.3884%2C17.5268%22%7D%5D%7D',
    // );
  };

  // console.log('modal popup empty obj ', Object.keys(validationSummary.reasons).length === 0);

  //console.log('modal popup data length', validationSummary.reasons.length);
  return (
    <div className={`w-100 cf pv3 ph3-ns ph1 ba bw1 mb2  'b--tan `}>
      <div className="w-75 fl dib truncate">
        <span>
          <b>
            Task # {validationSummary.task_id} &nbsp; {validationSummary.no_of_flags} flags
          </b>
          <FormattedMessage {...messages.taskflags}>
            {(msg) => (
              <div className="pr2 dib v-mid" title={msg}>
                {validationSummary.no_of_flags > 0 ? (
                  <Popup
                    trigger={
                      <ListIcon width="18px" height="14px" className="pointer hover-blue-grey" />
                    }
                    modal
                    position="top left"
                  >
                    {(close) => (
                      <div>
                        <button className="close" onClick={close} style={{ float: 'right' }}>
                          &times;
                        </button>
                        <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                          FLAGGED FEATURES # {validationSummary.task_id}
                        </h1>
                        <div style={{ textAlign: 'left' }}>
                          <div>
                            <br />

                            {modalPopUpDataArray.map((modalPopUpData) => {
                              return <ModalPopUpData falggedReason={modalPopUpData} />;
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </Popup>
                ) : (
                  <div> </div>
                )}
              </div>
            )}
          </FormattedMessage>
        </span>
        <span> Last Updated by {validationSummary.actionBy} </span>
      </div>
      <div className="w-25 fl tr dib truncate">
        <button className="btn f5" onClick={() => navigateToOSMCha(validationSummary.changeset_id)}>
          <span classNam="colorBlue">
            <strong style={{ color: '#448ee4' }}> OSM</strong> Cha
          </span>
        </button>
      </div>
    </div>
  );
}

export const Validations = (props) => {
  console.log('project props', props.project);
  console.log('validation  props', props.validations);
  let validationssArray = props.validations || [];
  console.log('validation array is ', validationssArray);

  return (
    <div className="markdown-content base-font blue-dark">
      {validationssArray.map((validation) => {
        return <Validation validationSummary={validation} />;
      })}
    </div>
  );
};

export function ProjectValidations({ instructions }: Object) {
  const token = useSelector((state) => state.auth.get('token'));
  // const htmlInstructions = instructions ? htmlFromMarkdown(instructions) : { __html: '' }; b--blue-dark  tan
  const getValidations = async () => {
    console.log('********');
    //const response = await fetch(`https://osmcha.org/api/v1/changesets/`, {
    //https://osmcha.org/api/v1/changesets/?page_size=75&page=1&date__gte=2021-02-02&date__lte=2021-02-09&in_bbox=78.3858%2C17.5243%2C78.3884%2C17.5268
    //https://osmcha.org/api/v1/changesets/?page_size=75&page=1&date__gte=2021-02-02&date__lte=2021-02-09&in_bbox=78.3858,17.5243,78.3884,17.5268
    //https://osmcha.org/api/v1/changesets/?page_size=75&page=1&date__gte=2021-02-08&date__lte=2021-02-09&is_suspect=True
    //https://osmcha.org/api/v1/changesets/?page_size=75&page=1&date__gte=2021-02-09&date__lte=2021-02-10&is_suspect=True&reasons=1
    //`https://osmcha.org/api/v1/changesets/?page_size=75&page=1&date__gte=2021-02-09&date__lte=2021-02-10&is_suspect=True&reasons=1
    // https://osmcha.org/api/v1/changesets/?page=01&page_size=75&date__gte=2021-02-09&date__lte=2021-02-10&is_suspect=True&reasons=26
    //https://osmcha.org/api/v1/changesets/?page=01&page_size=75&date__gte=2021-02-09&date__lte=2021-02-10&is_suspect=True&reasons=26
    //`https://osmcha.org/api/v1/changesets/?page=01&page_size=75&date__lte=2021-02-15&in_bbox=78.3858%2C17.5243%2C78.3884%2C17.5268&is_suspect=False&date__gte=2021-02-01`,
    // https://osmcha.org/api/v1/changesets/?page=01&page_size=75&date__lte=2021-02-15&in_bbox=78.3858%2C17.5243%2C78.3884%2C17.5268&is_suspect=False&date__gte=2021-02-01
    //https://osmcha.org/api/v1/changesets/?page=01&page_size=75&date__lte=2021-02-15&date__gte=2020-12-01&is_suspect=True&in_bbox=13.3038,52.5166,13.3510,52.5453
    const response = await fetch(
      `https://osmcha.org/api/v1/changesets/?page=01&page_size=75&date__lte=2021-02-15&date__gte=2020-12-01&is_suspect=True&in_bbox=13.3038,52.5166,13.3510,52.5453`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token 244d8f03e1e0a23a788593ccc61dcd8b34e7825c',
        },
      },
    );

    const jsonData = await response.json();
    console.log('json data features  ', jsonData.features);
    // jsonData.then((data) => {});
    //setTeamMetricsStats(jsonData);
  };
  const getValidationsNew = async () => {
    console.log('******** New *****');
    return fetch(
      `https://osmcha.org/api/v1/changesets/?page=01&page_size=75&date__gte=2021-02-09&date__lte=2021-02-10&is_suspect=True&reasons=26`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token 244d8f03e1e0a23a788593ccc61dcd8b34e7825c',
        },
      },
    )
      .then(handleErrors)
      .then((response) => {
        console.log('new api call response is', response.body);
        let re = response.json();
        re.then((data) => {});
        console.log('new api call response  re re is', re);
        console.log('new api call response  re re is', re.features);
        console.log('new api call response  re re rereeee is');
        return response.body;
      });

    // const jsonData = await response;
    // console.log('json data ', jsonData);
    // //setTeamMetricsStats(jsonData);
  };
  const navigateToOSMCha = () => {
    //window.open('https://www.w3schools.com');
    window.open(
      'https://osmcha.org/filters?filters=%7B%22in_bbox%22%3A%5B%7B%22label%22%3A%2278.3858%2C17.5243%2C78.3884%2C17.5268%22%2C%22value%22%3A%2278.3858%2C17.5243%2C78.3884%2C17.5268%22%7D%5D%7D',
    );
  };

  const getValidationsLocal = async () => {
    const response = await fetchLocalJSONAPI(`osmcha/4/`, token);

    const jsonData = await response;

    console.log('hey json data is', jsonData.summary);
  };

  useEffect(() => {
    getValidations();
    getValidationsLocal();
    //  getValidationsNew();
    //   getTeamNames();
  }, []);

  return (
    <div className="markdown-content base-font blue-dark">
      <button className="pv1 ph2 pointer ba b--grey-light bg-tan" style={{ float: 'right' }}>
        <RefreshIcon height="15px" className="pt1" />
      </button>
      <br /> <br />
      <div className={`w-100 cf pv3 ph3-ns ph1 ba bw1 mb2 b--tan `}>
        <div className="w-75 fl dib truncate">
          <span>
            <b>Task #1 &nbsp; 2 flags </b>
            <FormattedMessage {...messages.taskassignment}>
              {(msg) => (
                <div className="pr2 dib v-mid" title={msg}>
                  <Popup
                    trigger={
                      <ListIcon width="18px" height="14px" className="pointer hover-blue-grey" />
                    }
                    modal
                    position="top left"
                  >
                    {(close) => (
                      <div>
                        <button
                          className="close"
                          onClick={close}
                          style={{ align: 'right' }}
                        ></button>
                        <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                          FLAGGED FEATURES #
                        </h1>
                        <div style={{ textAlign: 'left' }}>
                          <div>
                            <br />

                            <table
                              style={{
                                border: '1px solid black',
                                borderCollapse: 'collapse',
                              }}
                            >
                              <tr>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Name
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Reasons
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Actions
                                </th>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  New footway created <br />
                                  Mapbox: Suspicious feature
                                  <br />
                                  New foot ways
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>

                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Suspicious feature
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Boulevard
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Spam text
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Wanderweg
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Invalid tag modification
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </Popup>
                </div>
              )}
            </FormattedMessage>
          </span>
          <span> Last Updated by Hanumanth </span>
        </div>
        <div className="w-25 fl tr dib truncate">
          <button className="btn f5" onClick={() => navigateToOSMCha()}>
            <span classNam="colorBlue">
              <strong style={{ color: '#448ee4' }}> OSM</strong> Cha
            </span>
          </button>
        </div>
      </div>
      <div className={`w-100 cf pv3 ph3-ns ph1 ba bw1 mb2 b--tan `}>
        <div className="w-75 fl dib truncate">
          <span>
            <b>Task #21 &nbsp; 4 flags </b>
            <FormattedMessage {...messages.taskassignment}>
              {(msg) => (
                <div className="pr2 dib v-mid" title={msg}>
                  <Popup
                    trigger={
                      <ListIcon width="18px" height="14px" className="pointer hover-blue-grey" />
                    }
                    modal
                    position="top left"
                  >
                    {(close) => (
                      <div>
                        <button
                          className="close"
                          onClick={close}
                          style={{ align: 'right' }}
                        ></button>
                        <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                          FLAGGED FEATURES #
                        </h1>
                        <div style={{ textAlign: 'left' }}>
                          <div>
                            <br />

                            <table
                              style={{
                                border: '1px solid black',
                                borderCollapse: 'collapse',
                              }}
                            >
                              <tr>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  OSM ID
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Name
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Reasons
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Actions
                                </th>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  901165859
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  New footway created
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>

                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318098
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Suspicious feature
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318097
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Boulevard
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Spam text
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318101
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Wanderweg
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Invalid tag modification
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </Popup>
                </div>
              )}
            </FormattedMessage>
          </span>
          <span> Last Updated by HanumanthChitirala </span>
        </div>
        <div className="w-25 fl tr dib truncate">
          <button className="btn f5" onClick={() => navigateToOSMCha()}>
            <span classNam="colorBlue">
              <strong style={{ color: '#448ee4' }}> OSM</strong> Cha
            </span>
          </button>
        </div>
      </div>
      <div className={`w-100 cf pv3 ph3-ns ph1 ba bw1 mb2 b--tan `}>
        <div className="w-75 fl dib truncate">
          <span>
            <b>Task #11 &nbsp; 4 flags </b>

            <FormattedMessage {...messages.taskassignment}>
              {(msg) => (
                <div className="pr2 dib v-mid" title={msg}>
                  <Popup
                    trigger={
                      <ListIcon width="18px" height="14px" className="pointer hover-blue-grey" />
                    }
                    modal
                    position="top left"
                  >
                    {(close) => (
                      <div>
                        <button
                          className="close"
                          onClick={close}
                          style={{ align: 'right' }}
                        ></button>
                        <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                          FLAGGED FEATURES #
                        </h1>
                        <div style={{ textAlign: 'left' }}>
                          <div>
                            <br />

                            <table
                              style={{
                                border: '1px solid black',
                                borderCollapse: 'collapse',
                              }}
                            >
                              <tr>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  OSM ID
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Name
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Reasons
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Actions
                                </th>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  901165859
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  New footway created
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>

                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318098
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Suspicious feature
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318097
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Boulevard
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Spam text
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318101
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Wanderweg
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Invalid tag modification
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </Popup>
                </div>
              )}
            </FormattedMessage>
          </span>
          <span> Last Update by Aditya Joshi</span>
        </div>
        <div className="w-25 fl tr dib truncate">
          <button className="btn f5">
            <span classNam="colorBlue">
              <strong style={{ color: '#448ee4' }}> OSM</strong> Cha
            </span>
          </button>
        </div>
      </div>
      <div className={`w-100 cf pv3 ph3-ns ph1 ba bw1 mb2 b--tan `}>
        <div className="w-75 fl dib truncate">
          <span>
            <b>Task #11 &nbsp; 6 flags </b>

            <FormattedMessage {...messages.taskassignment}>
              {(msg) => (
                <div className="pr2 dib v-mid" title={msg}>
                  <Popup
                    trigger={
                      <ListIcon width="18px" height="14px" className="pointer hover-blue-grey" />
                    }
                    modal
                    position="top left"
                  >
                    {(close) => (
                      <div>
                        <button
                          className="close"
                          onClick={close}
                          style={{ align: 'right' }}
                        ></button>
                        <h1 className="pb2 ma0 barlow-condensed blue-dark divPopHeader">
                          FLAGGED FEATURES #
                        </h1>
                        <div style={{ textAlign: 'left' }}>
                          <div>
                            <br />

                            <table
                              style={{
                                border: '1px solid black',
                                borderCollapse: 'collapse',
                              }}
                            >
                              <tr>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  OSM ID
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Name
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Reasons
                                </th>
                                <th
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Actions
                                </th>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  901165859
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  New footway created
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>

                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318098
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                ></td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Suspicious feature
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318097
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Boulevard
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Mapbox: Spam text
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                              <tr>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  900318101
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Wanderweg
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  Invalid tag modification
                                </td>
                                <td
                                  style={{
                                    border: '1px solid black',
                                    borderCollapse: 'collapse',
                                    padding: '15px',
                                  }}
                                >
                                  MapJOSM
                                </td>
                              </tr>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </Popup>
                </div>
              )}
            </FormattedMessage>
          </span>
          <span> Last Update by Davda Parth Mansukhali</span>
        </div>
        <div className="w-25 fl tr dib truncate">
          <button className="btn f5" onClick={() => navigateToOSMCha()}>
            <span classNam="colorBlue">
              <strong style={{ color: '#448ee4' }}> OSM</strong> Cha
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
