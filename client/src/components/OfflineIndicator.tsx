import { useState, useEffect } from 'react';
import { WifiOff, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOfflineMode } from '../hooks/useOfflineMode';

export default function OfflineIndicator() {
  const offlineEnabled = useOfflineMode((s) => s.enabled);
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

  if (!isOffline || !offlineEnabled) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="group fixed z-[200] flex items-center gap-1.5 bg-coffee-900 dark:bg-coffee-950 text-cream text-xs font-medium px-2.5 py-1.5 rounded-full shadow-lg border border-coffee-700"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
        right: '0.75rem',
      }}
    >
      <WifiOff className="w-3 h-3" />
      Sin conexión
      <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-coffee-900 dark:bg-coffee-950 border border-coffee-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
        <p className="text-cream text-xs font-medium mb-2">Sin conexión a internet</p>
        <p className="text-coffee-300 text-xs mb-3">
          Mostrando datos guardados localmente. Algunas funciones pueden no estar disponibles.
        </p>
        <Link
          to="/perfil/configuracion"
          className="inline-flex items-center gap-1.5 text-gold-500 hover:text-gold-400 text-xs font-medium transition-colors"
        >
          <Settings size={12} />
          Ir a configuración
        </Link>
      </div>
    </div>
  );
}
