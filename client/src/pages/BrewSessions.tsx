import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ChevronRight, Clock } from 'lucide-react';
import { brewApi } from '@12porciento/shared';
import type { BrewSession } from '@12porciento/shared';
import { useUser } from '../context/UserContext';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

export default function BrewSessions() {
  const user = useUser((s) => s.user);

  const [sessions, setSessions] = useState<BrewSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  function load() {
    if (!user) return;
    setError(null);
    setLoading(true);
    const filters = {
      pageSize: '30',
      favorites: filter === 'favorites' ? 'true' : undefined,
    };
    brewApi
      .listSessions(filters)
      .then((r) => {
        setSessions(r.data.data);
        setTotal(r.data.total);
      })
      .catch((err) => {
        console.error('BrewSessions load error:', err);
        setError('No pudimos cargar tus preparaciones. Revisa tu conexión.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, filter]);

  if (!user) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Inicia sesión"
          description="Necesitas una cuenta para registrar preparaciones."
          action={
            <Link to="/login?redirect=/brew/sesiones" className="btn-primary">
              Iniciar sesión
            </Link>
          }
        />
      </div>
    );
  }

  const visible = sessions;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              Mis preparaciones
            </p>
            <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
              Journal
            </h1>
          </div>
          <div className="flex gap-2">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              Todas ({total})
            </FilterChip>
            <FilterChip active={filter === 'favorites'} onClick={() => setFilter('favorites')}>
              Favoritas
            </FilterChip>
          </div>
        </header>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800"
              />
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Sin acceso por ahora" description={error} onRetry={load} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={filter === 'favorites' ? 'Sin favoritas' : 'Sin preparaciones aún'}
            description={
              filter === 'favorites'
                ? 'Marca preparaciones con la estrella para verlas aquí.'
                : 'Inicia una sesión para empezar tu historial.'
            }
            action={
              <Link to="/brew/preparar" className="btn-primary">
                Preparar café
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/brew/sesiones/${s.id}`}
                  className="group flex items-center gap-4 border border-coffee-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-950 sm:p-4"
                >
                  <MediaFrame
                    ratio="avatar"
                    src={s.coffee?.imageUrl}
                    alt={s.coffee?.name ?? 'Café'}
                    className="h-14 w-14 shrink-0 rounded sm:h-16 sm:w-16"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-coffee-900 dark:text-cream sm:text-lg">
                      {s.recipe?.title ?? 'Receta libre'}
                      {s.coffee && (
                        <span className="text-coffee-500 dark:text-coffee-400">
                          {' '}
                          · {s.coffee.name}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-coffee-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(s.createdAt).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {s.brewMethod?.name && (
                        <>
                          <span>·</span>
                          <span>{s.brewMethod.name}</span>
                        </>
                      )}
                      {s.coffeeDoseGrams && s.waterGrams && (
                        <>
                          <span>·</span>
                          <span>
                            {s.coffeeDoseGrams}g · {s.waterGrams}g · 1:{s.ratio}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.rating != null && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-coffee-700 dark:text-coffee-200">
                        <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
                        {s.rating}/5
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-coffee-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? 'border-gold-500 bg-gold-500 text-coffee-950'
          : 'border-coffee-200 text-coffee-700 hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-300'
      }`}
    >
      {children}
    </button>
  );
}
