// client/src/components/recipes/RecipeEditor.tsx
import { type FormEvent } from 'react';
import AdminModal from '../../admin/components/AdminModal';
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

const inputCls = 'w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500';
const labelCls = 'block text-xs text-coffee-600 dark:text-coffee-400 mb-1';

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
    <AdminModal
      open={open}
      title={mode === 'add' ? 'Nueva receta' : `Editar: ${recipe?.title}`}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button
            type="submit"
            form="recipe-form"
            disabled={loading}
            className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-xs hover:text-coffee-900 dark:hover:text-cream transition-colors"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <form id="recipe-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Campos básicos */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={inputCls}
              placeholder="ej. V60 Perfecto"
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className={labelCls}>Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              className={inputCls}
              placeholder="ej. v60-perfecto"
            />
            {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
            className={inputCls + ' resize-none'}
            placeholder="Resumen de la receta..."
          />
        </div>

        {/* Método y dificultad */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Método *</label>
            <select
              value={form.method}
              onChange={(e) => updateField('method', e.target.value)}
              className={inputCls}
            >
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Dificultad</label>
            <select
              value={form.difficulty}
              onChange={(e) => updateField('difficulty', e.target.value as typeof DIFFICULTIES[number])}
              className={inputCls}
            >
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Tiempo (min)</label>
            <input
              type="number"
              value={form.prepTime}
              onChange={(e) => updateField('prepTime', e.target.value)}
              className={inputCls}
              placeholder="ej. 15"
            />
          </div>
        </div>

        {/* Parámetros técnicos */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Rendimiento</label>
            <input
              type="text"
              value={form.yield}
              onChange={(e) => updateField('yield', e.target.value)}
              className={inputCls}
              placeholder="ej. 1 taza 250ml"
            />
          </div>

          <div>
            <label className={labelCls}>Café relacionado</label>
            <SearchableProductSelect
              value={form.productId}
              onChange={(id) => updateField('productId', id)}
              initialLabel={recipe?.product?.name || ''}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Temperatura</label>
            <input
              type="text"
              value={form.temp}
              onChange={(e) => updateField('temp', e.target.value)}
              className={inputCls}
              placeholder="ej. 92°C"
            />
          </div>

          <div>
            <label className={labelCls}>Molido</label>
            <input
              type="text"
              value={form.grind}
              onChange={(e) => updateField('grind', e.target.value)}
              className={inputCls}
              placeholder="ej. Medio"
            />
          </div>

          <div>
            <label className={labelCls}>Ratio</label>
            <input
              type="text"
              value={form.ratio}
              onChange={(e) => updateField('ratio', e.target.value)}
              className={inputCls}
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
            <span className="text-xs text-coffee-600 dark:text-coffee-300">Premium (solo suscriptores)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => updateField('isPublished', e.target.checked)}
              className="w-4 h-4 accent-gold-500"
            />
            <span className="text-xs text-coffee-600 dark:text-coffee-300">Publicada</span>
          </label>
        </div>
      </form>
    </AdminModal>
  );
}
