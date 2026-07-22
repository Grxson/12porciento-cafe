import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  message?: string | null;
}

export default function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}
