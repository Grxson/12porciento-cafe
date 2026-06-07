import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 14;

function wasDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallPrompt() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissed());

  const showAndroid = canInstall && !isStandalone;
  const showIOS = isIOS && !isStandalone;
  if (dismissed || (!showAndroid && !showIOS)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed left-3 right-3 z-[60] bg-coffee-900 border border-gold-500/40 shadow-2xl p-4 flex items-center gap-3"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
      >
        <div className="w-10 h-10 bg-gold-500 flex items-center justify-center shrink-0">
          <span className="font-serif font-bold text-coffee-950 text-sm">12%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-cream text-sm font-medium">Instala la app</p>
          {showIOS ? (
            <p className="text-coffee-400 text-xs flex items-center gap-1 flex-wrap">
              Toca <Share size={12} className="inline" /> y luego "Agregar a inicio"
            </p>
          ) : (
            <p className="text-coffee-400 text-xs">Acceso rápido, como una app nativa.</p>
          )}
        </div>
        {showAndroid && (
          <button
            onClick={promptInstall}
            className="shrink-0 flex items-center gap-1.5 bg-gold-500 text-coffee-950 text-sm font-semibold px-3 py-2 hover:bg-gold-400 transition-colors"
          >
            <Download size={15} /> Instalar
          </button>
        )}
        <button onClick={dismiss} aria-label="Cerrar" className="shrink-0 text-coffee-500 hover:text-cream transition-colors">
          <X size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
