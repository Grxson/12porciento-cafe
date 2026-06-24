import { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import ConfirmDialog from './ConfirmDialog';

export default function NotificationSettings() {
  const { supported, permission, subscribed, loading, requestPermission, unsubscribe } = usePushNotifications();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!supported) {
    return (
      <div className="p-4 bg-coffee-50 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-coffee-400" />
          <div>
            <p className="text-sm font-medium text-coffee-500">Notificaciones no disponibles</p>
            <p className="text-xs text-coffee-400 mt-0.5">
              Tu navegador no soporta notificaciones push o no has agregado esta app a tu pantalla de inicio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-coffee-50 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-coffee-400" />
        <span className="text-sm text-coffee-500">Cargando estado de notificaciones...</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-coffee-50 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-coffee-900 dark:text-cream mb-1">
            Notificaciones push
          </p>

          {permission === 'denied' && (
            <div>
              <p className="text-xs text-coffee-600 dark:text-coffee-400 mb-2">
                Las notificaciones están bloqueadas. Para activarlas, ve a la configuración de tu navegador.
              </p>
              <p className="text-xs text-coffee-500 dark:text-coffee-500 font-mono">
                Configuración &gt; Privacidad &gt; Notificaciones &gt; Permitir
              </p>
            </div>
          )}

          {permission === 'default' && !subscribed && (
            <div>
              <p className="text-xs text-coffee-600 dark:text-coffee-400 mb-2">
                Activa las notificaciones para recibir alertas de tus pedidos y novedades.
              </p>
              <button
                onClick={requestPermission}
                className="px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold hover:bg-gold-400 transition-colors min-h-[36px]"
              >
                Activar notificaciones
              </button>
            </div>
          )}

          {subscribed && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Activado</span>
              </div>
              <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-3">
                Recibirás notificaciones de tus pedidos y novedades.
              </p>
              <button
                onClick={() => setShowConfirm(true)}
                className="text-xs text-coffee-500 hover:text-red-500 dark:text-coffee-400 dark:hover:text-red-400 underline transition-colors"
              >
                Desuscribir este dispositivo
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Desuscribir dispositivo"
        message="¿Dejar de recibir notificaciones push en este dispositivo? Puedes volver a activarlas después."
        confirmLabel="Desuscribir"
        cancelLabel="Cancelar"
        onConfirm={() => {
          setShowConfirm(false);
          unsubscribe();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
