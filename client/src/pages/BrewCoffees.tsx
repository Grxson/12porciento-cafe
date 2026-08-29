import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Coffee } from 'lucide-react';
import { api } from '@12porciento/shared';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';

interface CoffeeItem {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  origin?: string | null;
  region?: string | null;
  variety?: string | null;
  process?: string | null;
  roastLevel?: string | null;
}

export default function BrewCoffees() {
  const [coffees, setCoffees] = useState<CoffeeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: CoffeeItem[] }>('/products', { params: { category: 'CAFÉ', pageSize: '60' } })
      .then((r) => setCoffees(r.data.data ?? []))
      .catch(() => setCoffees([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            Cafés
          </p>
          <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            Elige un café para preparar
          </h1>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800"
              />
            ))}
          </div>
        ) : coffees.length === 0 ? (
          <EmptyState
            icon={<Coffee className="h-10 w-10" />}
            title="Sin cafés"
            description="Aún no hay cafés en el catálogo."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {coffees.map((c) => (
              <Link
                key={c.id}
                to={`/brew/cafes/${c.slug}`}
                className="group flex flex-col overflow-hidden border border-coffee-200 bg-white transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-950"
              >
                <MediaFrame ratio="product" src={c.imageUrl} alt={c.name} />
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <p className="font-serif text-base text-coffee-900 dark:text-cream">{c.name}</p>
                  {(c.origin || c.region) && (
                    <p className="text-xs text-coffee-500">
                      {[c.origin, c.region].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {(c.variety || c.process || c.roastLevel) && (
                    <p className="text-[10px] uppercase tracking-widest text-coffee-500">
                      {[c.variety, c.process, c.roastLevel].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-end pt-2 text-xs font-semibold text-gold-600 dark:text-gold-400">
                    Preparar <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
