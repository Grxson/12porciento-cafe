import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { subscribeConnectionFailed } from '../lib/socket';

export default function SocketErrorBadge() {
  const [failed, setFailed] = useState(false);

  useEffect(() => subscribeConnectionFailed(setFailed), []);

  if (!failed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[200] flex items-center gap-1.5 bg-red-900 text-cream text-xs font-medium px-2.5 py-1.5 rounded-full shadow-lg border border-red-700"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        left: 'max(0.75rem, var(--app-safe-left))',
      }}
    >
      <WifiOff className="w-3 h-3" />
      Notificaciones en tiempo real no disponibles
    </div>
  );
}
