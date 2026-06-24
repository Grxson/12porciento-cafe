import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-coffee-600 dark:text-coffee-400 mb-6">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-coffee-500 dark:text-coffee-400" />}
          {crumb.to && i < crumbs.length - 1 ? (
            <Link to={crumb.to} className="text-coffee-700 dark:text-coffee-300 hover:text-gold-500 transition-colors tracking-wider uppercase">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-coffee-600 dark:text-coffee-400 tracking-wider uppercase">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
