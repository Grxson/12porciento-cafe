import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GlassWater,
  Heart,
  Lock,
  Star,
  Clock,
  ChevronRight,
  Download,
  Play,
  ChefHat,
  X,
} from 'lucide-react';
import { recipesApi } from '../api';
import { useUser } from '../context/UserContext';
import type { Recipe } from '../types';
import RecipeLiveMode from '../components/recipes/RecipeLiveMode';
import { downloadRecipePDF } from '../utils/recipePdf';
import { useRecipeFavorites } from '../hooks/useRecipeFavorites';
import { useBrewedRecipes } from '../hooks/useBrewedRecipes';
import { PageMeta } from '../hooks/usePageMeta';
import Breadcrumbs from '../components/Breadcrumbs';

function avgRating(ratings: { rating: number }[] | undefined): number {
  if (!ratings || ratings.length === 0) return 0;
  return Math.round(ratings.reduce((s, r) => s + r.rating, 0) / ratings.length);
}

function isNew(createdAt: string): boolean {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  return daysSince < 14;
}

function MethodIcon({ method }: { method: string }) {
  // R12: Method icons specific — map method → emoji
  const methodLower = method.toLowerCase();
  const emojis: Record<string, string> = {
    v60: '▽',
    chemex: '⬡',
    aerop: '⊕',
    french: '⊞',
    moka: '☕',
    cold: '🧊',
  };
  for (const [key, emoji] of Object.entries(emojis)) {
    if (methodLower.includes(key)) return <span className="text-lg leading-none">{emoji}</span>;
  }
  return <GlassWater className="w-4 h-4" />;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  FÁCIL:
    'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-400 dark:border-green-500/30',
  MEDIA:
    'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-500/30',
  DIFÍCIL:
    'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-400 dark:border-red-500/30',
};

const METHOD_CATEGORIES = {
  Filtro: ['V60', 'Chemex', 'Kalita Wave', 'Pour Over'],
  Inmersión: ['AeroPress', 'French Press', 'Cold Brew', 'Sifón'],
  Espresso: ['Espresso', 'Moka Pot'],
  Especiales: ['Café de Olla', 'Dalgona', 'Café Turco'],
};

