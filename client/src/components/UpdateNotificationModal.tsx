import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface UpdateNotificationModalProps {
  open: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export default function UpdateNotificationModal({ open, onUpdate, onDismiss }: UpdateNotificationModalProps) {
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
              <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">
                Actualización disponible
              </h3>
            </div>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6 leading-relaxed">
              Hemos mejorado el diseño de la app. Actualiza para ver los cambios.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                className="flex-1 btn-outline text-sm py-3 min-h-[44px]"
              >
                Ahora no
              </button>
              <button
                onClick={onUpdate}
                className="flex-1 btn-primary text-sm py-3 min-h-[44px]"
              >
                Actualizar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
