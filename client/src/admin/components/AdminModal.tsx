import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AdminModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string; // tailwind max-w-* class, default max-w-lg
}

export default function AdminModal({ open, title, onClose, children, footer, maxWidth = 'max-w-lg' }: AdminModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            className={`bg-coffee-900 border border-coffee-700 w-full ${maxWidth} max-h-[90vh] flex flex-col`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-5 border-b border-coffee-800">
              <h2 className="font-serif text-xl text-cream">{title}</h2>
              <button onClick={onClose} className="text-coffee-400 hover:text-cream transition-colors" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">{children}</div>
            {footer && <div className="p-5 border-t border-coffee-800 flex gap-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
