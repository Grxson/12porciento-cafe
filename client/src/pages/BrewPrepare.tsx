/**
 * 12% Brew — Prepare page
 *
 * Two modes:
 *   - ?session=: render GuidedBrew inline for an in-progress session.
 *   - wizard (Fase 8): 6 steps → Café → Método → Perfil → Receta → Cantidad →
 *     Resumen. Detects the user's equipment as context (Fase 9) and maps the
 *     favorite grinder to `grinderModel` + `grindSetting` on the session.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Coffee,
  Minus,
  Plus,
  Scale,
  ThermometerSun,
} from 'lucide-react';
import {
  api,
  brewApi,
  calculateWater,
  formatGrams,
  formatRatio,
  roundHalf,
  scaleRecipeLocally,
  type BrewConfiguration,
  type BrewMethod,
  type BrewRecipeProfile,
  type BrewRecipeStructured,
  type BrewSession,
} from '@12porciento/shared';
import EmptyState from '../components/ui/EmptyState';
import GuidedBrew from '../components/brew/GuidedBrew';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

interface CoffeeItem {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  origin?: string | null;
  region?: string | null;
}

interface EquipmentItem {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  isFavorite: boolean;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_ORDER: WizardStep[] = [1, 2, 3, 4, 5, 6];

const PROFILES: { value: BrewRecipeProfile; label: string }[] = [
  { value: 'SWEET', label: 'Dulce' },
  { value: 'BALANCED', label: 'Balanceado' },
  { value: 'BRIGHT', label: 'Brillante' },
  { value: 'FRUITY', label: 'Frutal' },
  { value: 'FULL_BODY', label: 'Con cuerpo' },
  { value: 'INTENSE', label: 'Intenso' },
  { value: 'REFRESHING', label: 'Refrescante' },
  { value: 'CLEAN', label: 'Limpio' },
  { value: 'FLORAL', label: 'Floral' },
];

/** Project a published recipe into the single source of truth (Fase 1-3). */
function configFromRecipe(recipe: BrewRecipeStructured): BrewConfiguration | null {
  if (recipe.coffeeDoseGrams == null || recipe.waterGrams == null) return null;
  return {
    recipeId: recipe.id,
    coffeeId: recipe.productId ?? undefined,
    brewMethodId: recipe.brewMethodId ?? undefined,
    coffeeDoseGrams: recipe.coffeeDoseGrams,
    waterGrams: recipe.waterGrams,
    ratio: recipe.ratio ?? Number((recipe.waterGrams / recipe.coffeeDoseGrams).toFixed(2)),
    temperatureCelsius: recipe.waterTemperatureCelsius ?? undefined,
    steps: recipe.steps,
  };
}

