// client/src/components/recipes/IngredientEditor.tsx
import { useState, type FormEvent } from 'react';
import AdminModal from '../../admin/components/AdminModal';
import type { RecipeIngredient } from '../../types';

interface IngredientEditorProps {
  open: boolean;
  ingredient?: RecipeIngredient;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: Partial<RecipeIngredient>) => Promise<void>;
  loading: boolean;
}

const inputCls =
  'w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500';
const labelCls = 'block text-xs text-coffee-600 dark:text-coffee-400 mb-1';

export default function IngredientEditor({
  open,
  ingredient,
  mode,
  onClose,
  onSave,
  loading,
}: IngredientEditorProps) {
  const [form, setForm] = useState({
    name: ingredient?.name || '',
    amount: ingredient?.amount?.toString() || '',
    unit: ingredient?.unit || '',
    note: ingredient?.note || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'El nombre es obligatorio' });
      return;
    }
    setErrors({});
    await onSave({
      name: form.name,
      amount: form.amount ? parseFloat(form.amount) : null,
      unit: form.unit || null,
      note: form.note || null,
    });
  };

  return (
    <AdminModal
      open={open}
      title={mode === 'add' ? 'Nuevo ingrediente' : 'Editar ingrediente'}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <div className="flex gap-3">
          <button
            type="submit"
            form="ingredient-form"
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
      <form id="ingredient-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ingredient-name" className={labelCls}>
            Nombre *
          </label>
          <input
            id="ingredient-name"
            type="text"
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors((prev) => ({ ...prev, name: '' }));
            }}
            className={inputCls}
            placeholder="ej. Café molido"
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ingredient-amount" className={labelCls}>
              Cantidad
            </label>
            <input
              id="ingredient-amount"
              type="number"
              step="any"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={inputCls}
              placeholder="ej. 15"
            />
          </div>

          <div>
            <label htmlFor="ingredient-unit" className={labelCls}>
              Unidad
            </label>
            <input
              id="ingredient-unit"
              type="text"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className={inputCls}
              placeholder="ej. g, ml"
            />
          </div>
        </div>

        <div>
          <label htmlFor="ingredient-note" className={labelCls}>
            Nota
          </label>
          <input
            id="ingredient-note"
            type="text"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className={inputCls}
            placeholder="ej. recién molido"
          />
        </div>
      </form>
    </AdminModal>
  );
}
