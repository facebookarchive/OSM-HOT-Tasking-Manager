import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import { Button } from '../button';
import { CommentInputField } from '../comments/commentInput';
import { MessageStatus } from '../comments/status';
import { pushToLocalJSONAPI } from '../../network/genericJSONRequest';

export function MessageMembers({ teamId, members }: Object) {
  const token = useSelector((state) => state.auth.token);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState(null);

  const sendMessage = () => {
    if (message && subject && token) {
      setStatus('sending');
      pushToLocalJSONAPI(
        `teams/${teamId}/actions/message-members/`,
        JSON.stringify({ message: message, subject: subject }),
        token,
        'POST',
      )
        .then((res) => {
          setStatus('messageSent');
          setMessage('');
          setSubject('');
        })
        .catch((e) => setStatus('error'));
    }
  };

  return (
    <>
      <div className={`bg-white b--grey-light pa4 ${message ? 'bt bl br' : 'ba'}`}>
        <div className="cf db">
          <h3 className="f3 blue-dark mt0 fw6 fl">
            <FormattedMessage {...messages.messageMembers} />
          </h3>
        </div>
        {(message || subject) && (
          <div className="cf mb1">
            <FormattedMessage {...messages.subjectPlaceholder}>
              {(msg) => {
                return (
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    name="subject"
                    className="db center pa2 w-100 fl mb3"
                    type="text"
                    placeholder={msg}
                  />
                );
              }}
            </FormattedMessage>
          </div>
        )}
        <div className="cf mb1">
          <CommentInputField
            comment={message}
            setComment={setMessage}
            contributors={members?.map((member) => member.username)}
          />
        </div>
        {!message && <MessageStatus status={status} />}
      </div>
      {(message || subject) && (
        <div className="cf pt0">
          <div className="w-70-l w-50 fl tr dib bg-grey-light">
            <Button
              className="blue-dark bg-grey-light h3"
              onClick={() => {
                setMessage('');
                setSubject('');
                setStatus(null);
              }}
            >
              <FormattedMessage {...messages.cancel} />
            </Button>
          </div>
          <div className="w-30-l w-50 fr dib">
            <Button
              className="white bg-primary h3 w-100"
              onClick={() => sendMessage()}
              disabled={!message || !subject}
            >
              <FormattedMessage {...messages.send} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
