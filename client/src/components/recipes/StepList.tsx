// client/src/components/recipes/StepList.tsx
import { useState, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Plus, Edit2, Trash2 } from 'lucide-react';
import type { RecipeStep } from '../../types';

interface StepListProps {
  steps: RecipeStep[];
  onReorder: (stepIds: string[]) => Promise<void>;
  onEdit: (step: RecipeStep) => void;
  onDelete: (step: RecipeStep) => void;
  onAddNew: () => void;
  loading?: boolean;
}

export default function StepList({ steps, onReorder, onEdit, onDelete, onAddNew }: StepListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [orderedSteps, setOrderedSteps] = useState<RecipeStep[]>(steps);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const fromIndex = orderedSteps.findIndex(s => s.id === draggedId);
    const toIndex = orderedSteps.findIndex(s => s.id === targetId);

    const newSteps = [...orderedSteps];
    const [dragged] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, dragged);

    setOrderedSteps(newSteps);
  };

  const handleDragEnd = async () => {
    if (draggedId) {
      // Only call onReorder if the id order actually changed
      const originalIds = steps.map(s => s.id).join(',');
      const newIds = orderedSteps.map(s => s.id);
      if (newIds.join(',') !== originalIds) {
        await onReorder(newIds);
      }
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-2">
      {orderedSteps.length === 0 ? (
        <div className="text-center py-6 text-coffee-500">
          <p className="text-xs">Sin pasos. Agrega el primero.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {orderedSteps.map(step => (
            <motion.div
              key={step.id}
              layout
              draggable
              onDragStart={() => handleDragStart(step.id)}
              onDragOver={(e) => handleDragOver(e, step.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-start gap-3 bg-coffee-800/40 p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                draggedId === step.id ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="w-4 h-4 text-coffee-600 shrink-0 mt-1" />
              <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs flex items-center justify-center shrink-0">
                {step.order}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-cream text-xs font-medium">{step.title}</p>
                <p className="text-coffee-400 text-xs mt-0.5 truncate">{step.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(step)}
                  className="p-1 text-coffee-500 hover:text-gold-400 transition-colors"
                  aria-label="Editar paso"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDelete(step)}
                  className="p-1 text-coffee-500 hover:text-red-400 transition-colors"
                  aria-label="Eliminar paso"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <button
        onClick={onAddNew}
        className="w-full py-2 border border-dashed border-coffee-700 text-coffee-500 text-xs hover:border-gold-500/50 hover:text-gold-400 transition-colors flex items-center justify-center gap-1"
      >
        <Plus className="w-3 h-3" /> Agregar paso
      </button>
    </div>
  );
}
