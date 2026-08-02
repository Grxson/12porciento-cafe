import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const DISMISSED_KEY = 'pwa_update_dismissed_version';
const JUST_UPDATED_KEY = 'pwa_just_updated';

export function useUpdateNotification() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [availableSince, setAvailableSince] = useState<number | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedReload() {
      localStorage.setItem(JUST_UPDATED_KEY, 'true');
      window.location.reload();
    },
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
      setAvailableSince((prev) => prev ?? Date.now());
      localStorage.removeItem(DISMISSED_KEY);
    }
  }, [needRefresh]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'dismissed');
    setUserDismissed(true);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateError('');
    try {
      await updateServiceWorker();
      // workbox's "controlling" event should trigger onNeedReload above, but
      // it can be delayed or never fire (e.g. other tabs of the same origin
      // still open). Force the reload so the UI never hangs on "Actualizando".
      window.setTimeout(() => {
        localStorage.setItem(JUST_UPDATED_KEY, 'true');
        window.location.reload();
      }, 3000);
    } catch {
      setIsUpdating(false);
      setUpdateError('No pudimos aplicar la actualización. Intenta de nuevo.');
    }
  };

  return {
    updateAvailable: needRefresh,
    userDismissed,
    showNotification: needRefresh && !userDismissed,
    isUpdating,
    updateError,
    availableSince,
    handleDismiss,
    handleUpdate,
  };
}
