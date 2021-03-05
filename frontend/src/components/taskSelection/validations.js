import React from 'react';
import { ListIcon } from '../svgIcons';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import Popup from 'reactjs-popup';

function ReasonsSpan({ reason }: Object) {
  return (
    <span style={{ textAlign: 'left' }}>
      <strong>.</strong> {reason.name} <br />
    </span>
  );
}

function ModalPopUpData({ falggedReason, changesets }: Object) {
  let reasonNamesArray;
  //let changsetStr = changesets.join();

  if (Object.keys(falggedReason.reasons).length === 0) {
    reasonNamesArray = [];
  } else {
    reasonNamesArray = falggedReason.reasons;
  }
  const navigateToOSMCha = (changesets) => {
    var changsetStr = changesets.join();
    window.open('https://osmcha.org/changesets/' + changsetStr);
  };

  return (
    <div className={`w-100 cf pv3 ph3-ns ph1 ba bw1 mb2  'b--tan `}>
      <div className="w-20 fl tr dib truncate">
        <a className="link white" href={''} onClick={() => navigateToOSMCha(changesets)}>
          {falggedReason.osm_id}
        </a>
      </div>
      <div className="w-20 fl tr dib truncate">{falggedReason.name}</div>
      <div className="w-50 fl tr dib truncate">
        {reasonNamesArray.map((reasonName) => {
          return <ReasonsSpan reason={reasonName} />;
        })}
      </div>
    </div>
  );
}

function Validation({ validationSummary, activeUser, activeStatus, displayTasks }: Object) {
  let modalPopUpDataArray;

  if (Object.keys(validationSummary.reasons).length === 0) {
    modalPopUpDataArray = [];
  } else {
    modalPopUpDataArray = validationSummary.reasons;
  }

  const navigateToOSMCha = (changesets) => {
    var changsetStr = changesets.join();
    window.open('https://osmcha.org/changesets/' + changsetStr);
  };

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
                              return (
                                <ModalPopUpData
                                  falggedReason={modalPopUpData}
                                  changesets={validationSummary.changeset_id}
                                />
                              );
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
  let validationssArray = props.validations || [];
  return (
    <div className="markdown-content base-font blue-dark">
      {validationssArray.map((validation) => {
        return <Validation validationSummary={validation} />;
      })}
    </div>
  );
};
