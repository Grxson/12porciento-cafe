import { useState, useEffect } from 'react';
import { listQueue } from '../hooks/useBrewQueue';
import { syncBrews } from '../services/brewSync';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const refreshQueueCount = () => {
    listQueue()
      .then((q) =>
        setQueueCount(q.filter((b) => b.status === 'pending' || b.status === 'failed').length),
      )
      .catch(console.error);
  };

  useEffect(() => {
    const up = () => {
      setIsOffline(false);
      setSyncing(true);
      setTimeout(() => setSyncing(false), 2000);
    };
    const dn = () => setIsOffline(true);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', dn);
    };
  }, []);

  useEffect(() => {
    refreshQueueCount();
  }, [isOffline]);

  const handleManualSync = async () => {
    setSyncing(true);
    await syncBrews();
    refreshQueueCount();
    setTimeout(() => setSyncing(false), 1500);
  };

  if (!isOffline && !syncing && queueCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[5rem] left-3 right-3 md:left-auto md:right-4 md:w-80 z-[150] px-4 py-3 text-sm border flex items-center justify-between gap-3 ${
        syncing
          ? 'bg-green-900/20 dark:bg-green-900/20 border-green-500/30 text-green-700 dark:text-green-300'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400/40 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300'
      }`}
    >
      <span>
        {syncing
          ? '🔄 Sincronizando brews...'
          : isOffline
            ? `☁️ Sin conexión${queueCount > 0 ? ` — ${queueCount} brew${queueCount !== 1 ? 's' : ''} pendiente${queueCount !== 1 ? 's' : ''}` : ' — tus brews se guardan localmente'}`
            : `${queueCount} brew${queueCount !== 1 ? 's' : ''} pendiente${queueCount !== 1 ? 's' : ''} de sincronizar`}
      </span>
      {!syncing && queueCount > 0 && !isOffline && (
        <button
          onClick={handleManualSync}
          className="shrink-0 text-xs font-semibold uppercase tracking-wide underline hover:no-underline"
        >
          Sincronizar
        </button>
      )}
    </div>
  );
}
