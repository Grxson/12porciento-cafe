import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Coffee,
  Heart,
  Lock,
  Star,
  Clock,
  Download,
  Play,
  ChevronLeft,
  WifiOff,
  Thermometer,
  SlidersHorizontal,
  Scale,
} from 'lucide-react';
import { recipesApi, recipeRatingsApi } from '../api';
import { useUser } from '../context/UserContext';
import type { Recipe, RecipeRating } from '../types';
const RecipeLiveMode = lazy(() => import('../components/recipes/RecipeLiveMode'));
import StepVideoPlayer from '../components/recipes/StepVideoPlayer';
import MediaFrame from '../components/ui/MediaFrame';
import AttemptsList from '../components/recipes/AttemptsList';
import MethodIcon from '../components/recipes/MethodIcon';
import { downloadRecipePDF } from '../utils/recipePdf';
import { useRecipeFavorites } from '../hooks/useRecipeFavorites';
import { useBrewedRecipes } from '../hooks/useBrewedRecipes';
import { PageMeta } from '../hooks/usePageMeta';
import { getCachedResponse } from '../lib/cacheHelper';

const DIFFICULTY_COLORS: Record<string, string> = {
  FÁCIL:
    'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-400 dark:border-green-500/30',
  MEDIA:
    'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-500/30',
  DIFÍCIL:
    'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-400 dark:border-red-500/30',
};

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const hasSubscription = useUser((s) => s.hasSubscription);
  const user = useUser((s) => s.user);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [liveRecipeId, setLiveRecipeId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<RecipeRating[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [relatedRecipes, setRelatedRecipes] = useState<Recipe[]>([]);
  const { toggle: toggleFavorite, isFavorite } = useRecipeFavorites();
  const { hasBrewed } = useBrewedRecipes();
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [portions, setPortions] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [checkedEquipment, setCheckedEquipment] = useState<Set<string>>(new Set());

  const toggleChecked = (set: Set<string>, id: string, apply: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  useEffect(() => {
    if (!slug) return;
    setError(null);
    setFromCache(false);
    recipesApi
      .getBySlug(slug)
      .then((r) => {
        setRecipe(r.data.data);
        setLoading(false);
      })
      .catch(async () => {
        const cached = await getCachedResponse<{ data: Recipe }>(`/recipes/by-slug/${slug}`);
        if (cached) {
          setRecipe(cached.data);
          setFromCache(true);
          setLoading(false);
          return;
        }
        setError('No se pudo cargar la receta.');
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!recipe) return;
    recipesApi
      .getRelated(recipe.id)
      .then((r) => setRelatedRecipes(r.data.data))
      .catch(() => {});
  }, [recipe]);

  useEffect(() => {
    if (!recipe) return;
    recipeRatingsApi
      .get(recipe.id)
      .then((r) => {
        setRatings(r.data.data);
        setAvgRating(r.data.average);
        setRatingCount(r.data.count);
        const mine = r.data.data.find((rt) => rt.user.id === user?.id);
        if (mine) {
          setUserRating(mine.rating);
          setUserComment(mine.comment || '');
        }
      })
      .catch(() => {});
  }, [recipe?.id, user?.id]);

  useEffect(() => {
    if (!recipe) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        const idx = Number((topMost.target as HTMLElement).dataset.stepIndex);
        setActiveStepIndex(idx);
      },
      { rootMargin: '-112px 0px -70% 0px', threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [recipe]);

  if (error) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4">
        <PageMeta title="Receta no encontrada" />
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
          <Link
            to="/recetas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a recetas
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
        <PageMeta title="Receta" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <div className="shimmer dark:shimmer-dark h-3 w-32 mx-auto" />
            <div className="shimmer dark:shimmer-dark h-9 w-48 mx-auto" />
            <div className="shimmer dark:shimmer-dark h-4 w-64 mx-auto" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 space-y-3"
              >
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

  if (!recipe) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4">
        <PageMeta title="Receta no encontrada" />
        <div className="text-center max-w-md">
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-4">Receta no encontrada.</p>
          <Link
            to="/recetas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a recetas
          </Link>
        </div>
      </div>
    );
  }

  const isLocked = recipe.isPremium && !hasSubscription;
  const stepsTotalSeconds = recipe.steps.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
      <PageMeta
        title={recipe.title}
        description={recipe.description || `Aprende a preparar ${recipe.title} paso a paso.`}
      />
      <div className="max-w-4xl mx-auto">
        <Link
          to="/recetas"
          className="inline-flex items-center gap-2 text-coffee-600 dark:text-coffee-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors mb-8 text-xs uppercase tracking-wider font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a recetas
        </Link>

        {fromCache && (
          <div className="mb-6 px-4 py-2.5 bg-gold-500/10 border border-gold-500/30 text-gold-700 dark:text-gold-400 text-xs rounded flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            Mostrando versión guardada sin conexión. Algunos datos pueden no estar actualizados.
          </div>
        )}

        <div className="mb-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="text-gold-600 dark:text-gold-400">
              <MethodIcon method={recipe.method} />
            </div>
            <div className="flex-1">
              <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2">
                {recipe.title}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-coffee-600 dark:text-coffee-400">
                  {recipe.method}
                </span>
                {recipe.prepTime && (
                  <span className="flex items-center gap-1 text-sm text-coffee-600 dark:text-coffee-400">
                    <Clock className="w-4 h-4" /> {recipe.prepTime} min
                  </span>
                )}
                {recipe.difficulty && (
                  <span
                    className={`text-xs px-2 py-1 border rounded-sm ${DIFFICULTY_COLORS[recipe.difficulty] ?? ''}`}
                  >
                    {recipe.difficulty}
                  </span>
                )}
                {recipe.isPremium && (
                  <span className="text-xs px-2 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-600 dark:text-gold-400 uppercase tracking-wider">
                    Premium
                  </span>
                )}
                {hasBrewed(recipe.id) && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 text-green-600 dark:text-green-400">
                    ☕ <span className="font-bold uppercase tracking-wider">Ya preparaste</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleFavorite(recipe.id)}
                className={`p-2 transition-colors ${isFavorite(recipe.id) ? 'text-red-500 hover:text-red-400' : 'text-coffee-600 dark:text-coffee-400 hover:text-red-400'}`}
                title={isFavorite(recipe.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              >
                <Heart className={`w-5 h-5 ${isFavorite(recipe.id) ? 'fill-current' : ''}`} />
              </button>
              {!isLocked && (
                <button
                  onClick={() => downloadRecipePDF(recipe)}
                  className="p-2 text-coffee-600 dark:text-coffee-400 hover:text-gold-700 dark:hover:text-gold-400 transition-colors"
                  title="Descargar PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {recipe.description && (
            <p className="text-coffee-600 dark:text-coffee-400 text-base leading-relaxed mb-6">
              {recipe.description}
            </p>
          )}

          {!isLocked && (
            <button
              onClick={() => setLiveRecipeId(recipe.id)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gold-500 text-coffee-950 font-bold uppercase tracking-wider text-sm hover:bg-gold-400 transition-colors"
            >
              <Play className="w-5 h-5 fill-current" /> Empezar modo en vivo
            </button>
          )}
        </div>

        {isLocked ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gold-500/20 bg-gold-500/5 p-8 text-center"
          >
            <Lock className="w-12 h-12 text-gold-500 mx-auto mb-4" />
            <p className="text-coffee-900 dark:text-cream font-serif text-2xl mb-2">
              Receta exclusiva
            </p>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6 max-w-lg mx-auto">
              Esta receta está disponible solo para suscriptores. Suscríbete a 12% para acceder a
              todas las recetas premium y más contenido exclusivo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/suscripciones"
                className="px-6 py-3 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
              >
                Ver planes de suscripción
              </Link>
              <Link
                to="/recetas"
                className="px-6 py-3 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream text-xs font-semibold uppercase tracking-wider hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-colors"
              >
                Ver otras recetas
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {(recipe.product ||
              recipe.temp ||
              recipe.grind ||
              recipe.ratio ||
              recipe.yield ||
              (recipe.ingredients && recipe.ingredients.length > 0) ||
              (recipe.equipment && recipe.equipment.length > 0)) && (
              <div className="bg-coffee-100 dark:bg-coffee-800/30 border border-coffee-200 dark:border-coffee-800 p-5">
                <h2 className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider font-semibold mb-4">
                  Lo que necesitas
                </h2>
                {recipe.product && (
                  <Link
                    to={`/tienda/${recipe.product.slug}`}
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity mb-4 pb-4 border-b border-coffee-200 dark:border-coffee-700"
                  >
                    <MediaFrame
                      src={recipe.product.imageUrl}
                      alt={recipe.product.name}
                      ratio="avatar"
                      className="h-14 w-14 shrink-0 rounded"
                    />
                    <div>
                      <p className="text-gold-600 dark:text-gold-400 font-medium text-sm">
                        {recipe.product.name}
                      </p>
                      <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">
                        Café recomendado · Ver en tienda →
                      </p>
                    </div>
                  </Link>
                )}
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-coffee-200 dark:border-coffee-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-coffee-500 uppercase tracking-wider">
                        Ingredientes
                      </p>
                      <div className="flex gap-1">
                        {[1, 2, 4].map((n) => (
                          <button
                            key={n}
                            onClick={() => setPortions(n)}
                            className={`px-2 py-0.5 text-xs border transition-colors ${
                              portions === n
                                ? 'border-gold-500 text-gold-600 dark:text-gold-400 bg-gold-500/10'
                                : 'border-coffee-200 dark:border-coffee-700 text-coffee-500 dark:text-coffee-400 hover:border-gold-500/50'
                            }`}
                          >
                            x{n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {recipe.ingredients.map((ing) => {
                        const checked = checkedIngredients.has(ing.id);
                        const amount = ing.amount != null ? ing.amount * portions : null;
                        return (
                          <li key={ing.id}>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleChecked(checkedIngredients, ing.id, setCheckedIngredients)
                                }
                                className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0"
                              />
                              <span
                                className={`text-sm ${checked ? 'line-through text-coffee-400 dark:text-coffee-600' : 'text-coffee-900 dark:text-cream'}`}
                              >
                                {ing.name}
                                {(amount != null || ing.unit) && (
                                  <span className="text-coffee-500 dark:text-coffee-400">
                                    {' '}
                                    — {amount ?? ''} {ing.unit ?? ''}
                                  </span>
                                )}
                                {ing.note && (
                                  <span className="block text-xs text-coffee-500 dark:text-coffee-400">
                                    {ing.note}
                                  </span>
                                )}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {recipe.equipment && recipe.equipment.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-coffee-200 dark:border-coffee-700">
                    <p className="text-[10px] text-coffee-500 uppercase tracking-wider mb-2">
                      Equipo
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {recipe.equipment.map((item) => {
                        const checked = checkedEquipment.has(item.id);
                        return (
                          <li key={item.id}>
                            <label
                              className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs cursor-pointer transition-colors ${
                                checked
                                  ? 'border-gold-500/50 bg-gold-500/10 text-coffee-400 dark:text-coffee-600 line-through'
                                  : 'border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleChecked(checkedEquipment, item.id, setCheckedEquipment)
                                }
                                className="w-3.5 h-3.5 accent-gold-500"
                              />
                              {item.name}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {(recipe.temp || recipe.grind || recipe.ratio || recipe.yield) && (
                  <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Temperatura', value: recipe.temp, Icon: Thermometer },
                      { label: 'Molienda', value: recipe.grind, Icon: SlidersHorizontal },
                      { label: 'Ratio', value: recipe.ratio, Icon: Scale },
                      { label: 'Rendimiento', value: recipe.yield, Icon: Coffee },
                    ]
                      .filter((x) => x.value)
                      .map((x) => (
                        <li key={x.label} className="flex items-center gap-2">
                          <x.Icon className="w-4 h-4 text-gold-600 dark:text-gold-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-coffee-500 uppercase tracking-wider">
                              {x.label}
                            </p>
                            <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                              {x.value}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream">Pasos</h2>
                {stepsTotalSeconds > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-coffee-600 dark:text-coffee-400">
                    <Clock className="w-3.5 h-3.5" />
                    {recipe.steps.length} pasos · ~{Math.round(stepsTotalSeconds / 60)} min total
                  </span>
                )}
              </div>
              {recipe.steps.length > 2 && activeStepIndex !== null && (
                <div
                  className="sticky z-20 -mx-4 px-4 py-2 bg-coffee-50/95 dark:bg-coffee-950/95 backdrop-blur-sm border-b border-coffee-200 dark:border-coffee-800"
                  style={{ top: 'calc(var(--app-header-height) + var(--app-safe-top))' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-xs font-medium text-coffee-700 dark:text-coffee-300">
                      Paso {activeStepIndex + 1} de {recipe.steps.length}
                    </span>
                    <span className="text-xs text-coffee-500">
                      {recipe.steps[activeStepIndex]?.title}
                    </span>
                  </div>
                  <div className="h-1 bg-coffee-200 dark:bg-coffee-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold-500 transition-all duration-300"
                      style={{
                        width: `${((activeStepIndex + 1) / recipe.steps.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-0">
                {recipe.steps.map((step, i) => (
                  <div
                    key={step.id}
                    ref={(el) => {
                      stepRefs.current[i] = el;
                    }}
                    data-step-index={i}
                    className="flex gap-4 relative"
                  >
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center z-10">
                        <span className="text-gold-600 dark:text-gold-400 text-sm font-bold">
                          {i + 1}
                        </span>
                      </div>
                      {i < recipe.steps.length - 1 && (
                        <div className="w-px flex-1 bg-coffee-200 dark:bg-coffee-800 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-coffee-900 dark:text-cream font-medium mb-2">
                        {step.title}
                      </p>
                      <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed mb-3">
                        {step.description}
                      </p>
                      {step.duration && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 mb-3 bg-coffee-100 dark:bg-coffee-800/50 rounded-full text-xs text-coffee-600 dark:text-coffee-400">
                          <Clock className="w-3 h-3" /> {step.duration}s
                        </span>
                      )}
                      {step.imageUrl && (
                        <MediaFrame
                          src={step.imageUrl}
                          alt={step.title}
                          ratio="recipe"
                          className="mb-3 !aspect-auto max-h-96 rounded-lg"
                        />
                      )}
                      {step.videoUrl && <StepVideoPlayer url={step.videoUrl} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {user && (
              <div className="border-t border-coffee-200 dark:border-coffee-800 pt-6">
                <AttemptsList recipeId={recipe.id} userId={user.id} />
              </div>
            )}

            <div className="border-t border-coffee-200 dark:border-coffee-800 pt-6">
              <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">
                Valoraciones
              </h2>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'text-gold-500 fill-gold-500' : 'text-coffee-400 dark:text-coffee-600'}`}
                    />
                  ))}
                </div>
                <span className="text-coffee-900 dark:text-cream text-lg font-semibold">
                  {avgRating}
                </span>
                <span className="text-coffee-600 dark:text-coffee-400 text-sm">
                  ({ratingCount} {ratingCount === 1 ? 'valoración' : 'valoraciones'})
                </span>
              </div>

              {ratingCount > 0 && (
                <div className="space-y-1.5 mb-6 max-w-sm">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratings.filter((r) => r.rating === star).length;
                    const pct = ratingCount ? Math.round((count / ratingCount) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-coffee-600 dark:text-coffee-400">{star}</span>
                        <Star className="w-3 h-3 text-gold-500 fill-gold-500 shrink-0" />
                        <div className="flex-1 h-1.5 bg-coffee-200 dark:bg-coffee-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold-500 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-coffee-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {user && (
                <div className="bg-coffee-100 dark:bg-coffee-800/50 p-5 mb-6">
                  <p className="text-coffee-900 dark:text-cream text-sm font-medium mb-3">
                    {userRating ? 'Tu valoración' : 'Valora esta receta'}
                  </p>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserRating(star)}
                        className={`p-0.5 transition-colors ${star <= userRating ? 'text-gold-500' : 'text-coffee-400 dark:text-coffee-600'} hover:text-gold-400`}
                      >
                        <Star className={`w-6 h-6 ${star <= userRating ? 'fill-gold-500' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder="Comentario (opcional)"
                    rows={3}
                    className="w-full bg-white dark:bg-coffee-900 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm p-3 mb-3 resize-none focus:outline-none focus:border-gold-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!userRating || submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        try {
                          await recipeRatingsApi.upsert(recipe.id, {
                            rating: userRating,
                            comment: userComment || undefined,
                          });
                          const r = await recipeRatingsApi.get(recipe.id);
                          setRatings(r.data.data);
                          setAvgRating(r.data.average);
                          setRatingCount(r.data.count);
                        } catch {
                          /* ignore */
                        }
                        setSubmitting(false);
                      }}
                      className="px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Guardando…' : userRating ? 'Guardar' : 'Valorar'}
                    </button>
                    {ratings.some((r) => r.user.id === user.id) && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await recipeRatingsApi.remove(recipe.id);
                            setUserRating(0);
                            setUserComment('');
                            const r = await recipeRatingsApi.get(recipe.id);
                            setRatings(r.data.data);
                            setAvgRating(r.data.average);
                            setRatingCount(r.data.count);
                          } catch {
                            /* ignore */
                          }
                        }}
                        className="px-4 py-2 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream text-xs font-semibold uppercase tracking-wider hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )}

              {ratings.length > 0 && (
                <div className="space-y-4">
                  {ratings.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 pb-4 border-b border-coffee-200 dark:border-coffee-800 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold-600 dark:text-gold-400 text-xs font-bold uppercase">
                          {r.user.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-coffee-900 dark:text-cream text-sm font-medium truncate">
                            {r.user.name}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= r.rating ? 'text-gold-500 fill-gold-500' : 'text-coffee-400 dark:text-coffee-600'}`}
                              />
                            ))}
                          </div>
                        </div>
                        {r.comment && (
                          <p className="text-coffee-700 dark:text-coffee-300 text-sm">
                            {r.comment}
                          </p>
                        )}
                        <p className="text-coffee-500 dark:text-coffee-400 text-xs mt-1">
                          {new Date(r.createdAt).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ratings.length === 0 && (
                <p className="text-coffee-600 dark:text-coffee-400 text-sm">
                  Sé el primero en valorar esta receta.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {relatedRecipes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12"
          >
            <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">
              Recetas relacionadas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {relatedRecipes.map((r) => (
                <Link
                  key={r.id}
                  to={`/recetas/${r.slug}`}
                  className="border border-coffee-200 dark:border-coffee-800 hover:border-gold-500/50 transition-colors overflow-hidden"
                >
                  {r.imageUrl && (
                    <MediaFrame src={r.imageUrl} alt={r.title} ratio="recipe" className="mb-0" />
                  )}
                  <div className="p-4">
                    <p className="text-coffee-900 dark:text-cream text-sm font-medium truncate">
                      {r.title}
                    </p>
                    <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-1 flex items-center gap-1.5">
                      <MethodIcon method={r.method} className="w-3 h-3" /> {r.method}
                    </p>
                    {r.difficulty && (
                      <span
                        className={`inline-block text-xs px-1.5 py-0.5 mt-2 border rounded-sm ${DIFFICULTY_COLORS[r.difficulty] ?? ''}`}
                      >
                        {r.difficulty}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {liveRecipeId && (
          <Suspense fallback={null}>
            <RecipeLiveMode recipe={recipe} onClose={() => setLiveRecipeId(null)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
