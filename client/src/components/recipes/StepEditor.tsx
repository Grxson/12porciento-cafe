// client/src/components/recipes/StepEditor.tsx
import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { RecipeStep } from '../../types';

interface StepEditorProps {
  open: boolean;
  step?: RecipeStep;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: Partial<RecipeStep>) => Promise<void>;
  loading: boolean;
}

export default function StepEditor({ open, step, mode, onClose, onSave, loading }: StepEditorProps) {
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
            className="bg-coffee-900 border border-coffee-700 w-full max-w-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-coffee-800">
              <h2 className="font-serif text-lg text-cream">
                {mode === 'add' ? 'Nuevo paso' : 'Editar paso'}
              </h2>
              <button onClick={onClose} className="text-coffee-400 hover:text-cream" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-coffee-400 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => { setForm(f => ({ ...f, title: e.target.value })); setErrors((prev) => ({ ...prev, title: '' })); }}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  placeholder="ej. Preparación del café"
                />
                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs text-coffee-400 mb-1">Descripción *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => { setForm(f => ({ ...f, description: e.target.value })); setErrors((prev) => ({ ...prev, description: '' })); }}
                  rows={4}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none"
                  placeholder="Instrucciones detalladas..."
                />
                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Imagen URL</label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Video URL</label>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-coffee-400 mb-1">Duración (segundos)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  placeholder="ej. 120"
                />
              </div>

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
