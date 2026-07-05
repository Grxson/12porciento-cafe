import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import api from '../api';

export default function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get<{ total: number }>('/push/subscriptions');
        setCount(res.data.total ?? 0);
      } catch {
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        className="relative p-2 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
        aria-label="Notificaciones"
        title={`${count ?? 0} dispositivo(s) suscritos`}
      >
        <Bell className="w-5 h-5" />
        {loading ? (
          <Loader2 className="absolute top-0 right-0 w-3 h-3 animate-spin text-gold-500" />
        ) : count !== null && count > 0 ? (
          <span className="absolute top-0 right-0 w-4 h-4 bg-gold-500 text-white text-xs flex items-center justify-center rounded-full font-bold">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>
    </div>
  );
}
