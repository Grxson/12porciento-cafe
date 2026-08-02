import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CURRENT_VERSION, LATEST_CHANGES } from '../data/changelog';

interface UpdateNotificationModalProps {
  open: boolean;
  onUpdate: () => Promise<void>;
  onDismiss: () => void;
  isUpdating: boolean;
  updateError: string;
  availableSince: number | null;
}

function formatElapsed(since: number, now: number): string {
  const minutes = Math.floor((now - since) / 60000);
  if (minutes < 1) return 'Disponible ahora mismo';
  if (minutes < 60) return `Disponible desde hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Disponible desde hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Disponible desde hace ${days} d`;
}

export default function UpdateNotificationModal({
  open,
  onUpdate,
  onDismiss,
  isUpdating,
  updateError,
  availableSince,
}: UpdateNotificationModalProps) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const visibleChangelog = expanded ? LATEST_CHANGES : LATEST_CHANGES.slice(0, 3);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-coffee-950/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-coffee-50 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 p-6 w-full max-w-sm"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-gold-500/20 border border-gold-500/40 flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-gold-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg text-coffee-900 dark:text-cream leading-tight">
                  Actualización disponible
                </h3>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold-500 mt-0.5">
                  Versión {CURRENT_VERSION}
                </p>
              </div>
            </div>
            {availableSince !== null && (
              <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-3 -mt-1">
                {formatElapsed(availableSince, now)}
              </p>
            )}
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-3 leading-relaxed">
              Hemos mejorado el diseño de la app. Novedades:
            </p>
            <ul className="space-y-1.5 mb-3">
              {visibleChangelog.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs text-coffee-700 dark:text-coffee-300 leading-relaxed"
                >
                  <span className="text-gold-500 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-coffee-500 dark:text-coffee-400 hover:text-gold-500 transition-colors flex items-center gap-1"
                aria-expanded={expanded}
              >
                {expanded ? 'Ver menos' : 'Ver más'}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <Link
                to="/changelog"
                className="text-xs text-coffee-500 dark:text-coffee-400 hover:text-gold-500 transition-colors flex items-center gap-1"
              >
                Historial completo
                <ExternalLink size={11} />
              </Link>
            </div>
            {updateError && <p className="mb-4 text-sm text-red-500">{updateError}</p>}
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                disabled={isUpdating}
                className="flex-1 btn-outline text-sm py-3 min-h-[44px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ahora no
              </button>
              <button
                onClick={onUpdate}
                disabled={isUpdating}
                className="flex-1 btn-primary text-sm py-3 min-h-[44px] disabled:cursor-wait disabled:opacity-70"
              >
                {isUpdating ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
