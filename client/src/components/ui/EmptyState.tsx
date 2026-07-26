import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-5 text-gold-500">{icon}</div>}
      <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-coffee-600 dark:text-coffee-400">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
