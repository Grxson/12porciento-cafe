import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Thermometer, Coffee, Droplets } from 'lucide-react';
import type { Recipe } from '../types';
import StepVideoPlayer from './recipes/StepVideoPlayer';

interface Props {
  recipes: Recipe[];
  open: boolean;
  onClose: () => void;
}

const methodIcons: Record<string, string> = {
  V60: '🫖',
  'Pour Over': '🫖',
  Espresso: '☕',
  'Prensa Francesa': '🏺',
  AeroPress: '🔄',
  Chemex: '⚗️',
  Moka: '🫙',
  'Cold Brew': '🧊',
};

export default function BrewingGuideModal({ recipes, open, onClose }: Props) {
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      openerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || recipes.length === 0) return null;
  const recipe = recipes[active];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-coffee-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="brewing-guide-title"
            initial={reduceMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-var(--app-safe-top)-0.5rem)] flex-col overflow-hidden border border-coffee-200 bg-coffee-100 dark:border-coffee-700 dark:bg-coffee-900 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2"
            style={{ paddingBottom: 'var(--app-safe-bottom)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-coffee-200 dark:border-coffee-800">
              <div>
                <p className="text-gold-500 text-xs tracking-[0.3em] uppercase">
                  Guía de Preparación
                </p>
                <h3
                  id="brewing-guide-title"
                  className="text-coffee-900 dark:text-cream font-serif text-xl mt-0.5"
                >
                  {recipe.title}
                </h3>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Cerrar guía"
                className="icon-button text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recipes.length > 1 && (
              <div className="flex shrink-0 gap-2 overflow-x-auto px-6 pt-4 pb-1">
                {recipes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`min-h-11 shrink-0 px-3 py-2 text-xs tracking-widest uppercase transition-all ${
                      i === active
                        ? 'bg-gold-500 text-coffee-950'
                        : 'border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream'
                    }`}
                  >
                    {methodIcons[r.method] ?? '☕'} {r.method}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 bg-white p-3 text-center dark:bg-coffee-800/50 sm:col-span-1">
                  <Thermometer className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider">
                    Temp
                  </p>
                  <p className="text-coffee-900 dark:text-cream text-sm font-medium mt-0.5">
                    {recipe.temp}
                  </p>
                </div>
                <div className="bg-white dark:bg-coffee-800/50 p-3 text-center">
                  <Coffee className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider">
                    Ratio
                  </p>
                  <p className="text-coffee-900 dark:text-cream text-sm font-medium mt-0.5">
                    {recipe.ratio}
                  </p>
                </div>
                <div className="bg-white dark:bg-coffee-800/50 p-3 text-center">
                  <Droplets className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider">
                    Molido
                  </p>
                  <p className="text-coffee-900 dark:text-cream text-sm font-medium mt-0.5">
                    {recipe.grind}
                  </p>
                </div>
              </div>

              <h4 className="text-coffee-600 dark:text-coffee-400 text-xs tracking-[0.3em] uppercase mb-3">
                Pasos
              </h4>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li key={step.id} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full border border-gold-500/40 text-gold-500 text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed">
                      {step.title && (
                        <span className="text-coffee-900 dark:text-cream font-medium">
                          {step.title}:{' '}
                        </span>
                      )}
                      {step.description}
                      {step.videoUrl && <StepVideoPlayer url={step.videoUrl} />}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
