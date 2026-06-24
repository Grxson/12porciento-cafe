import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const PROMPT_COUNT_KEY = 'push_prompt_count';
const MAX_PROMPTS = 2;

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

interface Props {
  /** Callback fired when user grants permission */
  onGranted?: () => void;
  /** Callback fired when user dismisses */
  onDismissed?: () => void;
}

export default function PushPermissionBanner({ onGranted, onDismissed }: Props) {
  const { supported, permission, subscribed, loading, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Read prompt count from localStorage
  const [promptCount, setPromptCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem(PROMPT_COUNT_KEY) ?? '0', 10);
    } catch {
      return 0;
    }
  });

  const shouldShow =
    !loading &&
    supported &&
    permission === 'default' &&
    !subscribed &&
    !dismissed &&
    promptCount < MAX_PROMPTS;

  const handleAllow = async () => {
    await requestPermission();
    if (Notification.permission === 'granted') {
      onGranted?.();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    const newCount = promptCount + 1;
    setPromptCount(newCount);
    try {
      localStorage.setItem(PROMPT_COUNT_KEY, String(newCount));
    } catch {
      // localStorage unavailable
    }
    onDismissed?.();
  };

  // iOS message
  if (isIOS() && supported && permission === 'default' && !subscribed) {
    return (
      <div className="mb-6 p-4 bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 text-sm text-coffee-600 dark:text-coffee-400 leading-relaxed">
        <p>
          Las notificaciones requieren iOS 16.4+ y tener esta app agregada a la pantalla de inicio.
          Ve a Safari, toca Compartir y selecciona "Agregar a pantalla de inicio".
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mb-6 p-4 bg-coffee-50 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800"
        >
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-coffee-900 dark:text-cream mb-1">
                ¿Recibir notificaciones?
              </p>
              <p className="text-xs text-coffee-600 dark:text-coffee-400 leading-relaxed">
                Te avisaremos sobre tus pedidos, nuevos cafés y actualizaciones importantes.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAllow}
                  className="px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold hover:bg-gold-400 transition-colors min-h-[36px]"
                >
                  Permitir
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 border border-coffee-300 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 text-xs hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-colors min-h-[36px]"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
