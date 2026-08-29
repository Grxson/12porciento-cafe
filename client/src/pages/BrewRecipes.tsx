import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, Heart } from 'lucide-react';
import { brewApi, recipeFavoritesApi } from '@12porciento/shared';
import type { BrewMethod, BrewRecipeStructured, BrewRecipeProfile } from '@12porciento/shared';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const PROFILE_LABEL: Record<BrewRecipeProfile, string> = {
  BALANCED: 'Balanceado',
  SWEET: 'Dulce',
  BRIGHT: 'Brillante',
  FRUITY: 'Frutal',
  FLORAL: 'Floral',
  FULL_BODY: 'Cuerpo',
  CLEAN: 'Limpio',
  INTENSE: 'Intenso',
  REFRESHING: 'Refrescante',
  EXPERIMENTAL: 'Experimental',
};

export default function BrewRecipes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useUser((s) => s.user);
  const addToast = useToast((s) => s.add);
  const [methods, setMethods] = useState<BrewMethod[]>([]);
  const [recipes, setRecipes] = useState<BrewRecipeStructured[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const method = searchParams.get('method') || '';
  const profile = searchParams.get('profile') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const q = searchParams.get('search') || '';

  useEffect(() => {
    brewApi
      .listMethods()
      .then((r) => setMethods(r.data.data))
      .catch(() => setMethods([]));
  }, []);

  function loadRecipes() {
    setError(null);
    setLoading(true);
    brewApi
      .listRecipes({
        method: method || undefined,
        profile: profile || undefined,
        difficulty: difficulty || undefined,
        search: q || undefined,
        pageSize: '24',
      })
      .then((r) => {
        setRecipes(r.data.data);
        setTotal(r.data.total);
      })
      .catch((err) => {
        console.error('BrewRecipes load error:', err);
        setError('No pudimos cargar las recetas. Revisa tu conexión.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, profile, difficulty, q]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    recipeFavoritesApi
      .list()
      .then((r) => setFavoriteIds(new Set(r.data.data.map((f) => f.recipeId))))
      .catch(() => setFavoriteIds(new Set()));
  }, [user?.id]);

  async function toggleFavorite(e: React.MouseEvent, recipeId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      addToast('Inicia sesión para guardar favoritas', 'info');
      return;
    }
    const wasFavorite = favoriteIds.has(recipeId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
    try {
      if (wasFavorite) await recipeFavoritesApi.remove(recipeId);
      else await recipeFavoritesApi.add(recipeId);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(recipeId);
        else next.delete(recipeId);
        return next;
      });
      addToast('No se pudo actualizar la favorita', 'error');
    }
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            Recetas
          </p>
          <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            Catálogo
          </h1>
        </header>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
          <input
            value={q}
            onChange={(e) => setParam('search', e.target.value)}
            type="search"
            placeholder="Buscar recetas…"
            aria-label="Buscar recetas"
            className="w-full border border-coffee-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 dark:border-coffee-700 dark:bg-coffee-900 dark:text-cream"
          />
        </div>

        {/* Filter chips */}
        <div className="mb-6 space-y-3">
          <FilterRow
            label="Método"
            active={method}
            options={methods.map((m) => ({ value: m.name, label: m.name }))}
            onChange={(v) => setParam('method', v)}
          />
          <FilterRow
            label="Perfil"
            active={profile}
            options={Object.entries(PROFILE_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            onChange={(v) => setParam('profile', v)}
          />
          <FilterRow
            label="Dificultad"
            active={difficulty}
            options={[
              { value: 'FÁCIL', label: 'Fácil' },
              { value: 'MEDIA', label: 'Media' },
              { value: 'DIFÍCIL', label: 'Difícil' },
            ]}
            onChange={(v) => setParam('difficulty', v)}
          />
        </div>

        <p className="mb-4 text-xs text-coffee-500">
          {loading ? 'Buscando…' : `${total} receta${total === 1 ? '' : 's'}`}
        </p>

        {error && !loading ? (
          <ErrorState title="Sin resultados por ahora" description={error} onRetry={loadRecipes} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800"
              />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="Prueba quitar filtros o cambiar la búsqueda."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => (
              <Link
                key={r.id}
                to={`/brew/recetas/${r.slug}`}
                className="group relative flex flex-col overflow-hidden border border-coffee-200 bg-white transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lg dark:border-coffee-800 dark:bg-coffee-950"
              >
                <MediaFrame ratio="recipe" src={r.imageUrl ?? r.product?.imageUrl} alt={r.title} />
                {user && (
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, r.id)}
                    aria-label={favoriteIds.has(r.id) ? 'Quitar de favoritas' : 'Guardar favorita'}
                    className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border shadow-sm transition-colors ${
                      favoriteIds.has(r.id)
                        ? 'border-gold-500 bg-gold-500 text-coffee-950'
                        : 'border-coffee-200 bg-white/95 text-coffee-600 hover:border-gold-400 dark:border-coffee-700 dark:bg-coffee-950/95 dark:text-coffee-300'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${favoriteIds.has(r.id) ? 'fill-current' : ''}`} />
                  </button>
                )}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-coffee-500">
                    {r.brewMethod?.name && <span>{r.brewMethod.name}</span>}
                    {r.profile && (
                      <>
                        <span>·</span>
                        <span className="text-gold-600 dark:text-gold-400">
                          {PROFILE_LABEL[r.profile]}
                        </span>
                      </>
                    )}
                    {r.difficulty && (
                      <span className="rounded-full bg-coffee-100 px-1.5 py-0.5 text-[9px] dark:bg-coffee-800">
                        {r.difficulty}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">{r.title}</h3>
                  {(r.coffeeDoseGrams || r.waterGrams) && (
                    <p className="text-xs text-coffee-500">
                      {r.coffeeDoseGrams} g · {r.waterGrams} g · {r.waterTemperatureCelsius} °C
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between">
                    {r.featured && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
                        ★ Destacada
                      </span>
                    )}
                    <ChevronRight className="ml-auto h-4 w-4 text-coffee-400 transition-transform group-hover:translate-x-0.5" />
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

function FilterRow({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange('')}
        className={`rounded-full border px-3 py-1 text-xs ${
          !active
            ? 'border-gold-500 bg-gold-500 text-coffee-950'
            : 'border-coffee-200 text-coffee-700 hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-300'
        }`}
      >
        Todos
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-xs ${
            active === o.value
              ? 'border-gold-500 bg-gold-500 text-coffee-950'
              : 'border-coffee-200 text-coffee-700 hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
