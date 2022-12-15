import React, { useState, useEffect } from 'react';
import { useLocation } from '@reach/router';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import { Button } from '../button';

const updateServiceWorker = (registration) => {
  if (registration && registration.waiting) {
    let preventReloadLoop;
    navigator.serviceWorker.addEventListener('controllerchange', (event) => {
      if (preventReloadLoop) {
        return;
      }
      preventReloadLoop = true;
      window.location.reload();
    });

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
};

export const UpdateDialog = () => {
  const location = useLocation();
  const [registration, setRegistration] = useState(null);
  const [close, setClose] = useState(false);

  const isMapOrValidationPage =
    location.pathname.startsWith('/projects/') &&
    (location.pathname.endsWith('/map/') || location.pathname.endsWith('/validate/'));

  useEffect(() => {
    const handleServiceWorkerEvent = (e) => setRegistration(e.detail.registration);
    document.addEventListener('onNewServiceWorker', handleServiceWorkerEvent);
    return () => document.removeEventListener('onNewServiceWorker', handleServiceWorkerEvent);
  }, []);
  return (
    <>
      {!isMapOrValidationPage && !close && registration !== null && (
        <div className="fixed left-1 bottom-1 shadow-2 ph3 pt2 pb3 br1 bg-white z-5 blue-dark fw6 ba b--grey-light">
          <p className="mb3 mt2">
            <FormattedMessage {...messages.newVersionAvailable} />
          </p>
          <Button className="bg-primary white" onClick={() => updateServiceWorker(registration)}>
            <FormattedMessage {...messages.update} />
          </Button>
          <Button className="bg-white blue-dark" onClick={() => setClose(true)}>
            <FormattedMessage {...messages.remindMeLater} />
          </Button>
        </div>
      )}
    </>
  );
};
