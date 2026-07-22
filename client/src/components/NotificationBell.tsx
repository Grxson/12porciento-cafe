import { useRef, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';

const EVENT_ICONS: Record<string, string> = {
  new_order: '🛒',
  order_status_changed: '📦',
  new_review: '⭐',
  review_approved: '✅',
  new_reply: '💬',
  subscription_created: '☕',
  subscription_cancelled: '❌',
  low_stock: '⚠️',
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    const isOpening = !open;
    setOpen(isOpening);
    if (isOpening && unreadCount > 0) markAllRead();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-[calc(100vw-2rem)] max-w-80 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 shadow-xl z-50 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-coffee-200 dark:border-coffee-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-coffee-900 dark:text-cream uppercase tracking-wider">
              Notificaciones
            </p>
            {notifications.length > 0 && (
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-coffee-500 hover:text-coffee-700 dark:hover:text-coffee-300 transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-coffee-500 dark:text-coffee-400 text-sm text-center py-8">
                Sin notificaciones
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-coffee-200/60 dark:border-coffee-800/60 ${!n.read ? 'bg-coffee-50 dark:bg-coffee-800/30' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5">
                      {EVENT_ICONS[n.event] ?? '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-coffee-900 dark:text-cream">
                        {n.title}
                      </p>
                      <p className="text-xs text-coffee-600 dark:text-coffee-400 mt-0.5 break-words">
                        {n.message}
                      </p>
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 mt-1">
                        {n.timestamp.toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
