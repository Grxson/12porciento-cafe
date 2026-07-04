import { Coffee, Thermometer, Droplets, Scale, Wrench, Star, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { BaristaEquipment } from '../types';

const categoryIcons: Record<string, typeof Coffee> = {
  GRINDER: Coffee,
  KETTLE: Thermometer,
  DRIPPER: Droplets,
  SCALE: Scale,
  OTHER: Wrench,
};

const categoryLabels: Record<string, string> = {
  GRINDER: 'Molino',
  KETTLE: 'Tetera',
  DRIPPER: 'Dripper',
  SCALE: 'Báscula',
  OTHER: 'Otro',
};

interface EquipmentCardProps {
  equipment: BaristaEquipment;
  onEdit: (equipment: BaristaEquipment) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export default function EquipmentCard({
  equipment,
  onEdit,
  onDelete,
  onToggleFavorite,
}: EquipmentCardProps) {
  const Icon = categoryIcons[equipment.category] ?? Wrench;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 relative group"
    >
      {/* Photo / Placeholder */}
      <div className="h-36 bg-coffee-100 dark:bg-coffee-800 flex items-center justify-center overflow-hidden">
        {equipment.photoUrl ? (
          <img
            src={equipment.photoUrl}
            alt={equipment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="w-10 h-10 text-coffee-400 dark:text-coffee-600" />
        )}
      </div>

      {/* Favorite star */}
      <button
        onClick={() => onToggleFavorite(equipment.id, !equipment.isFavorite)}
        className="absolute top-2 right-2 p-1.5 bg-coffee-950/60 hover:bg-coffee-950/80 transition-colors"
        aria-label={equipment.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <Star
          className={`w-4 h-4 ${
            equipment.isFavorite ? 'text-gold-400 fill-gold-400' : 'text-cream/70'
          }`}
        />
      </button>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h3 className="text-sm font-medium text-coffee-900 dark:text-cream truncate">
            {equipment.name}
          </h3>
          {equipment.brand && (
            <span className="text-[10px] text-coffee-500 dark:text-coffee-400 uppercase tracking-wider shrink-0">
              {equipment.brand}
            </span>
          )}
        </div>
        <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20">
          {categoryLabels[equipment.category] ?? equipment.category}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-coffee-100 dark:border-coffee-800">
          <button
            onClick={() => onEdit(equipment)}
            className="flex items-center gap-1 text-[11px] text-coffee-500 hover:text-gold-500 transition-colors px-2 py-1"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
          <button
            onClick={() => onDelete(equipment.id)}
            className="flex items-center gap-1 text-[11px] text-coffee-500 hover:text-red-500 transition-colors px-2 py-1"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        </div>
      </div>
    </motion.div>
  );
}
