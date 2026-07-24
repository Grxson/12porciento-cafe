import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useModuleToast } from '../context/ModuleContext';

function ToastItem({ toast, onRemove }: { toast: { id: string; message: string; type: string }; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const duration = 4000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  const bg = toast.type === 'success'
    ? 'bg-green-800/90 dark:bg-green-900/90 border-green-600 dark:border-green-700 text-green-200 dark:text-green-300'
    : toast.type === 'error'
    ? 'bg-red-900/90 border-red-700 text-red-300'
    : 'bg-blue-900/90 border-blue-700 text-blue-300';

  const progressBg = toast.type === 'success' ? 'bg-green-500/40' : toast.type === 'error' ? 'bg-red-500/40' : 'bg-blue-500/40';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative flex items-center gap-3 px-4 py-3 border shadow-lg overflow-hidden cursor-pointer ${bg}`}
      onClick={() => onRemove(toast.id)}
    >
      {toast.type === 'success' && <CheckCircle size={18} className="shrink-0" />}
      {toast.type === 'error' && <AlertCircle size={18} className="shrink-0" />}
      {toast.type === 'info' && <Info size={18} className="shrink-0" />}
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
        className="hover:opacity-70 transition-opacity shrink-0"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
      <div className={`absolute bottom-0 left-0 h-0.5 transition-all duration-100 ${progressBg}`} style={{ width: `${progress}%` }} />
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useModuleToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
