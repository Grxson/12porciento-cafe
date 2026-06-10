import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Recipe } from '../../types';

interface RecipeLiveModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeLiveMode({ recipe, onClose }: RecipeLiveModeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timerActive, setTimerActive] = useState<number | null>(null);

  const step = recipe.steps[currentStepIndex];
  const hasNext = currentStepIndex < recipe.steps.length - 1;
  const hasPrev = currentStepIndex > 0;

  useEffect(() => {
    if (timerActive === null) return;
    const interval = setInterval(() => {
      setTimerActive((t) => {
        if (t && t <= 1) {
          if (typeof Audio !== 'undefined') {
            new Audio(
              'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='
            )
              .play()
              .catch(() => {});
          }
          return null;
        }
        return t ? t - 1 : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => {
    setTimerActive(null);
  }, [currentStepIndex]);

  const goNext = () => {
    if (hasNext) setCurrentStepIndex((c) => c + 1);
  };

  const goPrev = () => {
    if (hasPrev) setCurrentStepIndex((c) => c - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-coffee-950 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-coffee-800">
        <div>
          <h2 className="text-cream font-serif text-lg">{recipe.title}</h2>
          <p className="text-xs text-coffee-500">
            Paso {currentStepIndex + 1} de {recipe.steps.length}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="p-2 text-coffee-400 hover:text-cream transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="max-w-2xl w-full text-center"
        >
          {/* Step number badge */}
          <div className="inline-block px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-full mb-6">
            <p className="text-gold-400 text-sm font-semibold">{currentStepIndex + 1} / {recipe.steps.length}</p>
          </div>

          {/* Step title */}
          <h3 className="text-4xl md:text-5xl font-serif text-cream mb-6">{step.title}</h3>

          {/* Step description */}
          <p className="text-lg text-coffee-300 leading-relaxed mb-8">{step.description}</p>

          {/* Meta info */}
          {(step.duration || recipe.temp || recipe.grind) && (
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
              {step.duration && (
                <div className="bg-coffee-900/50 p-3 rounded">
                  <p className="text-[10px] text-coffee-500 uppercase mb-1">Duración</p>
                  <p className="text-gold-400 font-bold">{step.duration}s</p>
                </div>
              )}
              {recipe.temp && (
                <div className="bg-coffee-900/50 p-3 rounded">
                  <p className="text-[10px] text-coffee-500 uppercase mb-1">Temp</p>
                  <p className="text-gold-400 font-bold">{recipe.temp}</p>
                </div>
              )}
              {recipe.grind && (
                <div className="bg-coffee-900/50 p-3 rounded">
                  <p className="text-[10px] text-coffee-500 uppercase mb-1">Molienda</p>
                  <p className="text-gold-400 font-bold text-sm">{recipe.grind}</p>
                </div>
              )}
            </div>
          )}

          {/* Timer */}
          {step.duration && timerActive === null && (
            <button
              onClick={() => setTimerActive(step.duration!)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-400 transition-colors"
            >
              <Clock className="w-5 h-5" /> Iniciar {step.duration}s
            </button>
          )}

          {timerActive !== null && (
            <div className="inline-block px-8 py-6 bg-gold-500/10 border border-gold-500/30 rounded">
              <p className="text-xs text-gold-400 uppercase mb-3">Temporizador</p>
              <p className="text-6xl font-mono font-bold text-gold-400 mb-4">{timerActive}</p>
              <button
                onClick={() => setTimerActive(null)}
                className="text-xs px-4 py-1 bg-red-600/30 text-red-400 hover:bg-red-600/40 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-6 border-t border-coffee-800 bg-coffee-900/50">
        <button
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Anterior"
          className="p-3 text-coffee-400 disabled:opacity-30 hover:text-cream transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-6">
          <div className="h-1 bg-coffee-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-500 transition-all"
              style={{ width: `${((currentStepIndex + 1) / recipe.steps.length) * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-coffee-500 mt-2">
            {currentStepIndex + 1} / {recipe.steps.length}
          </p>
        </div>

        <button
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Siguiente"
          className="p-3 text-coffee-400 disabled:opacity-30 hover:text-cream transition-colors"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </motion.div>
  );
}
