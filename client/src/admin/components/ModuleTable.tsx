import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { usePagination } from '../hooks/usePagination';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => ReactNode;
  width?: string;
}

interface ModuleTableProps<T extends { id: string }> {
  items: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  pageSize?: number;
  loading?: boolean;
}

export default function ModuleTable<T extends { id: string }>({
  items,
  columns,
  onEdit,
  onDelete,
  selectable,
  selected,
  onToggleSelect,
  pageSize = 10,
  loading,
}: ModuleTableProps<T>) {
  const pagination = usePagination(items, pageSize);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="text-center text-coffee-500 py-10">No hay registros.</div>;
  }

  // Whether all rows on the current page are selected (controls the header checkbox)
  const allPageSelected = pagination.pageItems.length > 0 &&
    pagination.pageItems.every((item) => selected?.has(item.id));

  const handleHeaderToggle = (checked: boolean) => {
    pagination.pageItems.forEach((item) => {
      const isSelected = selected?.has(item.id) ?? false;
      // Only toggle rows whose state differs from the desired state
      if (checked !== isSelected) onToggleSelect?.(item.id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-coffee-200 dark:border-coffee-800 bg-coffee-100 dark:bg-coffee-900">
              {selectable && (
                <th className="px-4 py-2 text-left w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-gold-500"
                    checked={allPageSelected}
                    onChange={(e) => handleHeaderToggle(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-2 text-left text-coffee-600 dark:text-coffee-400 font-medium"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-4 py-2 text-left text-coffee-600 dark:text-coffee-400 font-medium">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((item) => (
              <tr key={item.id} className="border-b border-coffee-200 dark:border-coffee-800 bg-white dark:bg-coffee-800 hover:bg-coffee-50 dark:hover:bg-coffee-700 transition-colors">
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected?.has(item.id) || false}
                      onChange={() => onToggleSelect?.(item.id)}
                      className="w-4 h-4 accent-gold-500"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-coffee-900 dark:text-cream">
                    {col.render ? col.render((item as any)[col.key], item) : (item as any)[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-gold-400 hover:text-gold-300 text-xs px-2 py-1 border border-coffee-200 dark:border-coffee-700 transition-colors"
                        >
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="text-red-400 hover:text-red-300 p-1 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800">
          <span className="text-xs text-coffee-600 dark:text-coffee-400">
            Página {pagination.page} de {pagination.totalPages} ({items.length} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={pagination.prevPage}
              className="p-1 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream disabled:opacity-50 transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={pagination.nextPage}
              className="p-1 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream disabled:opacity-50 transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
