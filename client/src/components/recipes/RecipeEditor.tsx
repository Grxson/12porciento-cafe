// client/src/components/recipes/RecipeEditor.tsx
import { type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SearchableProductSelect from '../SearchableProductSelect';
import { useRecipeForm, type RecipeFormData } from '../../hooks/useRecipeForm';
import type { Recipe } from '../../types';

const METHODS = ['Espresso', 'V60', 'Pour Over', 'Chemex', 'Kalita Wave', 'Prensa Francesa', 'Cold Brew', 'Moka', 'AeroPress', 'Sifón', 'Americano'];
const DIFFICULTIES = ['FÁCIL', 'MEDIA', 'DIFÍCIL'] as const;

interface RecipeEditorProps {
  open: boolean;
  recipe?: Recipe;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: RecipeFormData) => Promise<void>;
  loading: boolean;
}

export default function RecipeEditor({ open, recipe, mode, onClose, onSave, loading }: RecipeEditorProps) {
  const { form, errors, updateField, validate } = useRecipeForm(
    recipe ? {
      title: recipe.title,
      slug: recipe.slug,
      description: recipe.description || '',
      method: recipe.method,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime?.toString() || '',
      yield: recipe.yield || '',
      temp: recipe.temp || '',
      grind: recipe.grind || '',
      ratio: recipe.ratio || '',
      isPremium: recipe.isPremium,
      isPublished: recipe.isPublished,
      productId: recipe.productId || '',
    } : undefined
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-coffee-900 border border-coffee-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-coffee-800 sticky top-0 bg-coffee-900 z-10">
              <h2 className="font-serif text-lg text-cream">
                {mode === 'add' ? 'Nueva receta' : `Editar: ${recipe?.title}`}
              </h2>
              <button onClick={onClose} className="text-coffee-400 hover:text-cream" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Campos básicos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Título *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. V60 Perfecto"
                  />
                  {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. v60-perfecto"
                  />
                  {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs text-coffee-400 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={2}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none"
                  placeholder="Resumen de la receta..."
                />
              </div>

              {/* Método y dificultad */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Método *</label>
                  <select
                    value={form.method}
                    onChange={(e) => updateField('method', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  >
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Dificultad</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => updateField('difficulty', e.target.value as typeof DIFFICULTIES[number])}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  >
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Tiempo (min)</label>
                  <input
                    type="number"
                    value={form.prepTime}
                    onChange={(e) => updateField('prepTime', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 15"
                  />
                </div>
              </div>

              {/* Parámetros técnicos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Rendimiento</label>
                  <input
                    type="text"
                    value={form.yield}
                    onChange={(e) => updateField('yield', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 1 taza 250ml"
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Café relacionado</label>
                  <SearchableProductSelect
                    value={form.productId}
                    onChange={(id) => updateField('productId', id)}
                    initialLabel={recipe?.product?.name || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Temperatura</label>
                  <input
                    type="text"
                    value={form.temp}
                    onChange={(e) => updateField('temp', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 92°C"
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Molido</label>
                  <input
                    type="text"
                    value={form.grind}
                    onChange={(e) => updateField('grind', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. Medio"
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Ratio</label>
                  <input
                    type="text"
                    value={form.ratio}
                    onChange={(e) => updateField('ratio', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 1:16"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPremium}
                    onChange={(e) => updateField('isPremium', e.target.checked)}
                    className="w-4 h-4 accent-gold-500"
                  />
                  <span className="text-xs text-coffee-300">Premium (solo suscriptores)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => updateField('isPublished', e.target.checked)}
                    className="w-4 h-4 accent-gold-500"
                  />
                  <span className="text-xs text-coffee-300">Publicada</span>
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2 border-t border-coffee-800">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 border border-coffee-700 text-coffee-400 text-xs hover:text-cream transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
