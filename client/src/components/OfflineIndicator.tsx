import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const up = () => setIsOffline(false);
    const dn = () => setIsOffline(true);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', dn);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[200] flex items-center gap-1.5 bg-coffee-900 dark:bg-coffee-950 text-cream text-xs font-medium px-2.5 py-1.5 rounded-full shadow-lg border border-coffee-700"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        right: '0.75rem',
      }}
    >
      <WifiOff className="w-3 h-3" />
      Sin conexión
    </div>
  );
}
