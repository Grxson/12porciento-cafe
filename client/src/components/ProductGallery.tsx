import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUrl';

interface ProductGalleryProps {
  images: string[]; // ordered, cover first, deduped, non-empty
  alt: string;
  badge?: React.ReactNode;
}

export default function ProductGallery({ images, alt, badge }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchStart = useRef<number | null>(null);

  const safeImages = images.length ? images : [''];
  const current = safeImages[Math.min(active, safeImages.length - 1)];

  const go = (dir: -1 | 1) => setActive((a) => (a + dir + safeImages.length) % safeImages.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null || safeImages.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
    touchStart.current = null;
  };

  return (
    <div>
      <div
        className="relative aspect-[3/4] overflow-hidden bg-coffee-100 dark:bg-coffee-900"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence>
          <motion.img
            key={current}
            src={resolveImageUrl(current)}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setZoom(true)}
            className="w-full h-full object-cover cursor-zoom-in select-none"
            draggable={false}
          />
        </AnimatePresence>

        {badge && <div className="absolute top-4 left-4 flex gap-2">{badge}</div>}

        {safeImages.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-coffee-950/60 text-white p-2 hover:bg-coffee-950/80 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-coffee-950/60 text-white p-2 hover:bg-coffee-950/80 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-2 right-2 bg-coffee-950/70 text-white text-xs px-2 py-0.5">
              {active + 1}/{safeImages.length}
            </div>
            {/* Dots indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {safeImages.map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-all ${
                    i === active ? 'bg-gold-500 w-4' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border-2 transition-colors ${
                i === active ? 'border-gold-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-coffee-950/95 flex items-center justify-center p-4"
            onClick={() => setZoom(false)}
          >
            <button
              aria-label="Cerrar"
              className="absolute top-4 right-4 text-white p-2"
              onClick={() => setZoom(false)}
            >
              <X size={24} />
            </button>
            <img
              src={resolveImageUrl(current)}
              alt={alt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {safeImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white p-2"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white p-2"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
