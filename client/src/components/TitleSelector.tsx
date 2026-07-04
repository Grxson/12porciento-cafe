import { useEffect, useState } from 'react';
import { Lock, Trophy } from 'lucide-react';
import { baristaApi } from '../api';

interface TitleItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  isUnlocked: boolean;
  isActive: boolean;
}

interface TitleSelectorProps {
  onSelect?: (titleId: string | null) => void;
}

function TitleSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 space-y-3"
        >
          <div className="shimmer dark:shimmer-dark w-10 h-10 rounded-full" />
          <div className="shimmer dark:shimmer-dark h-4 w-3/4" />
          <div className="shimmer dark:shimmer-dark h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function TitleSelector({ onSelect }: TitleSelectorProps) {
  const [titles, setTitles] = useState<TitleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await baristaApi.getTitles();
        if (!cancelled) setTitles(res.data.data ?? []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = (t: TitleItem) => {
    if (!t.isUnlocked) return;
    onSelect?.(t.isActive ? null : t.id);
  };

  if (loading) return <TitleSkeleton />;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-coffee-500 text-sm mb-3">No se pudieron cargar los títulos.</p>
        <button
          onClick={() => {
            setError(false);
            setLoading(true);
            baristaApi
              .getTitles()
              .then((res) => setTitles(res.data.data ?? []))
              .catch(() => setError(true))
              .finally(() => setLoading(false));
          }}
          className="text-xs text-gold-500 hover:text-gold-400 underline transition-colors"
          aria-label="Reintentar carga de títulos"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (titles.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-10 h-10 text-coffee-700 mx-auto mb-2" aria-hidden="true" />
        <p className="text-coffee-500 text-sm">No hay títulos disponibles.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {titles.map((t) => (
        <button
          key={t.id}
          onClick={() => handleClick(t)}
          disabled={!t.isUnlocked}
          className={`bg-white dark:bg-coffee-900 border p-4 text-left transition-all ${
            t.isActive
              ? 'border-gold-500 ring-1 ring-gold-500'
              : t.isUnlocked
                ? 'border-coffee-200 dark:border-coffee-800 hover:border-gold-400 dark:hover:border-gold-500 cursor-pointer'
                : 'border-coffee-200 dark:border-coffee-800 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className={`text-2xl select-none ${t.isUnlocked ? '' : 'grayscale opacity-40'}`}>
              {t.icon}
            </span>
            {t.isActive && (
              <span className="text-[10px] uppercase tracking-wider bg-gold-500 text-cream px-1.5 py-0.5 font-medium">
                ACTIVO
              </span>
            )}
          </div>
          <h3
            className={`font-serif text-sm mb-0.5 ${
              t.isUnlocked ? 'text-coffee-900 dark:text-cream' : 'text-coffee-500'
            }`}
          >
            {t.name}
          </h3>
          {!t.isUnlocked && (
            <span className="text-coffee-400 text-xs">
              <Lock aria-hidden="true" className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
              Bloqueado
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
