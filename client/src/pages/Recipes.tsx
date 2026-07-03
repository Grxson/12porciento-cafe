import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassWater,
  Heart,
  Lock,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Play,
} from 'lucide-react';
import { recipesApi } from '../api';
import { useUser } from '../context/UserContext';
import type { Recipe, RecipeStep } from '../types';
import RecipeLiveMode from '../components/recipes/RecipeLiveMode';
import StepVideoPlayer from '../components/recipes/StepVideoPlayer';
import AttemptsList from '../components/recipes/AttemptsList';
import { downloadRecipePDF } from '../utils/recipePdf';
import { useRecipeFavorites } from '../hooks/useRecipeFavorites';
import { useBrewedRecipes } from '../hooks/useBrewedRecipes';
import { PageMeta } from '../hooks/usePageMeta';

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
  const user = useUser((s) => s.user);
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('TODOS');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('TODOS');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timerState, setTimerState] = useState<{
    recipeId: string;
    stepIndex: number;
    secondsLeft: number;
  } | null>(null);
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

  useEffect(() => {
    if (!timerState || timerState.secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setTimerState((prev) => {
        if (!prev || prev.secondsLeft <= 1) {
          const AudioCtx =
            window.AudioContext ||
            ((window as unknown as Record<string, unknown>).webkitAudioContext as
              typeof AudioContext | undefined);
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
          }
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  const hasMore = page < totalPages;

  // MUST be before early returns — hook #19
  useEffect(() => {
    if (expandedId) {
      const element = document.getElementById(`recipe-${expandedId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [expandedId]);

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
        <div className="max-w-4xl mx-auto">
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
      <div className="max-w-4xl mx-auto">
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

        <div className="mb-10">
          <input
            type="text"
            placeholder="Buscar recetas por nombre, método..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream placeholder-coffee-500 focus:outline-none focus:border-gold-500 transition-colors text-sm"
          />
        </div>

        <div className="mb-10">
          <div className="flex gap-2 flex-wrap justify-center mb-6">
            <button
              onClick={() => setDifficultyFilter('TODOS')}
              className={`px-4 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                difficultyFilter === 'TODOS'
                  ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                  : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-600'
              }`}
            >
              Todos
            </button>
            {(['FÁCIL', 'MEDIA', 'DIFÍCIL'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficultyFilter(d)}
                className={`px-4 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                  difficultyFilter === d
                    ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                    : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="space-y-4">
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

          {methodFilter !== 'TODOS' && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setMethodFilter('TODOS')}
                className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-coffee-700 dark:hover:text-coffee-300 underline transition-colors"
              >
                Limpiar filtro de método
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end mb-4">
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-1.5 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream focus:outline-none focus:border-gold-500 transition-colors"
          >
            <option value="default">Orden: por defecto</option>
            <option value="title">Nombre A-Z</option>
            <option value="prepTime">Tiempo (menor)</option>
            <option value="difficulty">Dificultad</option>
          </select>
        </div>

        {(methodFilter !== 'TODOS' || difficultyFilter !== 'TODOS' || search !== '') && (
          <div className="flex flex-wrap gap-2 items-center mb-4 -mt-6">
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
            {(methodFilter !== 'TODOS' || difficultyFilter !== 'TODOS' || search !== '') && (
              <button
                onClick={() => {
                  setMethodFilter('TODOS');
                  setDifficultyFilter('TODOS');
                  setSearch('');
                }}
                className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-coffee-700 dark:hover:text-coffee-300 underline transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>
        )}

        {recipes.length === 0 && !loading && (
          <p className="text-coffee-500 dark:text-coffee-400 text-center py-12">
            No hay recetas con esos filtros.
          </p>
        )}

        <div className="space-y-4">
          {recipes.map((recipe: Recipe) => {
            const isLocked = recipe.isPremium && !hasSubscription;
            const isExpanded = expandedId === recipe.id;

            return (
              <motion.div
                key={recipe.id}
                id={`recipe-${recipe.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border ${isLocked ? 'border-gold-500/20 bg-coffee-100/50 dark:bg-coffee-900/40' : 'border-coffee-200 dark:border-coffee-800 bg-white dark:bg-coffee-900'}`}
              >
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => !isLocked && setExpandedId(isExpanded ? null : recipe.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-gold-600 dark:text-gold-400">
                      <MethodIcon method={recipe.method} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/recetas/${recipe.slug}`}
                          className="text-coffee-900 dark:text-cream font-medium hover:text-gold-600 dark:hover:text-gold-400 transition-colors truncate"
                        >
                          {recipe.title}
                        </Link>
                        {recipe.isPremium && (
                          <span className="text-xs px-1.5 py-0.5 bg-gold-500/10 border border-gold-500/30 text-gold-600 dark:text-gold-400 uppercase tracking-wider shrink-0">
                            Premium
                          </span>
                        )}
                        {hasBrewed(recipe.id) && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 shrink-0">
                            ☕ Ya preparaste
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-coffee-600 dark:text-coffee-400">
                          {recipe.method}
                        </span>
                        {recipe.prepTime && (
                          <span className="flex items-center gap-1 text-xs text-coffee-600 dark:text-coffee-400">
                            <Clock className="w-3 h-3" /> {recipe.prepTime} min
                          </span>
                        )}
                        {recipe.difficulty && (
                          <span
                            className={`text-xs px-1.5 py-0.5 border rounded-sm ${DIFFICULTY_COLORS[recipe.difficulty] ?? ''}`}
                          >
                            {recipe.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(recipe.id);
                      }}
                      className={`p-1.5 transition-colors ${isFavorite(recipe.id) ? 'text-red-500 hover:text-red-400' : 'text-coffee-600 dark:text-coffee-400 hover:text-red-400'}`}
                      title={isFavorite(recipe.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite(recipe.id) ? 'fill-current' : ''}`} />
                    </button>
                    {!isLocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLiveRecipeId(recipe.id);
                        }}
                        className="p-1.5 text-coffee-600 dark:text-coffee-400 hover:text-gold-700 dark:hover:text-gold-400 transition-colors"
                        title="Modo en vivo"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {!isLocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadRecipePDF(recipe);
                        }}
                        className="p-1.5 text-coffee-600 dark:text-coffee-400 hover:text-gold-700 dark:hover:text-gold-400 transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-gold-500/50" />
                    ) : isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-coffee-600 dark:text-coffee-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-coffee-600 dark:text-coffee-400" />
                    )}
                  </div>
                </div>

                {isLocked && (
                  <div className="px-5 pb-5">
                    <div className="flex flex-col items-stretch gap-3 bg-gold-500/5 border border-gold-500/20 p-4">
                      <div className="flex items-start gap-3">
                        <Star className="w-5 h-5 text-gold-500 shrink-0 hidden sm:block mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                            Receta exclusiva para suscriptores
                          </p>
                          <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">
                            Suscríbete para acceder a todas las recetas premium y más.
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/suscripciones"
                        className="self-start px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
                      >
                        Desbloquear — Ver suscripciones →
                      </Link>
                    </div>
                    {recipe.steps?.length > 0 && recipe.steps[0] && (
                      <div className="mt-3 px-2 opacity-50">
                        <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1">
                          Paso 1 (vista previa)
                        </p>
                        <p className="text-coffee-700 dark:text-coffee-300 text-sm">
                          {recipe.steps[0].description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {isExpanded && !isLocked && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-coffee-200 dark:border-coffee-800"
                    >
                      <div className="p-5 space-y-6">
                        {(recipe.temp || recipe.grind || recipe.ratio || recipe.yield) && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Temperatura', value: recipe.temp },
                              { label: 'Molienda', value: recipe.grind },
                              { label: 'Ratio', value: recipe.ratio },
                              { label: 'Rendimiento', value: recipe.yield },
                            ]
                              .filter((x) => x.value)
                              .map((x) => (
                                <div
                                  key={x.label}
                                  className="bg-coffee-100 dark:bg-coffee-800/50 p-3 text-center"
                                >
                                  <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1">
                                    {x.label}
                                  </p>
                                  <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                                    {x.value}
                                  </p>
                                </div>
                              ))}
                          </div>
                        )}

                        <div className="space-y-5">
                          {recipe.steps.map((step: RecipeStep, i: number) => (
                            <div key={step.id} className="flex gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
                                <span className="text-gold-600 dark:text-gold-400 text-xs font-bold">
                                  {i + 1}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-coffee-900 dark:text-cream font-medium mb-1">
                                  {step.title}
                                </p>
                                <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed">
                                  {step.description}
                                </p>
                                {step.duration && (
                                  <p className="text-xs text-coffee-600 dark:text-coffee-400 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {step.duration}s
                                  </p>
                                )}
                                {step.imageUrl && (
                                  <img
                                    src={step.imageUrl}
                                    alt={step.title}
                                    className="mt-3 rounded-lg w-full max-h-64 object-cover"
                                  />
                                )}
                                {step.videoUrl && <StepVideoPlayer url={step.videoUrl} />}

                                {step.duration && !timerState && (
                                  <button
                                    onClick={() =>
                                      setTimerState({
                                        recipeId: recipe.id,
                                        stepIndex: i,
                                        secondsLeft: step.duration!,
                                      })
                                    }
                                    className="mt-2 flex items-center gap-1 px-3 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-600 dark:text-gold-400 text-xs hover:bg-gold-500/20 transition-colors"
                                  >
                                    <Clock className="w-3 h-3" /> Iniciar temporizador (
                                    {step.duration}s)
                                  </button>
                                )}

                                {timerState?.recipeId === recipe.id &&
                                  timerState?.stepIndex === i && (
                                    <div className="mt-3 p-3 bg-gold-500/10 border border-gold-500/30 rounded">
                                      <div className="text-center">
                                        <p className="text-xs text-gold-600 dark:text-gold-400 uppercase tracking-wider mb-1">
                                          Temporizador activo
                                        </p>
                                        <p className="text-3xl font-bold text-gold-600 dark:text-gold-400 font-mono">
                                          {timerState!.secondsLeft}s
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => setTimerState(null)}
                                        className="mt-2 w-full px-3 py-1 bg-red-600/30 border border-red-600/50 text-red-400 text-xs hover:bg-red-600/40 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {recipe.product && (
                          <div className="border-t border-coffee-200 dark:border-coffee-800 pt-4">
                            <p className="text-xs text-coffee-600 dark:text-coffee-400 mb-2">
                              Recomendado con:
                            </p>
                            <Link
                              to={`/tienda/${recipe.product.slug}`}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={recipe.product.imageUrl}
                                alt={recipe.product.name}
                                className="w-10 h-10 object-cover"
                              />
                              <span className="text-gold-600 dark:text-gold-400 text-sm">
                                {recipe.product.name}
                              </span>
                            </Link>
                          </div>
                        )}

                        {/* R11: Show login CTA if not logged in, otherwise show attempts */}
                        <AttemptsList recipeId={recipe.id} userId={user?.id} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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

      {/* Floating timer badge — visible when timer active on any recipe */}
      {timerState && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 bg-coffee-950/90 dark:bg-coffee-800/90 backdrop-blur-sm border border-gold-500/40 rounded shadow-lg text-xs">
          <span className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
          <span className="text-gold-400 font-mono font-bold">{timerState.secondsLeft}s</span>
          <button
            onClick={() => setTimerState(null)}
            className="ml-1 text-coffee-400 hover:text-red-400 transition-colors"
            aria-label="Cancelar temporizador"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
