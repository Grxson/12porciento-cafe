import { Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelect: () => void;
  loading?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  onDeleteSelected,
  onClearSelect,
  loading,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-gold-500/10 border border-gold-500/30 p-3 flex items-center justify-between mb-4">
      <span className="text-sm text-gold-400">{selectedCount} seleccionado(s)</span>
      <div className="flex gap-2">
        <button
          onClick={onClearSelect}
          disabled={loading}
          className="px-3 py-1 text-xs border border-coffee-700 text-coffee-400 hover:text-cream transition-colors disabled:opacity-50"
        >
          Limpiar
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={loading}
          className="px-3 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <Trash2 size={12} /> Eliminar seleccionados
        </button>
      </div>
    </div>
  );
}
