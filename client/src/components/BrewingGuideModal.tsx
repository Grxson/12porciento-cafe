import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Thermometer, Coffee, Droplets } from 'lucide-react';
import type { Recipe } from '../types';

interface Props {
  recipes: Recipe[];
  open: boolean;
  onClose: () => void;
}

const methodIcons: Record<string, string> = {
  'V60': '🫖', 'Pour Over': '🫖', 'Espresso': '☕',
  'Prensa Francesa': '🏺', 'AeroPress': '🔄', 'Chemex': '⚗️',
  'Moka': '🫙', 'Cold Brew': '🧊',
};

export default function BrewingGuideModal({ recipes, open, onClose }: Props) {
  const [active, setActive] = useState(0);

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
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-4 top-16 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl z-50 bg-coffee-900 border border-coffee-700 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-coffee-800">
              <div>
                <p className="text-gold-500 text-xs tracking-[0.3em] uppercase">Guía de Preparación</p>
                <h3 className="text-cream font-serif text-xl mt-0.5">{recipe.title}</h3>
              </div>
              <button onClick={onClose} className="text-coffee-400 hover:text-cream transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {recipes.length > 1 && (
              <div className="flex gap-2 px-6 pt-4 flex-wrap">
                {recipes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`px-3 py-1.5 text-xs tracking-widest uppercase transition-all ${
                      i === active
                        ? 'bg-gold-500 text-coffee-950'
                        : 'border border-coffee-700 text-coffee-400 hover:text-cream'
                    }`}
                  >
                    {methodIcons[r.method] ?? '☕'} {r.method}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-coffee-800/50 p-3 text-center">
                  <Thermometer className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-400 text-xs uppercase tracking-wider">Temp</p>
                  <p className="text-cream text-sm font-medium mt-0.5">{recipe.temp}</p>
                </div>
                <div className="bg-coffee-800/50 p-3 text-center">
                  <Coffee className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-400 text-xs uppercase tracking-wider">Ratio</p>
                  <p className="text-cream text-sm font-medium mt-0.5">{recipe.ratio}</p>
                </div>
                <div className="bg-coffee-800/50 p-3 text-center">
                  <Droplets className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-400 text-xs uppercase tracking-wider">Molido</p>
                  <p className="text-cream text-sm font-medium mt-0.5">{recipe.grind}</p>
                </div>
              </div>

              <h4 className="text-coffee-400 text-xs tracking-[0.3em] uppercase mb-3">Pasos</h4>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full border border-gold-500/40 text-gold-500 text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-coffee-300 text-sm leading-relaxed">{step}</span>
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
