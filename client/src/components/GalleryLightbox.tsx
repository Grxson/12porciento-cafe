import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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

export default function GalleryLightbox({ images, initialIndex, onClose }: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const current = images[index] ?? images[0];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

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
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, goTo],
  );

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      openerRef.current?.focus();
    };
  }, [handleKeyDown]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Galería de ${current.productName}`}
        key="gallery-lightbox-overlay"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
        style={{
          padding:
            'var(--app-safe-top) var(--app-safe-right) var(--app-safe-bottom) var(--app-safe-left)',
        }}
        onClick={onClose}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Cerrar galería"
          className="absolute z-10 flex min-h-12 min-w-12 items-center justify-center text-white/80 transition-colors hover:text-white"
          style={{
            top: 'calc(var(--app-safe-top) + 0.5rem)',
            right: 'calc(var(--app-safe-right) + 0.5rem)',
          }}
        >
          <X size={28} />
        </button>

        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(-1);
            }}
            aria-label="Imagen anterior"
            className="absolute left-2 top-1/2 z-10 flex min-h-12 min-w-12 -translate-y-1/2 items-center justify-center text-white/80 transition-colors hover:text-white sm:left-4"
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
            aria-label="Siguiente imagen"
            className="absolute right-2 top-1/2 z-10 flex min-h-12 min-w-12 -translate-y-1/2 items-center justify-center text-white/80 transition-colors hover:text-white sm:right-4"
          >
            <ChevronRight size={36} />
          </button>
        )}

        <motion.div
          key={index}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-1rem)] flex-col items-center justify-center px-12"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(event) => {
            touchStartRef.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartRef.current === null) return;
            const distance =
              (event.changedTouches[0]?.clientX ?? touchStartRef.current) - touchStartRef.current;
            if (distance > 50 && hasPrev) goTo(-1);
            if (distance < -50 && hasNext) goTo(1);
            touchStartRef.current = null;
          }}
        >
          <img
            src={current.url}
            alt={current.alt}
            className="max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-5rem)] max-w-full object-contain"
          />
          <p className="text-white text-sm mt-3 text-center px-4">{current.productName}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
