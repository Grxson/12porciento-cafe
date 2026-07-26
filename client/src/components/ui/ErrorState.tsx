import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = 'No pudimos cargar esto',
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"
    >
      <AlertTriangle aria-hidden="true" className="mb-4 h-9 w-9 text-amber-500" />
      <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-coffee-600 dark:text-coffee-400">
        {description}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-6">
          Reintentar
        </button>
      )}
    </div>
  );
}
