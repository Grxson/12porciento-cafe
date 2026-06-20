import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const DISMISSED_KEY = 'pwa_update_dismissed_version';
const JUST_UPDATED_KEY = 'pwa_just_updated';

export function useUpdateNotification() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  const [userDismissed, setUserDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'dismissed';
  });

  useEffect(() => {
    if (needRefresh) {
      setUserDismissed(false);
      localStorage.removeItem(DISMISSED_KEY);
    }
  }, [needRefresh]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'dismissed');
    setUserDismissed(true);
  };

  const handleUpdate = () => {
    localStorage.setItem(JUST_UPDATED_KEY, 'true');
    updateServiceWorker(true);
  };

  return {
    updateAvailable: needRefresh,
    userDismissed,
    showNotification: needRefresh && !userDismissed,
    handleDismiss,
    handleUpdate,
  };
}
