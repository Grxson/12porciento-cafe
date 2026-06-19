import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryLightboxImage {
  url: string;
  alt: string;
  productName: string;
}

interface GalleryLightboxProps {
  images: GalleryLightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

export default function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const current = images[index] ?? images[0];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const goTo = useCallback(
    (dir: -1 | 1) => {
      setIndex((prev) => {
        const next = prev + dir;
        if (next >= 0 && next < images.length) return next;
        return prev;
      });
    },
    [images.length],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goTo(-1);
      } else if (e.key === 'ArrowRight') {
        goTo(1);
      }
    },
    [onClose, goTo],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="gallery-lightbox-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10 transition-colors"
        >
          <X size={28} />
        </button>

        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(-1);
            }}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 z-10 transition-colors"
          >
            <ChevronLeft size={36} />
          </button>
        )}

        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(1);
            }}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 z-10 transition-colors"
          >
            <ChevronRight size={36} />
          </button>
        )}

        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={current.url}
            alt={current.alt}
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />
          <p className="text-white text-sm mt-3 text-center px-4">
            {current.productName}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