export default function BrewPrepare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useUser((s) => s.user);
  const addToast = useToast((s) => s.add);

  const sessionParam = searchParams.get('session');
  const recipeSlug = searchParams.get('recipe');

  // ── Session mode state ──
  const [session, setSession] = useState<BrewSession | null>(null);
  const [sessionRecipe, setSessionRecipe] = useState<BrewRecipeStructured | null>(null);
  const [loading, setLoading] = useState(Boolean(recipeSlug || sessionParam));

  // ── Wizard state (Fase 8) ──
  const [step, setStep] = useState<WizardStep>(recipeSlug ? 5 : 1);
  const [coffee, setCoffee] = useState<CoffeeItem | null>(null);
  const [method, setMethod] = useState<BrewMethod | null>(null);
  const [profile, setProfile] = useState<BrewRecipeProfile | null>(null);
  const [recipe, setRecipe] = useState<BrewRecipeStructured | null>(null);
  const [brewConfig, setBrewConfig] = useState<BrewConfiguration | null>(null);
  const [grindSetting, setGrindSetting] = useState('');
  const [starting, setStarting] = useState(false);

  // ── Wizard data ──
  const [coffees, setCoffees] = useState<CoffeeItem[]>([]);
  const [methods, setMethods] = useState<BrewMethod[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [recipeOptions, setRecipeOptions] = useState<BrewRecipeStructured[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const scaleTimeoutRef = useRef<number | null>(null);

  // Existing session → load and render GuidedBrew.
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
        if (rec) setSessionRecipe(rec);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [sessionParam]);

  // ?recipe= enters the wizard at step 5 with that recipe preselected.
  useEffect(() => {
    if (!recipeSlug || sessionParam) return;
    setLoading(true);
    brewApi
      .getRecipe(recipeSlug)
      .then((r) => {
        setRecipe(r.data.data);
        setBrewConfig(configFromRecipe(r.data.data));
      })
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false));
  }, [recipeSlug, sessionParam]);

  // Wizard data, loaded lazily per step.
  useEffect(() => {
    if (sessionParam || recipeSlug) return;
    if (step >= 1 && coffees.length === 0) {
      api
        .get<{ data: CoffeeItem[] }>('/products', {
          params: { category: 'CAFÉ%', pageSize: '60' },
        })
        .then((r) => setCoffees(r.data.data ?? []))
        .catch(() => setCoffees([]));
    }
  }, [step, sessionParam, recipeSlug, coffees.length]);

  useEffect(() => {
    if (sessionParam) return;
    if (step >= 2 && methods.length === 0) {
      brewApi
        .listMethods()
        .then((r) => setMethods(r.data.data))
        .catch(() => setMethods([]));
    }
    if (step >= 2 && user && equipment.length === 0) {
      brewApi
        .listEquipment()
        .then((r) => setEquipment((r.data.data ?? []) as EquipmentItem[]))
        .catch(() => setEquipment([]));
    }
  }, [step, sessionParam, user, methods.length, equipment.length]);

  // Recetas filtered by coffee + method + profile (Fase 8, paso 4).
  useEffect(() => {
    if (sessionParam || recipeSlug || step !== 4 || !method) return;
    setOptionsLoading(true);
    const filters: Record<string, string> = { method: method.name, pageSize: '24' };
    if (coffee) filters.coffeeId = coffee.id;
    if (profile) filters.profile = profile;
    brewApi
      .listRecipes(filters)
      .then((r) => setRecipeOptions(r.data.data))
      .catch(() => setRecipeOptions([]))
      .finally(() => setOptionsLoading(false));
  }, [step, sessionParam, recipeSlug, method, coffee, profile]);

  // Equipo como contexto (Fase 9): métodos que el usuario puede preparar con
  // su equipo registrado (match por nombre, ej. "Hario V60 02" → V60).
  const myMethods = useMemo(() => {
    if (equipment.length === 0) return [];
    const names = equipment.map((e) => e.name.toLowerCase());
    return methods.filter((m) => names.some((n) => n.includes(m.name.toLowerCase())));
  }, [methods, equipment]);

  const grinderModel = useMemo(() => {
    const grinder =
      equipment.find((e) => e.category === 'GRINDER' && e.isFavorite) ??
      equipment.find((e) => e.category === 'GRINDER');
    return grinder?.name ?? null;
  }, [equipment]);

  function pickRecipe(r: BrewRecipeStructured) {
    setRecipe(r);
    setBrewConfig(configFromRecipe(r));
    setStep(5);
  }

  // ── Paso 5: cantidad (stepper simple + rescale RecipeEngine) ──
  function onDoseChange(newCoffee: number) {
    if (!brewConfig) return;
    if (!Number.isFinite(newCoffee) || newCoffee <= 0) return;
    const dose = roundHalf(newCoffee);
    const baselineDose = recipe?.coffeeDoseGrams ?? dose;
    const local = scaleRecipeLocally(
      recipe?.steps ?? brewConfig.steps,
      dose,
      brewConfig.ratio,
      baselineDose,
    );
    setBrewConfig({
      ...brewConfig,
      coffeeDoseGrams: dose,
      waterGrams: local.waterGrams,
      steps: local.steps,
    });
    if (recipe) {
      if (scaleTimeoutRef.current) window.clearTimeout(scaleTimeoutRef.current);
      scaleTimeoutRef.current = window.setTimeout(() => {
        brewApi
          .scaleRecipe(recipe.id, dose)
          .then((r) =>
            setBrewConfig((c) =>
              c
                ? {
                    ...c,
                    coffeeDoseGrams: dose,
                    waterGrams: roundHalf(r.data.data.waterGrams),
                    steps: r.data.data.steps,
                  }
                : c,
            ),
          )
          .catch(() => {});
      }, 350);
    }
  }

  function advance() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }

  async function startSession() {
    if (!brewConfig || !user) {
      if (!user) {
        addToast('Inicia sesión para guardar la preparación', 'info');
        navigate(`/login?redirect=/brew/preparar${recipeSlug ? `?recipe=${recipeSlug}` : ''}`);
        return;
      }
      return;
    }
    setStarting(true);
    try {
      const r = await brewApi.startSession({
        recipeId: brewConfig.recipeId,
        coffeeId: brewConfig.coffeeId ?? coffee?.id,
        brewMethodId: brewConfig.brewMethodId ?? method?.id,
        coffeeDoseGrams: brewConfig.coffeeDoseGrams,
        waterGrams: brewConfig.waterGrams,
        ratio: brewConfig.ratio,
        temperatureCelsius: brewConfig.temperatureCelsius,
        grindSetting: grindSetting || undefined,
        equipmentSnapshot: {
          grinderModel,
          grindSetting: grindSetting || null,
          equipment: equipment.map((e) => e.name),
        },
      });
      setSession(r.data.data);
      navigate(`/brew/preparar?session=${r.data.data.id}`, { replace: true });
    } catch {
      addToast('No se pudo iniciar la sesión', 'error');
    } finally {
      setStarting(false);
    }
  }

  // ── Session mode (GuidedBrew) ──
  if (sessionParam) {
    if (session && sessionRecipe) {
      return <GuidedBrew recipe={sessionRecipe} initialSession={session} />;
    }
    if (loading) {
      return (
        <div className="px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-coffee-500">Cargando preparación…</p>
        </div>
      );
    }
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

  // ?recipe= loading
  if (recipeSlug && loading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="h-64 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800" />
        </div>
      </div>
    );
  }

  // ── Wizard (Fase 8) ──
  const stepLabel = ['Café', 'Método', 'Perfil', 'Receta', 'Cantidad', 'Resumen'][step - 1];

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              Preparar · {stepLabel}
            </p>
            <h1 className="mt-1 font-serif text-2xl text-coffee-900 dark:text-cream sm:text-3xl">
              {step === 1 && '¿Qué café vas a preparar?'}
              {step === 2 && '¿Cómo quieres prepararlo?'}
              {step === 3 && '¿Qué quieres buscar en la taza?'}
              {step === 4 && 'Elige tu receta'}
              {step === 5 && '¿Cuánto café usarás?'}
              {step === 6 && 'Confirma y empieza'}
            </h1>
          </div>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 text-sm font-semibold text-coffee-500 hover:text-coffee-900 dark:hover:text-cream"
            >
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
          )}
        </header>

        {/* Progress dots */}
        <div className="mb-8 flex items-center gap-1.5">
          {STEP_ORDER.map((s) => {
            const idx = STEP_ORDER.indexOf(s);
            const active = s === step;
            const done = idx < STEP_ORDER.indexOf(step);
            return (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  active
                    ? 'bg-gold-500'
                    : done
                      ? 'bg-gold-500/50'
                      : 'bg-coffee-200 dark:bg-coffee-800'
                }`}
              />
            );
          })}
        </div>

        {/* ── Paso 1: Café ── */}
        {step === 1 && (
          <div className="space-y-3">
            {coffees.length === 0 ? (
              <p className="text-sm text-coffee-500">Cargando cafés…</p>
            ) : (
              coffees.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCoffee(c);
                    advance();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-coffee-200 bg-white p-4 text-left transition-all hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coffee-100 text-coffee-600 dark:bg-coffee-800 dark:text-coffee-300">
                    <Coffee className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-coffee-900 dark:text-cream">{c.name}</p>
                    {c.origin && <p className="text-xs text-coffee-500">{c.origin}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-coffee-400" />
                </button>
              ))
            )}
            <button
              type="button"
              onClick={advance}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-coffee-300 bg-transparent p-4 text-left text-coffee-600 transition-colors hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-300"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coffee-100 text-coffee-500 dark:bg-coffee-800">
                <Coffee className="h-5 w-5" />
              </span>
              Otro café
            </button>
            <Link
              to="/brew/cafes"
              className="block pt-2 text-center text-xs font-semibold uppercase tracking-widest text-gold-600 hover:text-gold-500 dark:text-gold-400"
            >
              Ver todos mis cafés →
            </Link>
          </div>
        )}

        {/* ── Paso 2: Método ── */}
        {step === 2 && (
          <div className="space-y-6">
            {myMethods.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-coffee-500">
                  Tus métodos
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {myMethods.map((m) => (
                    <MethodCard
                      key={m.id}
                      name={m.name}
                      icon={m.icon}
                      onSelect={() => {
                        setMethod(m);
                        advance();
                      }}
                      badge="✓"
                    />
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-coffee-500">
                Todos
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {methods.map((m) => (
                  <MethodCard
                    key={m.id}
                    name={m.name}
                    icon={m.icon}
                    onSelect={() => {
                      setMethod(m);
                      advance();
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 3: Perfil ── */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PROFILES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setProfile(p.value);
                  advance();
                }}
                className="rounded-lg border border-coffee-200 bg-white p-4 text-center transition-all hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
              >
                <p className="font-serif text-base text-coffee-900 dark:text-cream">{p.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* ── Paso 4: Receta ── */}
        {step === 4 && (
          <div className="space-y-3">
            {optionsLoading ? (
              <p className="text-sm text-coffee-500">Buscando recetas…</p>
            ) : recipeOptions.length === 0 ? (
              <EmptyState
                title="Sin recetas para este combo"
                description="Prueba otro perfil o método para ver más opciones."
                action={
                  <button type="button" onClick={() => setProfile(null)} className="btn-secondary">
                    Quitar filtro de perfil
                  </button>
                }
              />
            ) : (
              recipeOptions.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickRecipe(r)}
                  className="flex w-full items-center gap-4 rounded-lg border border-coffee-200 bg-white p-4 text-left transition-all hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-serif text-base text-coffee-900 dark:text-cream">
                        {r.title}
                      </p>
                      {i === 0 && (
                        <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
                          Mejor match
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-coffee-500">
                      {r.brewMethod?.name ?? r.method}
                      {r.profile ? ` · ${r.profile.split('_').join(' ')}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-coffee-600 dark:text-coffee-300">
                      {r.coffeeDoseGrams != null && formatGrams(r.coffeeDoseGrams)} g ·{' '}
                      {r.waterGrams != null && formatGrams(r.waterGrams)} g ·{' '}
                      {r.waterTemperatureCelsius != null && `${r.waterTemperatureCelsius} °C`} ·{' '}
                      {r.ratio != null && formatRatio(r.ratio)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-coffee-400" />
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Paso 5: Cantidad ── */}
        {step === 5 && (
          <div>
            {!brewConfig ? (
              <EmptyState
                title="No hay receta seleccionada"
                description="Elige primero una receta."
              />
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg border border-coffee-200 bg-white p-6 text-center dark:border-coffee-800 dark:bg-coffee-900">
                  <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">
                    Café
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-6">
                    <button
                      type="button"
                      aria-label="Menos café"
                      onClick={() => onDoseChange(brewConfig.coffeeDoseGrams - 0.5)}
                      className="grid h-12 w-12 place-items-center rounded-full border border-coffee-300 text-coffee-700 transition-colors hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-200"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <p className="w-24 font-mono text-4xl font-bold tabular-nums text-coffee-900 dark:text-cream">
                      {formatGrams(brewConfig.coffeeDoseGrams)}
                      <span className="text-base font-medium text-coffee-400"> g</span>
                    </p>
                    <button
                      type="button"
                      aria-label="Más café"
                      onClick={() => onDoseChange(brewConfig.coffeeDoseGrams + 0.5)}
                      className="grid h-12 w-12 place-items-center rounded-full border border-coffee-300 text-coffee-700 transition-colors hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-200"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-4 text-sm text-coffee-600 dark:text-coffee-300">
                    {formatGrams(brewConfig.waterGrams)} g de agua · Ratio{' '}
                    {formatRatio(brewConfig.ratio)}
                    {brewConfig.temperatureCelsius != null &&
                      ` · ${brewConfig.temperatureCelsius} °C`}
                  </p>
                </div>

                <details className="rounded-lg border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-coffee-500">
                    Ajustes avanzados
                  </summary>
                  <div className="mt-4 space-y-3">
                    <AdvancedField
                      icon={<Scale className="h-4 w-4" />}
                      label="Agua"
                      suffix="g"
                      value={brewConfig.waterGrams}
                      onChange={(n) => {
                        if (n <= 0) return;
                        setBrewConfig({ ...brewConfig, waterGrams: roundHalf(n) });
                      }}
                    />
                    <AdvancedField
                      icon={<Coffee className="h-4 w-4" />}
                      label="Ratio"
                      prefix="1:"
                      value={brewConfig.ratio}
                      onChange={(n) => {
                        if (n <= 0) return;
                        setBrewConfig({
                          ...brewConfig,
                          ratio: n,
                          waterGrams: calculateWater(brewConfig.coffeeDoseGrams, n),
                        });
                      }}
                    />
                    <AdvancedField
                      icon={<ThermometerSun className="h-4 w-4" />}
                      label="Temp."
                      suffix="°C"
                      value={brewConfig.temperatureCelsius ?? 92}
                      onChange={(n) => setBrewConfig({ ...brewConfig, temperatureCelsius: n })}
                    />
                  </div>
                </details>

                <button type="button" onClick={advance} className="btn-primary w-full py-3.5">
                  Continuar <ArrowRight className="ml-1 inline h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Paso 6: Resumen ── */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
              <dl className="space-y-2 text-sm">
                {coffee && <Row label="Café" value={coffee.name} />}
                <Row label="Método" value={method?.name ?? recipe?.brewMethod?.name ?? '—'} />
                <Row label="Receta" value={recipe?.title ?? '—'} />
                {brewConfig && (
                  <>
                    <Row
                      label="Dosis"
                      value={`${formatGrams(brewConfig.coffeeDoseGrams)} g café · ${formatGrams(
                        brewConfig.waterGrams,
                      )} g agua`}
                    />
                    <Row
                      label="Temp."
                      value={
                        brewConfig.temperatureCelsius != null
                          ? `${brewConfig.temperatureCelsius} °C`
                          : '—'
                      }
                    />
                    <Row label="Ratio" value={formatRatio(brewConfig.ratio)} />
                  </>
                )}
              </dl>
            </div>

            {/* Equipo disponible + grinder mapping (Fase 9) */}
            {equipment.length > 0 && (
              <div className="rounded-lg border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
                  Equipo disponible
                </p>
                <ul className="space-y-1.5 text-sm text-coffee-700 dark:text-coffee-200">
                  {[...equipment]
                    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
                    .map((e) => (
                      <li key={e.id} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-gold-600 dark:text-gold-400" />
                        {e.name}
                        {e.isFavorite && (
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
                            ★
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
                {grinderModel && (
                  <div className="mt-4 border-t border-coffee-100 pt-3 dark:border-coffee-800">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
                      Molienda · {grinderModel}
                    </p>
                    <input
                      type="text"
                      value={grindSetting}
                      onChange={(e) => setGrindSetting(e.target.value)}
                      placeholder="ej. 17 clicks"
                      className="mt-1 w-full border border-coffee-200 bg-coffee-50 px-2 py-1.5 text-sm focus:border-gold-500 focus:outline-none dark:border-coffee-700 dark:bg-coffee-950"
                    />
                  </div>
                )}
              </div>
            )}

            {!user && (
              <p className="text-center text-xs text-coffee-500">
                Necesitas iniciar sesión para guardar la preparación.
              </p>
            )}

            <button
              type="button"
              onClick={startSession}
              disabled={starting}
              className="btn-primary w-full py-3.5 text-base shadow-xl shadow-gold-500/30 disabled:opacity-60"
            >
              {starting ? 'Iniciando…' : 'Iniciar preparación'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MethodCard({
  name,
  icon,
  onSelect,
  badge,
}: {
  name: string;
  icon: string | null;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center gap-2 rounded-lg border border-coffee-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-coffee-100 text-xl transition-colors group-hover:bg-gold-500/10 dark:bg-coffee-800">
        {icon ?? '☕'}
      </span>
      <p className="text-sm font-semibold text-coffee-900 dark:text-cream">
        {name}{' '}
        {badge ? <span className="ml-0.5 text-gold-600 dark:text-gold-400">{badge}</span> : ''}
      </p>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs font-semibold uppercase tracking-widest text-coffee-500">{label}</dt>
      <dd className="text-right font-medium text-coffee-900 dark:text-cream">{value}</dd>
    </div>
  );
}

function AdvancedField({
  icon,
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-coffee-500">{icon}</span>
      <span className="w-16 text-xs text-coffee-700 dark:text-coffee-300">{label}</span>
      <div className="flex flex-1 items-center overflow-hidden rounded border border-coffee-200 bg-coffee-50 focus-within:border-gold-500 dark:border-coffee-700 dark:bg-coffee-950">
        {prefix && <span className="px-2 text-xs text-coffee-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="min-w-0 flex-1 bg-transparent py-1.5 pr-2 text-sm font-semibold text-coffee-900 outline-none dark:text-cream"
        />
        {suffix && <span className="px-2 text-xs text-coffee-500">{suffix}</span>}
      </div>
    </label>
  );
}
