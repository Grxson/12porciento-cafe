import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Share2, X, Coffee, Star, Flame, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useMonthlyWrap } from '../hooks/useMonthlyWrap';

interface MonthlyWrapProps {
  userId: string;
  onClose: () => void;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

function formatMonth(month: string): string {
  const [, m] = month.split('-');
  return MONTH_NAMES[m] || month;
}

function getYear(month: string): string {
  return month.split('-')[0];
}

export default function MonthlyWrap({ userId, onClose }: MonthlyWrapProps) {
  const { monthlyData, loading, error, month } = useMonthlyWrap(userId);
  const [slide, setSlide] = useState(0);
  const [sharing, setSharing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const totalSlides = 3;
  const [direction, setDirection] = useState(0);

  const goToSlide = useCallback((next: number) => {
    setSlide((prev) => {
      setDirection(next > prev ? 1 : -1);
      return next;
    });
  }, []);

  const nextSlide = useCallback(() => {
    setSlide((p) => {
      const next = Math.min(p + 1, totalSlides - 1);
      setDirection(1);
      return next;
    });
  }, []);

  const prevSlide = useCallback(() => {
    setSlide((p) => {
      const next = Math.max(p - 1, 0);
      setDirection(-1);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    },
    [onClose, nextSlide, prevSlide],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleShare = useCallback(async () => {
    if (!wrapRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(wrapRef.current, {
        backgroundColor: '#1c1917',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const file = new File([blob], `resumen-${month}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi resumen mensual' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen-${month}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // user cancelled or fallback failed — silent
    } finally {
      setSharing(false);
    }
  }, [month]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-center justify-center bg-coffee-950/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          role="dialog"
          aria-modal
          aria-label="Resumen mensual"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-10 h-10 flex items-center justify-center bg-coffee-800 hover:bg-coffee-700 text-cream rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Loading state */}
          {loading && (
            <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-coffee-800 rounded w-3/4 mx-auto" />
                <div className="h-24 bg-coffee-800 rounded" />
                <div className="h-4 bg-coffee-800 rounded w-1/2 mx-auto" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-8 text-center">
              <p className="text-coffee-400 text-lg">No hay datos para este mes</p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-gold-500 hover:text-gold-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && monthlyData === null && (
            <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-8 text-center">
              <Coffee className="w-12 h-12 text-coffee-600 mx-auto mb-3" />
              <p className="text-coffee-400 text-lg">No registraste brews este mes</p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-gold-500 hover:text-gold-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Data content */}
          {!loading && !error && monthlyData && (
            <>
              <div
                ref={wrapRef}
                className="bg-coffee-900 border border-coffee-800 rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-coffee-800 to-coffee-900 px-6 py-4 text-center border-b border-coffee-700">
                  <p className="text-xs text-gold-500 uppercase tracking-widest font-medium">
                    Resumen Mensual
                  </p>
                  <h2 className="text-xl font-serif text-cream mt-1">
                    {formatMonth(month)} {getYear(month)}
                  </h2>
                </div>

                {/* Slides */}
                <div className="min-h-[240px] relative overflow-hidden">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={slide}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="px-6 py-8"
                    >
                      {slide === 0 && (
                        <div className="text-center space-y-6">
                          <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center">
                              <Coffee className="w-8 h-8 text-gold-500" />
                            </div>
                          </div>
                          <div>
                            <p className="text-4xl font-bold text-cream">
                              {monthlyData.totalBrews}
                            </p>
                            <p className="text-coffee-400 mt-1 text-sm">Brews registrados</p>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Flame className="w-5 h-5 text-orange-400" />
                            <span className="text-lg font-semibold text-cream">
                              +{monthlyData.totalXp} XP
                            </span>
                          </div>
                        </div>
                      )}

                      {slide === 1 && (
                        <div className="text-center space-y-6">
                          <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center">
                              <Star className="w-8 h-8 text-gold-500" />
                            </div>
                          </div>
                          <div>
                            <p className="text-4xl font-bold text-cream">
                              {monthlyData.avgRating.toFixed(1)}
                            </p>
                            <p className="text-coffee-400 mt-1 text-sm">Rating promedio</p>
                            <div className="flex justify-center gap-0.5 mt-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.round(monthlyData.avgRating)
                                      ? 'text-gold-500 fill-gold-500'
                                      : 'text-coffee-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-cream">
                              {monthlyData.favoriteMethod}
                            </p>
                            <p className="text-coffee-400 text-sm">Método favorito</p>
                          </div>
                        </div>
                      )}

                      {slide === 2 && (
                        <div className="text-center space-y-6">
                          <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center">
                              <Calendar className="w-8 h-8 text-gold-500" />
                            </div>
                          </div>
                          {monthlyData.topFlavorTag && (
                            <div>
                              <p className="text-2xl font-bold text-cream capitalize">
                                {monthlyData.topFlavorTag}
                              </p>
                              <p className="text-coffee-400 mt-1 text-sm">Sabor favorito</p>
                            </div>
                          )}
                          <div>
                            <p className="text-4xl font-bold text-cream">
                              {monthlyData.daysBrewed}
                            </p>
                            <p className="text-coffee-400 mt-1 text-sm">Días con brew</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between px-6 pb-6">
                  <button
                    onClick={prevSlide}
                    disabled={slide === 0}
                    className="w-10 h-10 flex items-center justify-center text-coffee-400 hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="flex gap-2">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === slide ? 'bg-gold-500 w-6' : 'bg-coffee-700 hover:bg-coffee-600'
                        }`}
                        aria-label={`Diapositiva ${i + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextSlide}
                    disabled={slide === totalSlides - 1}
                    className="w-10 h-10 flex items-center justify-center text-coffee-400 hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Share button */}
                <div className="px-6 pb-5">
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gold-500 hover:bg-gold-400 text-coffee-950 font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    <Share2 className="w-5 h-5" />
                    {sharing ? 'Generando...' : 'Compartir resumen'}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
