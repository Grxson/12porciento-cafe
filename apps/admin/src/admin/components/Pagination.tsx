import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-2 text-sm border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-400 dark:hover:border-coffee-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </button>
      <span className="text-sm text-coffee-600 dark:text-coffee-400">
        Página {page} de {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-2 text-sm border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-400 dark:hover:border-coffee-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Siguiente
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
