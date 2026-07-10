import { useState, useEffect } from 'react';
import { WifiOff, Clock } from 'lucide-react';

interface StaleDataBadgeProps {
  cachedAt?: string;
  className?: string;
}

function getRelativeTime(isoString: string): string {
  const now = Date.now();
  const cached = new Date(isoString).getTime();
  const diffMinutes = Math.floor((now - cached) / 60000);

  if (diffMinutes < 60) return `hace ${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays}d`;
}

export default function StaleDataBadge({ cachedAt, className = '' }: StaleDataBadgeProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400/40 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300 ${className}`}
    >
      <WifiOff size={14} />
      <span>Datos guardados</span>
      {cachedAt && (
        <>
          <span>· última actualización: {getRelativeTime(cachedAt)}</span>
          <Clock size={14} />
        </>
      )}
    </div>
  );
}
