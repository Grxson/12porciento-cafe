// client/src/components/recipes/EquipmentList.tsx
import { useState, useEffect, type DragEvent, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { RecipeEquipment } from '../../types';

interface EquipmentListProps {
  equipment: RecipeEquipment[];
  onReorder: (equipmentIds: string[]) => Promise<void>;
  onAdd: (name: string) => Promise<void>;
  onDelete: (item: RecipeEquipment) => Promise<void>;
}

const inputCls =
  'flex-1 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-xs px-3 py-2 focus:outline-none focus:border-gold-500';

export default function EquipmentList({
  equipment,
  onReorder,
  onAdd,
  onDelete,
}: EquipmentListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<RecipeEquipment[]>(equipment);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!draggedId) setOrdered(equipment);
  }, [equipment, draggedId]);

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
      const originalIds = equipment.map((i) => i.id).join(',');
      const newIds = ordered.map((i) => i.id);
      if (newIds.join(',') !== originalIds) {
        await onReorder(newIds);
      }
    }
    setDraggedId(null);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAdd(newName.trim());
      setNewName('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-2">
      {ordered.length === 0 ? (
        <div className="text-center py-6 text-coffee-500 dark:text-coffee-400">
          <p className="text-xs">Sin equipo. Agrega el primero.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {ordered.map((item) => (
            <motion.div
              key={item.id}
              layout
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 bg-coffee-100 dark:bg-coffee-800/40 p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                draggedId === item.id ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="w-4 h-4 text-coffee-500 dark:text-coffee-600 shrink-0" />
              <p className="flex-1 min-w-0 text-coffee-900 dark:text-cream text-xs font-medium">
                {item.name}
              </p>
              <button
                onClick={() => onDelete(item)}
                className="p-1 text-coffee-500 dark:text-coffee-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                aria-label="Eliminar equipo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="ej. Dripper V60"
          className={inputCls}
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="px-3 py-2 border border-dashed border-coffee-300 dark:border-coffee-700 text-coffee-500 dark:text-coffee-400 text-xs hover:border-gold-500/50 hover:text-gold-500 dark:hover:text-gold-400 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </form>
    </div>
  );
}
