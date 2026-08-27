/**
 * 12% Brew — Prepare page
 *
 * Three modes:
 *   - default: method picker + suggested recipes
 *   - ?recipe=: load recipe detail + RatioCalculator + "Iniciar preparación"
 *   - after session created: render GuidedBrew inline
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Beaker, ArrowRight, PlayCircle } from 'lucide-react';
import {
  brewApi,
  type BrewMethod,
  type BrewRecipeStructured,
  type BrewSession,
} from '@12porciento/shared';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';
import RatioCalculator from '../components/brew/RatioCalculator';
import GuidedBrew from '../components/brew/GuidedBrew';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

export default function BrewPrepare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useUser((s) => s.user);
  const addToast = useToast((s) => s.add);

  const recipeSlug = searchParams.get('recipe');
  const sessionParam = searchParams.get('session');

  const [methods, setMethods] = useState<BrewMethod[]>([]);
  const [recipes, setRecipes] = useState<BrewRecipeStructured[]>([]);
  const [recipe, setRecipe] = useState<BrewRecipeStructured | null>(null);
  const [session, setSession] = useState<BrewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Mode: method picker (default)
  useEffect(() => {
    if (recipeSlug || sessionParam) return;
    Promise.all([
      brewApi.listMethods().then((r) => r.data.data).catch(() => []),
      brewApi.listRecipes({ pageSize: '12' }).then((r) => r.data.data).catch(() => []),
    ]).then(([m, r]) => {
      setMethods(m);
      setRecipes(r);
      setLoading(false);
    });
  }, [recipeSlug, sessionParam]);

  // Mode: recipe detail
  useEffect(() => {
    if (!recipeSlug || sessionParam) return;
    setLoading(true);
    brewApi
      .getRecipe(recipeSlug)
      .then((r) => setRecipe(r.data.data))
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false));
  }, [recipeSlug, sessionParam]);

  // Mode: existing session → load and render GuidedBrew
  useEffect(() => {
    if (!sessionParam) return;
    setLoading(true);
    brewApi
      .getSession(sessionParam)
      .then((r) => {
        const s = r.data.data;
        setSession(s);
        if (s.recipeId && s.recipe) {
          return brewApi.getRecipe(s.recipe.slug).then((rec) => rec.data.data);
        }
        return null;
      })
      .then((rec) => {
        if (rec) setRecipe(rec);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [sessionParam]);

  async function startSession() {
    if (!recipe || !user) {
      if (!user) {
        addToast('Inicia sesión para guardar la preparación', 'info');
        navigate(`/login?redirect=/brew/preparar?recipe=${recipe?.slug ?? ''}`);
        return;
      }
      return;
    }
    setStarting(true);
    try {
      const r = await brewApi.startSession({
        recipeId: recipe.id,
        coffeeId: recipe.productId ?? undefined,
        brewMethodId: recipe.brewMethodId ?? undefined,
        coffeeDoseGrams: recipe.coffeeDoseGrams ?? undefined,
        waterGrams: recipe.waterGrams ?? undefined,
        ratio: recipe.ratio ?? undefined,
        temperatureCelsius: recipe.waterTemperatureCelsius ?? undefined,
      });
      setSession(r.data.data);
      navigate(`/brew/preparar?session=${r.data.data.id}`, { replace: true });
    } catch {
      addToast('No se pudo iniciar la sesión', 'error');
    } finally {
      setStarting(false);
    }
  }

  // ── Guided Brew (existing session) ──
  if (sessionParam && session && recipe) {
    return <GuidedBrew recipe={recipe} initialSession={session} />;
  }
  if (sessionParam && loading) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-coffee-500">Cargando preparación…</p>
      </div>
    );
  }
  if (sessionParam && !session) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Sesión no encontrada"
          description="La sesión que buscas no existe o no es tuya."
          action={
            <Link to="/brew/sesiones" className="btn-primary">
              Ver mis preparaciones
            </Link>
          }
        />
      </div>
    );
  }
  if (sessionParam && session && !recipe) {
    // Session exists but the recipe was unpublished/deleted after start.
    // We still keep the session data + snapshot — let the user finish the brew
    // with whatever they remember, or back out.
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            title="Receta no disponible"
            description="La receta original ya no está publicada. Tu sesión sigue guardada — puedes completarla manualmente o volver más tarde."
            action={
              <Link to="/brew/sesiones" className="btn-primary">
                Ver mis preparaciones
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // ── Recipe detail mode ──
  if (recipeSlug) {
    if (loading) {
      return (
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="h-64 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800" />
          </div>
        </div>
      );
    }
    if (!recipe) {
      return (
        <div className="px-4 py-16 sm:px-6 lg:px-8">
          <EmptyState
            title="Receta no encontrada"
            description="La receta no existe o no está publicada."
            action={
              <Link to="/brew/recetas" className="btn-primary">
                Ver recetas
              </Link>
            }
          />
        </div>
      );
    }

    const hasParams =
      recipe.coffeeDoseGrams != null && recipe.waterGrams != null;

    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            to={`/brew/recetas/${recipe.slug}`}
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-coffee-500 hover:text-gold-600"
          >
            ← Ver receta completa
          </Link>

          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              {recipe.brewMethod?.name ?? recipe.method}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
              Preparar: {recipe.title}
            </h1>
          </header>

          {recipe.imageUrl && (
            <MediaFrame
              ratio="banner"
              src={recipe.imageUrl}
              alt={recipe.title}
              className="mb-6 rounded"
            />
          )}

          {hasParams && (
            <div className="mb-6">
              <RatioCalculator
                initialCoffee={recipe.coffeeDoseGrams!}
                initialWater={recipe.waterGrams!}
                ratio={
                  recipe.ratio ??
                  Number((recipe.waterGrams! / recipe.coffeeDoseGrams!).toFixed(2))
                }
                steps={recipe.steps}
              />
            </div>
          )}

          <div className="sticky bottom-4 z-20 flex justify-center">
            <button
              type="button"
              onClick={startSession}
              disabled={starting}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base shadow-xl shadow-gold-500/30 disabled:opacity-60"
            >
              <PlayCircle className="h-5 w-5" />
              {starting ? 'Iniciando…' : 'Iniciar preparación'}
            </button>
          </div>

          {!user && (
            <p className="mt-3 text-center text-xs text-coffee-500">
              Necesitas iniciar sesión para guardar la preparación.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Default: method picker ──
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            Preparar
          </p>
          <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            Elige un método
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-coffee-600 dark:text-coffee-400">
            Selecciona cómo vas a preparar tu café. Luego elegiremos una receta afín.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-coffee-500">Cargando métodos…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {methods.map((m) => (
                <Link
                  key={m.id}
                  to={`/brew/recetas?method=${encodeURIComponent(m.name)}`}
                  className="group flex flex-col items-center gap-2 rounded-lg border border-coffee-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-coffee-100 text-2xl transition-colors group-hover:bg-gold-500/10 dark:bg-coffee-800">
                    {m.icon || <Beaker className="h-5 w-5" />}
                  </span>
                  <p className="text-sm font-semibold text-coffee-900 dark:text-cream">{m.name}</p>
                </Link>
              ))}
            </div>

            <section className="mt-12">
              <div className="mb-5 flex items-end justify-between">
                <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">
                  Recetas sugeridas
                </h2>
                <Link
                  to="/brew/recetas"
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gold-600 hover:text-gold-500 dark:text-gold-400"
                >
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {recipes.length === 0 ? (
                <EmptyState
                  title="Sin recetas aún"
                  description="Aún no se han publicado recetas para 12% Brew."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recipes.slice(0, 6).map((r) => (
                    <Link
                      key={r.id}
                      to={`/brew/preparar?recipe=${r.slug}`}
                      className="group flex flex-col gap-2 border border-coffee-200 bg-white p-4 transition-all hover:border-gold-400 dark:border-coffee-800 dark:bg-coffee-900"
                    >
                      <p className="font-serif text-base text-coffee-900 dark:text-cream">
                        {r.title}
                      </p>
                      <p className="text-xs text-coffee-500">
                        {r.brewMethod?.name ?? r.method}
                        {r.profile ? ` · ${r.profile}` : ''}
                      </p>
                      <p className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-gold-600 dark:text-gold-400">
                        Preparar <ArrowRight className="h-3.5 w-3.5" />
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