export default function Recipes() {
  const hasSubscription = useUser((s) => s.hasSubscription);
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('TODOS');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('TODOS');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveRecipeId, setLiveRecipeId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>('default');
  const { toggle: toggleFavorite, isFavorite } = useRecipeFavorites();
  const { hasBrewed } = useBrewedRecipes();

  const fetchRecipes = useCallback(() => {
    setError(null);
    const params: Record<string, string | number | undefined> = { page, pageSize };
    if (methodFilter !== 'TODOS') params.method = methodFilter;
    if (difficultyFilter !== 'TODOS') params.difficulty = difficultyFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    if (sortBy !== 'default') {
      params.sortBy = sortBy;
    }
    recipesApi
      .list(params as Parameters<typeof recipesApi.list>[0])
      .then((r) => {
        setRecipes(r.data.data);
        setTotalPages(r.data.totalPages);
        setPageSize(r.data.pageSize);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudieron cargar las recetas.');
        setLoading(false);
      });
  }, [methodFilter, difficultyFilter, debouncedSearch, sortBy, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [methodFilter, difficultyFilter, debouncedSearch, sortBy]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // R7: URL filters persistent — read from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const method = params.get('method');
    const difficulty = params.get('difficulty');
    const searchQuery = params.get('search');

    if (method) setMethodFilter(method);
    if (difficulty) setDifficultyFilter(difficulty);
    if (searchQuery) {
      setSearch(decodeURIComponent(searchQuery));
      setDebouncedSearch(decodeURIComponent(searchQuery));
    }
  }, []); // run once on mount

  // R7: Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (methodFilter !== 'TODOS') params.set('method', methodFilter);
    if (difficultyFilter !== 'TODOS') params.set('difficulty', difficultyFilter);
    if (search) params.set('search', search);

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    window.history.replaceState(null, '', newUrl);
  }, [methodFilter, difficultyFilter, search]);

  // Debounce search input before triggering API call
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const hasMore = page < totalPages;

  if (error) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4">
        <PageMeta
          title="Recetas"
          description="Aprende a preparar café de especialidad en casa con guías paso a paso para V60, AeroPress y espresso."
        />
        <div className="text-center">
          <p className="text-red-400 dark:text-red-300 text-sm mb-4">{error}</p>
          <button
            aria-label="Reintentar carga de recetas"
            onClick={() => {
              setError(null);
              setLoading(true);
              recipesApi
                .list()
                .then((r) => {
                  setRecipes(r.data.data);
                  setLoading(false);
                })
                .catch(() => {
                  setError('No se pudieron cargar las recetas.');
                  setLoading(false);
                });
            }}
            className="px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
        <PageMeta
          title="Recetas"
          description="Aprende a preparar café de especialidad en casa con guías paso a paso para V60, AeroPress y espresso."
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <div className="shimmer dark:shimmer-dark h-3 w-32 mx-auto" />
            <div className="shimmer dark:shimmer-dark h-9 w-48 mx-auto" />
            <div className="shimmer dark:shimmer-dark h-4 w-64 mx-auto" />
          </div>
          <div className="shimmer dark:shimmer-dark h-10 w-full mb-10" />
          <div className="flex gap-2 justify-center mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer dark:shimmer-dark h-7 w-20" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 space-y-3"
              >
                <div className="flex gap-3">
                  <div className="shimmer dark:shimmer-dark h-5 w-16" />
                  <div className="shimmer dark:shimmer-dark h-5 w-12" />
                </div>
                <div className="shimmer dark:shimmer-dark h-7 w-2/3" />
                <div className="shimmer dark:shimmer-dark h-4 w-full" />
                <div className="shimmer dark:shimmer-dark h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
      <PageMeta
        title="Recetas"
        description="Aprende a preparar café de especialidad en casa con guías paso a paso para V60, AeroPress y espresso."
      />
      <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Recetas' }]} />
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">
            Guías de preparación
          </p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-4">Recetas</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm max-w-lg mx-auto">
            Desde espressos clásicos hasta métodos de filtrado de especialidad. Cada receta, paso a
            paso.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 xl:gap-10 lg:items-start">
          {/* Sidebar filters (desktop) + top filters (mobile) */}
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start space-y-6">
            <div>
              <h3 className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-[0.2em] mb-3 px-1">
                Búsqueda
              </h3>
              <input
                type="text"
                placeholder="Buscar recetas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream placeholder-coffee-500 focus:outline-none focus:border-gold-500 transition-colors text-sm min-h-11"
              />
            </div>

            <div>
              <h3 className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-[0.2em] mb-3 px-1">
                Dificultad
              </h3>
              <div className="space-y-1.5">
                {(['TODOS', 'FÁCIL', 'MEDIA', 'DIFÍCIL'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(d)}
                    className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wider border transition-colors ${
                      difficultyFilter === d
                        ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                        : 'border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 hover:border-gold-500/50'
                    }`}
                  >
                    {d === 'TODOS' ? 'Todas' : d}
                  </button>
                ))}
              </div>
            </div>

            {Object.entries(METHOD_CATEGORIES).map(([category, methods]) => (
              <div key={category}>
                <h3 className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-[0.2em] mb-3 px-1">
                  {category}
                </h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setMethodFilter('TODOS')}
                    className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wider border transition-colors ${
                      methodFilter === 'TODOS'
                        ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                        : 'border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 hover:border-gold-500/50'
                    }`}
                  >
                    Todas
                  </button>
                  {methods.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethodFilter(m)}
                      className={`w-full text-left px-3 py-2 text-xs uppercase tracking-wider border transition-colors ${
                        methodFilter === m
                          ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                          : 'border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 hover:border-gold-500/50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Mobile filters (top, stacked) */}
          <div className="lg:hidden space-y-6 mb-8">
            <input
              type="text"
              placeholder="Buscar recetas por nombre, método..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream placeholder-coffee-500 focus:outline-none focus:border-gold-500 transition-colors text-sm min-h-11"
            />

            <div
              className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ paddingLeft: 'var(--app-safe-left)', paddingRight: 'var(--app-safe-right)' }}
            >
              {(['TODOS', 'FÁCIL', 'MEDIA', 'DIFÍCIL'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className={`shrink-0 px-4 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                    difficultyFilter === d
                      ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                      : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-600'
                  }`}
                >
                  {d === 'TODOS' ? 'Todas' : d}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {Object.entries(METHOD_CATEGORIES).map(([category, methods]) => (
                <div key={category}>
                  <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-2">
                    {category}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {methods.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethodFilter(m)}
                        className={`px-4 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                          methodFilter === m
                            ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                            : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(methodFilter !== 'TODOS' || difficultyFilter !== 'TODOS' || search !== '') && (
                  <button
                    onClick={() => {
                      setMethodFilter('TODOS');
                      setDifficultyFilter('TODOS');
                      setSearch('');
                    }}
                    className="text-xs text-gold-500 hover:text-gold-400 transition-colors underline"
                  >
                    Limpiar filtros
                  </button>
                )}
                <span className="text-xs text-coffee-500 dark:text-coffee-400">
                  {recipes.length} {recipes.length === 1 ? 'receta' : 'recetas'}
                </span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-3 py-1.5 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream focus:outline-none focus:border-gold-500 transition-colors min-h-11"
              >
                <option value="default">Orden: por defecto</option>
                <option value="title">Nombre A-Z</option>
                <option value="prepTime">Tiempo (menor)</option>
                <option value="difficulty">Dificultad</option>
              </select>
            </div>

            {(methodFilter !== 'TODOS' || difficultyFilter !== 'TODOS' || search !== '') && (
              <div className="flex flex-wrap gap-2 items-center mb-4">
                {methodFilter !== 'TODOS' && (
                  <button
                    onClick={() => setMethodFilter('TODOS')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-coffee-100 dark:bg-coffee-800 border border-gold-500/30 text-coffee-900 dark:text-cream text-xs hover:bg-coffee-200 dark:hover:bg-coffee-700 transition-colors"
                  >
                    {methodFilter}
                    <span className="text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream">
                      ×
                    </span>
                  </button>
                )}
                {difficultyFilter !== 'TODOS' && (
                  <button
                    onClick={() => setDifficultyFilter('TODOS')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-coffee-100 dark:bg-coffee-800 border border-gold-500/30 text-coffee-900 dark:text-cream text-xs hover:bg-coffee-200 dark:hover:bg-coffee-700 transition-colors"
                  >
                    {difficultyFilter}
                    <span className="text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream">
                      ×
                    </span>
                  </button>
                )}
                {search !== '' && (
                  <button
                    onClick={() => setSearch('')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-coffee-100 dark:bg-coffee-800 border border-gold-500/30 text-coffee-900 dark:text-cream text-xs hover:bg-coffee-200 dark:hover:bg-coffee-700 transition-colors"
                  >
                    "{search}"
                    <span className="text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream">
                      ×
                    </span>
                  </button>
                )}
              </div>
            )}

            {recipes.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 border-2 border-gold-500 flex items-center justify-center">
                  <ChefHat className="w-10 h-10 text-gold-500" />
                </div>
                <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
                  Sin recetas con esos filtros
                </h2>
                <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-8 max-w-sm mx-auto">
                  Intenta ajustar los filtros
                </p>
                {methodFilter !== 'TODOS' || difficultyFilter !== 'TODOS' || search !== '' ? (
                  <Link to="/recetas" className="btn-primary inline-flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Limpiar filtros
                  </Link>
                ) : (
                  <button
                    onClick={() => fetchRecipes()}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    Actualizar
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:gap-7">
              {recipes.map((recipe: Recipe) => {
                const isLocked = recipe.isPremium && !hasSubscription;
                const rating = avgRating(recipe.ratings);

                return (
                  <motion.div
                    key={recipe.id}
                    id={`recipe-${recipe.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`group relative flex flex-col md:flex-row bg-white dark:bg-coffee-900 border ${
                      isLocked
                        ? 'border-gold-500/30'
                        : 'border-coffee-200 dark:border-coffee-800 hover:border-gold-500/50 hover:shadow-xl hover:shadow-coffee-900/5'
                    } transition-all duration-300 overflow-hidden`}
                  >
                    {/* Image */}
                    <Link
                      to={`/recetas/${recipe.slug}`}
                      className="relative block aspect-[4/3] md:aspect-auto md:w-[38%] md:min-h-[280px] lg:min-h-[320px] xl:min-h-[360px] flex-shrink-0 overflow-hidden bg-coffee-100 dark:bg-coffee-800"
                      onClick={(e) => isLocked && e.preventDefault()}
                    >
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-coffee-100 to-coffee-200 dark:from-coffee-800 dark:to-coffee-900">
                          <span className="text-5xl text-gold-500/40">
                            <MethodIcon method={recipe.method} />
                          </span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/60 via-transparent to-transparent" />

                      {/* Top-left badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {recipe.isPremium && (
                          <span className="px-2 py-1 bg-gold-500 text-coffee-950 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Premium
                          </span>
                        )}
                        {isNew(recipe.createdAt) && (
                          <span className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider">
                            🆕 Nueva
                          </span>
                        )}
                      </div>

                      {/* Top-right favorite */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(recipe.id);
                        }}
                        className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-coffee-950/60 hover:bg-coffee-950/80 backdrop-blur-sm transition-colors ${
                          isFavorite(recipe.id) ? 'text-red-500' : 'text-white hover:text-red-400'
                        }`}
                        title={
                          isFavorite(recipe.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'
                        }
                        aria-label={
                          isFavorite(recipe.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'
                        }
                      >
                        <Heart
                          className={`w-4 h-4 ${isFavorite(recipe.id) ? 'fill-current' : ''}`}
                        />
                      </button>

                      {/* Bottom method label */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-coffee-950/80 backdrop-blur-sm text-gold-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="text-sm">
                            <MethodIcon method={recipe.method} />
                          </span>
                          {recipe.method}
                        </span>
                      </div>

                      {/* Locked overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-coffee-950/40 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="text-center">
                            <Lock className="w-8 h-8 text-gold-500 mx-auto mb-2" />
                            <p className="text-cream text-xs font-medium uppercase tracking-wider">
                              Suscriptores
                            </p>
                          </div>
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 flex flex-col p-6 md:p-8 lg:p-9 xl:p-10">
                      <div className="flex items-center gap-2 mb-3 lg:mb-4 flex-wrap">
                        {recipe.isPremium && (
                          <span className="md:hidden px-2 py-0.5 bg-gold-500 text-coffee-950 text-[10px] font-bold uppercase tracking-wider">
                            Premium
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-coffee-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="text-sm">
                            <MethodIcon method={recipe.method} />
                          </span>
                          {recipe.method}
                        </span>
                        {recipe.difficulty ? (
                          <span
                            className={`px-2 py-0.5 border rounded-sm uppercase tracking-wider text-[10px] font-bold ${
                              DIFFICULTY_COLORS[recipe.difficulty] ?? ''
                            }`}
                          >
                            {recipe.difficulty}
                          </span>
                        ) : null}
                        {isNew(recipe.createdAt) && (
                          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                            🆕 Nueva
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/recetas/${recipe.slug}`}
                        className={`block font-serif text-2xl md:text-3xl lg:text-4xl leading-tight mb-3 lg:mb-4 ${
                          isLocked
                            ? 'text-coffee-700 dark:text-coffee-400 pointer-events-none'
                            : 'text-coffee-900 dark:text-cream hover:text-gold-600 dark:hover:text-gold-400 transition-colors'
                        }`}
                      >
                        {recipe.title}
                      </Link>

                      {recipe.description && (
                        <p className="text-sm md:text-base lg:text-lg text-coffee-600 dark:text-coffee-400 line-clamp-3 mb-5 lg:mb-6 leading-relaxed max-w-2xl">
                          {recipe.description}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center flex-wrap gap-x-5 lg:gap-x-8 gap-y-2 text-sm lg:text-base text-coffee-600 dark:text-coffee-400 mt-auto pt-4 lg:pt-5 border-t border-coffee-200/60 dark:border-coffee-800/60">
                        {recipe.prepTime ? (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{recipe.prepTime} min</span>
                          </span>
                        ) : null}
                        {rating > 0 ? (
                          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-bold text-coffee-700 dark:text-coffee-300">
                              {rating}
                            </span>
                          </span>
                        ) : null}
                        {hasBrewed(recipe.id) ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <span>☕</span>
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Ya preparaste
                            </span>
                          </span>
                        ) : null}
                      </div>

                      {/* Action buttons row */}
                      <div className="flex items-center gap-2 lg:gap-3 mt-5 lg:mt-6">
                        <Link
                          to={`/recetas/${recipe.slug}`}
                          className="flex-1 sm:flex-none sm:min-w-[180px] lg:min-w-[220px] min-h-11 lg:min-h-12 inline-flex items-center justify-center gap-2 bg-coffee-900 dark:bg-cream text-cream dark:text-coffee-900 text-xs lg:text-sm font-bold uppercase tracking-wider hover:bg-coffee-800 dark:hover:bg-white transition-colors px-6 lg:px-8"
                        >
                          {isLocked ? 'Vista previa' : 'Ver receta completa'}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        {!isLocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadRecipePDF(recipe);
                            }}
                            className="min-h-11 min-w-11 lg:min-h-12 lg:min-w-12 inline-flex items-center justify-center bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-coffee-300 hover:bg-gold-500 hover:text-coffee-950 transition-colors"
                            title="Descargar PDF"
                            aria-label="Descargar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {!isLocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLiveRecipeId(recipe.id);
                            }}
                            className="min-h-11 min-w-11 lg:min-h-12 lg:min-w-12 inline-flex items-center justify-center bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-coffee-300 hover:bg-gold-500 hover:text-coffee-950 transition-colors"
                            title="Modo en vivo"
                            aria-label="Modo en vivo"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* R13: Pagination — "Cargar más" button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-3 bg-gold-500/10 border border-gold-500/40 text-gold-600 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider hover:bg-gold-500/20 hover:border-gold-500 transition-colors"
                >
                  Cargar más
                </button>
              </div>
            )}

            {!hasSubscription && recipes.some((r) => r.isPremium) && (
              <div className="mt-8 text-center border border-gold-500/20 bg-gold-500/5 p-6">
                <Lock className="w-8 h-8 text-gold-500 mx-auto mb-3" />
                <p className="text-coffee-900 dark:text-cream font-medium mb-1">
                  Algunas recetas están bloqueadas. Suscríbete para acceso completo.
                </p>
                <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-4">
                  Desbloquea todas las recetas premium con una suscripción
                </p>
                <Link
                  to="/suscripciones"
                  className="inline-block px-6 py-3 bg-gold-500 text-coffee-950 text-xs font-bold uppercase tracking-wider hover:bg-gold-400 transition-colors"
                >
                  Ver planes de suscripción
                </Link>
              </div>
            )}

            {liveRecipeId && (
              <RecipeLiveMode
                recipe={recipes.find((r) => r.id === liveRecipeId)!}
                onClose={() => setLiveRecipeId(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
