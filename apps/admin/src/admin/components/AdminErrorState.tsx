import { AlertCircle, RefreshCw } from 'lucide-react';

interface AdminErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function AdminErrorState({ error, onRetry }: AdminErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
      <p className="text-coffee-700 dark:text-coffee-300 mb-4 max-w-sm">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-outline flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      )}
    </div>
  );
}