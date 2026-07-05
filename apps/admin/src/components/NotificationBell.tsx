import { Bell } from 'lucide-react';

export default function NotificationBell() {
  return (
    <div className="relative">
      <button
        className="relative p-2 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
      </button>
    </div>
  );
}
