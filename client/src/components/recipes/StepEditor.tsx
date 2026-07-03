// client/src/components/recipes/StepEditor.tsx
import { useState, type FormEvent } from 'react';
import AdminModal from '../../admin/components/AdminModal';
import ImageUploader from '../../admin/components/ImageUploader';
import type { RecipeStep } from '../../types';

interface StepEditorProps {
  open: boolean;
  step?: RecipeStep;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: Partial<RecipeStep>) => Promise<void>;
  loading: boolean;
}

const inputCls =
  'w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500';
const labelCls = 'block text-xs text-coffee-600 dark:text-coffee-400 mb-1';

export default function StepEditor({
  open,
  step,
  mode,
  onClose,
  onSave,
  loading,
}: StepEditorProps) {
  const [form, setForm] = useState({
    title: step?.title || '',
    description: step?.description || '',
    imageUrl: step?.imageUrl || '',
    videoUrl: step?.videoUrl || '',
    duration: step?.duration?.toString() || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'El título es obligatorio';
    if (!form.description.trim()) newErrors.description = 'La descripción es obligatoria';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    await onSave({
      title: form.title,
      description: form.description,
      imageUrl: form.imageUrl || null,
      videoUrl: form.videoUrl || null,
      duration: form.duration ? parseInt(form.duration) : null,
    });
  };

  return (
    <AdminModal
      open={open}
      title={mode === 'add' ? 'Nuevo paso' : 'Editar paso'}
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button
            type="submit"
            form="step-form"
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
      <form id="step-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="step-title" className={labelCls}>
            Título *
          </label>
          <input
            id="step-title"
            type="text"
            value={form.title}
            onChange={(e) => {
              setForm((f) => ({ ...f, title: e.target.value }));
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
            className={inputCls}
            placeholder="ej. Preparación del café"
          />
          {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="step-description" className={labelCls}>
            Descripción *
          </label>
          <textarea
            id="step-description"
            value={form.description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: e.target.value }));
              setErrors((prev) => ({ ...prev, description: '' }));
            }}
            rows={4}
            className={inputCls + ' resize-none'}
            placeholder="Instrucciones detalladas..."
          />
          {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Imagen</label>
            <ImageUploader
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
              label=""
            />
          </div>

          <div>
            <label htmlFor="step-video-url" className={labelCls}>
              Video URL
            </label>
            <input
              id="step-video-url"
              type="url"
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              className={inputCls}
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label htmlFor="step-duration" className={labelCls}>
            Duración (segundos)
          </label>
          <input
            id="step-duration"
            type="number"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            className={inputCls}
            placeholder="ej. 120"
          />
        </div>
      </form>
    </AdminModal>
  );
}
