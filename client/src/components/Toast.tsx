import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import type { Toast } from '../context/ToastContext';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'border-green-500/50 bg-green-950/90 text-green-300',
  error: 'border-red-500/50 bg-red-950/90 text-red-300',
  info: 'border-gold-500/50 bg-coffee-950/90 text-cream',
  warning: 'border-yellow-500/50 bg-yellow-950/90 text-yellow-300',
};

const progressColors = {
  success: 'bg-green-500/40',
  error: 'bg-red-500/40',
  info: 'bg-gold-500/40',
  warning: 'bg-yellow-500/40',
};

const ToastItem = memo(function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const Icon = icons[toast.type];
  const [progress, setProgress] = useState(100);
  const duration = 3500;

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

  return (
    <motion.div
      key={toast.id}
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      onClick={() => onRemove(toast.id)}
      className={`pointer-events-auto relative flex items-center gap-3 px-4 py-3 border text-sm max-w-sm shadow-xl overflow-hidden cursor-pointer ${colors[toast.type]}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
        className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 transition-all duration-100 ${progressColors[toast.type]}`}
        style={{ width: `${progress}%` }}
      />
    </motion.div>
  );
});

export default function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);

  return (
    <div className="fixed top-4 right-4 sm:right-6 z-[200] flex flex-col gap-2 pointer-events-none pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] max-h-screen overflow-hidden">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </AnimatePresence>
    </div>
  );
}
