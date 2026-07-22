import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const VISIT_KEY = 'pwa-visit-count';
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;
const MIN_VISITS = 2;

function getDismissTime(): number {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return 0;
  const ts = parseInt(raw, 10);
  return Number.isNaN(ts) ? 0 : ts;
}

function wasDismissed(): boolean {
  const ts = getDismissTime();
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function getVisitCount(): number {
  const raw = localStorage.getItem(VISIT_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isNaN(n) ? 0 : n;
}

export default function InstallPrompt() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissed());
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    const visits = getVisitCount() + 1;
    try {
      localStorage.setItem(VISIT_KEY, String(visits));
    } catch {
      /* storage may be unavailable (private mode) — fall through */
    }

    if (!wasDismissed() && visits >= MIN_VISITS) {
      setEligible(true);
    }
  }, []);

  const showAndroid = canInstall && !isStandalone;
  const showIOS = isIOS && !isStandalone;
  if (dismissed || !eligible || (!showAndroid && !showIOS)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed left-3 right-3 z-[60] bg-white dark:bg-coffee-900 border border-gold-500/40 shadow-2xl p-4 flex items-center gap-3"
        style={{
          bottom: 'calc(var(--app-bottom-nav-height) + var(--app-safe-bottom))',
          paddingLeft: 'max(0.75rem, var(--app-safe-left))',
          paddingRight: 'max(0.75rem, var(--app-safe-right))',
        }}
      >
        <div className="w-10 h-10 bg-gold-500 flex items-center justify-center shrink-0">
          <span className="font-serif font-bold text-coffee-950 text-sm">12%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-coffee-900 dark:text-cream text-sm font-medium">Instala la app</p>
          {showIOS ? (
            <p className="text-coffee-600 dark:text-coffee-400 text-xs flex items-center gap-1 flex-wrap">
              Toca <Share size={12} className="inline" /> y luego "Agregar a inicio"
            </p>
          ) : (
            <p className="text-coffee-600 dark:text-coffee-400 text-xs">
              Acceso rápido, como una app nativa.
            </p>
          )}
        </div>
        {showAndroid && (
          <button
            onClick={promptInstall}
            className="shrink-0 flex items-center gap-1.5 bg-gold-500 text-coffee-950 text-sm font-semibold px-3 py-3 min-h-[44px] hover:bg-gold-400 transition-colors"
          >
            <Download size={15} /> Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream transition-colors"
        >
          <X size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
