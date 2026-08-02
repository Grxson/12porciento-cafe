// client/src/components/recipes/IngredientList.tsx
import { useState, useEffect, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Plus, Edit2, Trash2 } from 'lucide-react';
import type { RecipeIngredient } from '../../types';

interface IngredientListProps {
  ingredients: RecipeIngredient[];
  onReorder: (ingredientIds: string[]) => Promise<void>;
  onEdit: (ingredient: RecipeIngredient) => void;
  onDelete: (ingredient: RecipeIngredient) => void;
  onAddNew: () => void;
}

export default function IngredientList({
  ingredients,
  onReorder,
  onEdit,
  onDelete,
  onAddNew,
}: IngredientListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<RecipeIngredient[]>(ingredients);

  useEffect(() => {
    if (!draggedId) setOrdered(ingredients);
  }, [ingredients, draggedId]);

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const fromIndex = ordered.findIndex((i) => i.id === draggedId);
    const toIndex = ordered.findIndex((i) => i.id === targetId);

    const next = [...ordered];
    const [dragged] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, dragged);

    setOrdered(next);
  };

  const handleDragEnd = async () => {
    if (draggedId) {
      const originalIds = ingredients.map((i) => i.id).join(',');
      const newIds = ordered.map((i) => i.id);
      if (newIds.join(',') !== originalIds) {
        await onReorder(newIds);
      }
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-2">
      {ordered.length === 0 ? (
        <div className="text-center py-6 text-coffee-500 dark:text-coffee-400">
          <p className="text-xs">Sin ingredientes. Agrega el primero.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {ordered.map((ingredient) => (
            <motion.div
              key={ingredient.id}
              layout
              draggable
              onDragStart={() => handleDragStart(ingredient.id)}
              onDragOver={(e) => handleDragOver(e, ingredient.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 bg-coffee-100 dark:bg-coffee-800/40 p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                draggedId === ingredient.id ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="w-4 h-4 text-coffee-500 dark:text-coffee-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-coffee-900 dark:text-cream text-xs font-medium">
                  {ingredient.name}
                  {(ingredient.amount || ingredient.unit) && (
                    <span className="text-coffee-500 dark:text-coffee-400 font-normal">
                      {' '}
                      — {ingredient.amount ?? ''} {ingredient.unit ?? ''}
                    </span>
                  )}
                </p>
                {ingredient.note && (
                  <p className="text-coffee-500 dark:text-coffee-400 text-xs mt-0.5 truncate">
                    {ingredient.note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(ingredient)}
                  className="p-1 text-coffee-500 dark:text-coffee-400 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
                  aria-label="Editar ingrediente"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDelete(ingredient)}
                  className="p-1 text-coffee-500 dark:text-coffee-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label="Eliminar ingrediente"
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
        className="w-full py-2 border border-dashed border-coffee-300 dark:border-coffee-700 text-coffee-500 dark:text-coffee-400 text-xs hover:border-gold-500/50 hover:text-gold-500 dark:hover:text-gold-400 transition-colors flex items-center justify-center gap-1"
      >
        <Plus className="w-3 h-3" /> Agregar ingrediente
      </button>
    </div>
  );
}
