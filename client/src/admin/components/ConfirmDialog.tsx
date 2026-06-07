import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDangerous,
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-coffee-900 border border-coffee-700 max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-cream font-serif">{title}</h2>
              <button onClick={onCancel} className="text-coffee-400 hover:text-cream transition-colors" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-coffee-300 mb-6">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-coffee-700 text-coffee-400 text-sm hover:text-cream transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isDangerous
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gold-500 hover:bg-gold-600 text-coffee-950'
                }`}
              >
                {loading ? 'Procesando...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
