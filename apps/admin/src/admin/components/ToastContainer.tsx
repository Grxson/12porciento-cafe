import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useModuleToast } from '../context/ModuleContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useModuleToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex items-center gap-3 px-4 py-3 border shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-800/90 dark:bg-green-900/90 border-green-600 dark:border-green-700 text-green-200 dark:text-green-300'
                : toast.type === 'error'
                ? 'bg-red-900/90 border-red-700 text-red-300'
                : 'bg-blue-900/90 border-blue-700 text-blue-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} className="shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
            {toast.type === 'info' && <Info size={18} className="shrink-0" />}
            <span className="text-sm flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="hover:opacity-70 transition-opacity shrink-0"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
