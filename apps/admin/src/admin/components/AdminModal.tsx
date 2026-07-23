import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FocusTrap } from '@12porciento/ui';

interface AdminModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string; // tailwind max-w-* class, default max-w-lg
}

export default function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: AdminModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
          <FocusTrap active={open}>
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className={`bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 w-full ${maxWidth} max-h-[90vh] flex flex-col`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-modal-title"
            >
              <div className="flex items-center justify-between p-5 border-b border-coffee-200 dark:border-coffee-800">
                <h2
                  id="admin-modal-title"
                  className="font-serif text-xl text-coffee-900 dark:text-cream"
                >
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto overscroll-contain space-y-4">{children}</div>
              {footer && (
                <div className="p-5 border-t border-coffee-200 dark:border-coffee-800 flex gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
