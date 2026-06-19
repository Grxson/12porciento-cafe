import { useState, useEffect } from 'react';
import { listQueue } from '../hooks/useBrewQueue';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const up = () => { setIsOffline(false); setSyncing(true); setTimeout(() => setSyncing(false), 2000); };
    const dn = () => setIsOffline(true);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn); };
  }, []);

  useEffect(() => {
    if (!isOffline) return;
    listQueue().then(q => setQueueCount(q.filter(b => b.status === 'pending' || b.status === 'failed').length)).catch(console.error);
  }, [isOffline]);

  if (!isOffline && !syncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[5rem] left-3 right-3 md:left-auto md:right-4 md:w-80 z-[150] px-4 py-3 text-sm border ${
        syncing
          ? 'bg-green-900/20 dark:bg-green-900/20 border-green-500/30 text-green-700 dark:text-green-300'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400/40 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300'
      }`}
    >
      {syncing
        ? '🔄 Sincronizando brews...'
        : `☁️ Sin conexión${queueCount > 0 ? ` — ${queueCount} brew${queueCount !== 1 ? 's' : ''} pendiente${queueCount !== 1 ? 's' : ''}` : ' — tus brews se guardan localmente'}`
      }
    </div>
  );
}
