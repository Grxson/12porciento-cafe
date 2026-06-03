import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirmar',
  confirmVariant = 'primary', loading, onConfirm, onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-coffee-950/80 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-coffee-900 border border-coffee-800 p-6 max-w-sm w-full"
            role="dialog"
            aria-modal
            aria-labelledby="confirm-dialog-title"
          >
            <div className="flex items-start gap-3 mb-5">
              {confirmVariant === 'danger'
                ? <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                : <Info className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
              }
              <div>
                <h3 id="confirm-dialog-title" className="font-serif text-lg text-cream mb-1">{title}</h3>
                <p className="text-coffee-300 text-sm leading-relaxed">{description}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                disabled={loading}
                className="text-sm text-coffee-400 hover:text-cream border border-coffee-700 hover:border-coffee-600 px-4 py-2 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`text-sm px-4 py-2 font-medium transition-colors disabled:opacity-50 ${
                  confirmVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-gold-500 hover:bg-gold-400 text-coffee-950'
                }`}
              >
                {loading ? 'Procesando...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
