/**
 * 12% Brew — GuidedBrew
 *
 * The Guided Brew driver for 12% Brew. Mirrors the UX of RecipeLiveMode
 * (mobile-first full-screen step-by-step timer) but persists to BrewSession
 * (the snapshot-preserving entity) instead of BrewLog (gamification).
 *
 * Fase 4-7 (plan): explicit reducer state with separate general/step timers,
 * a single `BrewConfiguration` as the source of truth for steps/water
 * (scaled server-side by RecipeEngine, local fallback), full sessionStorage
 * persistence (status, indexes, timestamps, paused accumulators, config),
 * visibility-aware clock refresh + wake-lock re-request, and step-end
 * feedback (no auto-advance; vibration + beep when the target elapses).
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Clock, Scale, ThermometerSun, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  brewApi,
  formatRatio,
  formatGrams,
  formatSecondsPadded,
  calculateWater,
  roundHalf,
  scaleRecipeLocally,
} from '@12porciento/shared';
import type {
  BrewConfiguration,
  BrewRecipeStructured,
  BrewSession,
  BrewSessionResult,
} from '@12porciento/shared';
import { useToast, type ToastStore } from '../../context/ToastContext';

type GuidedBrewStatus = 'PREPARING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

interface GuidedBrewProps {
  recipe: BrewRecipeStructured;
  initialSession: BrewSession;
}

// ── State model (Fase 4) ────────────────────────────────────────────────

interface GuidedBrewState {
  status: GuidedBrewStatus;
  currentStepIndex: number;

  brewStartedAtMs: number | null;
  stepStartedAtMs: number | null;

  pausedAtMs: number | null;

  /** Accumulated paused time that must be subtracted from each timer. */
  brewPausedMs: number;
  stepPausedMs: number;

  configuration: BrewConfiguration;
}

/** Shape persisted to sessionStorage (Fase 6). */
interface GuidedBrewDraft extends GuidedBrewState {
  savedAtMs: number;
}

type GuidedBrewAction =
  | { type: 'START_STEP'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'UPDATE_CONFIG'; configuration: BrewConfiguration }
  | { type: 'COMPLETE' };

function guidedBrewReducer(state: GuidedBrewState, action: GuidedBrewAction): GuidedBrewState {
  switch (action.type) {
    case 'START_STEP':
      return {
        ...state,
        status: 'RUNNING',
        brewStartedAtMs: state.brewStartedAtMs ?? action.now,
        stepStartedAtMs: action.now,
        pausedAtMs: null,
      };
    case 'PAUSE':
      return { ...state, status: 'PAUSED', pausedAtMs: action.now };
    case 'RESUME': {
      const pausedFor = Math.max(0, action.now - (state.pausedAtMs ?? action.now));
      return {
        ...state,
        status: 'RUNNING',
        pausedAtMs: null,
        brewPausedMs: state.brewPausedMs + pausedFor,
        stepPausedMs: state.stepPausedMs + (state.stepStartedAtMs ? pausedFor : 0),
      };
    }
    case 'NEXT':
      return {
        ...state,
        currentStepIndex: state.currentStepIndex + 1,
        stepStartedAtMs: null,
        pausedAtMs: null,
        stepPausedMs: 0,
        status: 'PREPARING',
      };
    case 'PREV':
      return {
        ...state,
        currentStepIndex: Math.max(0, state.currentStepIndex - 1),
        stepStartedAtMs: null,
        pausedAtMs: null,
        stepPausedMs: 0,
        status: 'PREPARING',
      };
    case 'UPDATE_CONFIG':
      return { ...state, configuration: action.configuration };
    case 'COMPLETE':
      return { ...state, status: 'COMPLETED', pausedAtMs: null };
    default:
      return state;
  }
}

// ── Draft persistence (Fase 6) ──────────────────────────────────────────

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function draftKey(sessionId: string) {
  return `brew:guided:${sessionId}`;
}

function initialConfiguration(
  recipe: BrewRecipeStructured,
  session: BrewSession,
): BrewConfiguration {
  const coffee = session.coffeeDoseGrams ?? recipe.coffeeDoseGrams ?? 20;
  const water = session.waterGrams ?? recipe.waterGrams ?? 300;
  const ratio = session.ratio ?? recipe.ratio ?? Number((water / coffee).toFixed(2));
  return {
    recipeId: recipe.id,
    coffeeId: recipe.productId ?? undefined,
    brewMethodId: recipe.brewMethodId ?? undefined,
    coffeeDoseGrams: coffee,
    waterGrams: water,
    ratio,
    temperatureCelsius: session.temperatureCelsius ?? recipe.waterTemperatureCelsius ?? undefined,
    grindSetting: session.grindSetting ?? undefined,
    grindMicrons: session.grindMicrons ?? undefined,
    steps: recipe.steps,
  };
}

function hydrateDraft(
  sessionId: string,
  recipe: BrewRecipeStructured,
  session: BrewSession,
): GuidedBrewState {
  const fallback: GuidedBrewState = {
    status: 'PREPARING',
    currentStepIndex: 0,
    brewStartedAtMs: null,
    stepStartedAtMs: null,
    pausedAtMs: null,
    brewPausedMs: 0,
    stepPausedMs: 0,
    configuration: initialConfiguration(recipe, session),
  };
  try {
    const raw = sessionStorage.getItem(draftKey(sessionId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GuidedBrewDraft>;
    if (typeof parsed.savedAtMs === 'number' && Date.now() - parsed.savedAtMs > DRAFT_TTL_MS) {
      try {
        sessionStorage.removeItem(draftKey(sessionId));
      } catch {
        /* noop */
      }
      return fallback;
    }
    if (!parsed.configuration) {
      // Legacy draft (pre-Fase 6): keep step/params, loose timestamps.
      const legacy = parsed as unknown as {
        startedAtMs?: number | null;
        totalPausedMs?: number;
      };
      return {
        ...fallback,
        currentStepIndex: parsed.currentStepIndex ?? 0,
        stepStartedAtMs: legacy.startedAtMs ?? null,
        pausedAtMs: parsed.pausedAtMs ?? null,
        brewPausedMs: legacy.totalPausedMs ?? 0,
        stepPausedMs: legacy.totalPausedMs ?? 0,
      };
    }
    // Task: status hydrates as-is (RUNNING stays RUNNING and recomputes from
    // timestamps; PAUSED stays paused).
    return {
      status:
        parsed.status === 'RUNNING' || parsed.status === 'PAUSED' ? parsed.status : 'PREPARING',
      currentStepIndex: parsed.currentStepIndex ?? 0,
      brewStartedAtMs: parsed.brewStartedAtMs ?? null,
      stepStartedAtMs: parsed.stepStartedAtMs ?? null,
      pausedAtMs: parsed.pausedAtMs ?? null,
      brewPausedMs: parsed.brewPausedMs ?? 0,
      stepPausedMs: parsed.stepPausedMs ?? 0,
      configuration: { ...fallback.configuration, ...parsed.configuration },
    };
  } catch {
    return fallback;
  }
}

// ── Step-end alert (Fase 7) ─────────────────────────────────────────────

interface StepAlertPref {
  vibration: boolean;
  sound: boolean;
}

const ALERT_KEY = 'brew:step-alert';

function loadStepAlertPref(): StepAlertPref {
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StepAlertPref>;
      return { vibration: parsed.vibration !== false, sound: parsed.sound !== false };
    }
  } catch {
    /* noop */
  }
  return { vibration: true, sound: true };
}

let beepCtx: AudioContext | null = null;

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    beepCtx = beepCtx ?? new Ctx();
    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.06, beepCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(beepCtx.destination);
    osc.start();
    osc.stop(beepCtx.currentTime + 0.12);
  } catch {
    /* audio unavailable */
  }
}

// ── Component ───────────────────────────────────────────────────────────

export default function GuidedBrew({ recipe, initialSession }: GuidedBrewProps) {
  const navigate = useNavigate();
  const addToast = useToast((s: ToastStore) => s.add);

  const [state, dispatch] = useReducer(guidedBrewReducer, undefined, () =>
    hydrateDraft(initialSession.id, recipe, initialSession),
  );

  // Seed the clock once at mount; subsequent ticks come from the interval.
  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState<number>(Date.now());
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepAlert, setStepAlert] = useState<StepAlertPref>(loadStepAlertPref);

  const scaleTimeoutRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<unknown> } | null>(null);
  const alertedStepRef = useRef<number>(-1);

  // ── Timer tick (timestamp-driven, no drift) ──
  useEffect(() => {
    if (state.status !== 'RUNNING' && state.status !== 'PAUSED') return;
    const id = window.setInterval(() => {
      setNow(() => Date.now());
    }, 250);
    return () => window.clearInterval(id);
  }, [state.status]);

  // ── Clock refresh when the tab becomes visible again ──
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(() => Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ── Wake lock: request while RUNNING; re-request after re-focus, because
  //    some browsers release the lock when the app is hidden (Fase 6). ──
  useEffect(() => {
    const wl = (
      navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<unknown> }> };
      }
    ).wakeLock;
    if (!wl) return;

    let cancelled = false;
    let lock: { release: () => Promise<unknown> } | null = null;

    function requestLock() {
      if (cancelled || state.status !== 'RUNNING') return;
      wl.request('screen')
        .then((l) => {
          if (cancelled) {
            l.release().catch(() => {});
            return;
          }
          lock = l;
          wakeLockRef.current = l;
        })
        .catch(() => {});
    }

    requestLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') requestLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      lock?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [state.status]);

  // ── Persist draft on every meaningful change (Fase 6) ──
  const persistDraft = useCallback(() => {
    const draft: GuidedBrewDraft = {
      ...state,
      savedAtMs: Date.now(),
    };
    try {
      sessionStorage.setItem(draftKey(initialSession.id), JSON.stringify(draft));
    } catch {
      /* ignore quota errors */
    }
  }, [initialSession.id, state]);

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  // ── Single source of truth for steps (Fase 5) ──
  const activeSteps = state.configuration.steps;
  const step = activeSteps[state.currentStepIndex] ?? recipe.steps[state.currentStepIndex];

  // If the session was created with custom dose/water (via RatioCalculator),
  // rescale the recipe steps to match on mount (server wins later via the
  // Parámetros editor; local fallback keeps the projection authoritative).
  useEffect(() => {
    if (!initialSession.coffeeDoseGrams || !recipe.coffeeDoseGrams) return;
    if (initialSession.coffeeDoseGrams === recipe.coffeeDoseGrams) return;
    const local = scaleRecipeLocally(
      recipe.steps,
      initialSession.coffeeDoseGrams,
      state.configuration.ratio,
      recipe.coffeeDoseGrams,
    );
    dispatch({
      type: 'UPDATE_CONFIG',
      configuration: { ...state.configuration, steps: local.steps },
    });
    // Rescale once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Water targets (Fase 5): everything derives from configuration. ──
  const cumulativeWater = useMemo(
    () =>
      activeSteps
        .slice(0, state.currentStepIndex + 1)
        .reduce(
          (acc, s) => acc + (typeof s.waterAmountGrams === 'number' ? s.waterAmountGrams : 0),
          0,
        ),
    [activeSteps, state.currentStepIndex],
  );
  const stepWater =
    typeof step?.waterAmountGrams === 'number' && step.waterAmountGrams > 0
      ? step.waterAmountGrams
      : null;
  const totalWater = state.configuration.waterGrams;

  // ── Timers (Fase 4): step timer AND general brew timer, both from
  //    timestamps with paused time subtracted. ──
  const refNow = state.status === 'PAUSED' && state.pausedAtMs ? state.pausedAtMs : now;
  const stepElapsedSec = state.stepStartedAtMs
    ? Math.max(0, Math.floor((refNow - state.stepStartedAtMs - state.stepPausedMs) / 1000))
    : 0;
  const brewElapsedSec = state.brewStartedAtMs
    ? Math.max(0, Math.floor((refNow - state.brewStartedAtMs - state.brewPausedMs) / 1000))
    : 0;

  // ── Step-end feedback (Fase 7): no auto-advance, alert once. ──
  const targetReached = Boolean(
    step?.duration && stepElapsedSec >= step.duration && state.status === 'RUNNING',
  );
  useEffect(() => {
    if (!targetReached || alertedStepRef.current === state.currentStepIndex) return;
    alertedStepRef.current = state.currentStepIndex;
    if (stepAlert.vibration) navigator.vibrate?.([100, 50, 100]);
    if (stepAlert.sound) playBeep();
  }, [targetReached, state.currentStepIndex, stepAlert]);

  // ── Parameter editing → rescale steps (server RecipeEngine, local fallback) ──
  function updateConfig(config: BrewConfiguration) {
    dispatch({ type: 'UPDATE_CONFIG', configuration: config });
  }

  function onCoffeeChange(n: number) {
    if (!Number.isFinite(n) || n <= 0) return;
    const newCoffee = roundHalf(n);
    const baselineDose = recipe.coffeeDoseGrams ?? newCoffee;
    const local = scaleRecipeLocally(
      recipe.steps,
      newCoffee,
      state.configuration.ratio,
      baselineDose,
    );
    updateConfig({
      ...state.configuration,
      coffeeDoseGrams: newCoffee,
      waterGrams: local.waterGrams,
      steps: local.steps,
    });
    if (scaleTimeoutRef.current) window.clearTimeout(scaleTimeoutRef.current);
    scaleTimeoutRef.current = window.setTimeout(() => {
      brewApi
        .scaleRecipe(recipe.id, newCoffee)
        .then((r) =>
          updateConfig({
            ...state.configuration,
            coffeeDoseGrams: newCoffee,
            waterGrams: roundHalf(r.data.data.waterGrams),
            steps: r.data.data.steps,
          }),
        )
        .catch(() => {});
    }, 350);
  }

  function onWaterChange(n: number) {
    if (!Number.isFinite(n) || n <= 0) return;
    updateConfig({ ...state.configuration, waterGrams: roundHalf(n) });
  }

  function onRatioChange(n: number) {
    if (!Number.isFinite(n) || n <= 0) return;
    updateConfig({
      ...state.configuration,
      ratio: n,
      waterGrams: calculateWater(state.configuration.coffeeDoseGrams, n),
    });
  }

  function onGrindChange(v: string) {
    updateConfig({ ...state.configuration, grindSetting: v });
  }

  // ── Step lifecycle ──
  function startStep() {
    dispatch({ type: 'START_STEP', now: Date.now() });
  }

  function pauseStep() {
    dispatch({ type: 'PAUSE', now: Date.now() });
  }

  function resumeStep() {
    dispatch({ type: 'RESUME', now: Date.now() });
  }

  function nextStep() {
    if (state.currentStepIndex < activeSteps.length - 1) {
      dispatch({ type: 'NEXT' });
    } else {
      dispatch({ type: 'COMPLETE' });
      setShowFinishForm(true);
    }
  }

  function prevStep() {
    if (state.currentStepIndex > 0) dispatch({ type: 'PREV' });
  }

  function toggleAlert(partial: Partial<StepAlertPref>) {
    const next = { ...stepAlert, ...partial };
    setStepAlert(next);
    try {
      localStorage.setItem(ALERT_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }

  async function submitComplete(rating: number, notes: string, result?: BrewSessionResult) {
    setSubmitting(true);
    try {
      await brewApi.completeSession(initialSession.id, {
        rating,
        notes: notes || undefined,
        result: result ?? undefined,
        brewTimeSeconds: state.brewStartedAtMs
          ? Math.floor((Date.now() - state.brewStartedAtMs - state.brewPausedMs) / 1000)
          : undefined,
      });
      // Also update params to what was actually used (Fase 4: complete uses
      // the general timer, not the step timer).
      await brewApi.updateSession(initialSession.id, {
        coffeeDoseGrams: state.configuration.coffeeDoseGrams,
        waterGrams: state.configuration.waterGrams,
        ratio: state.configuration.ratio,
        grindSetting: state.configuration.grindSetting || undefined,
      });
      try {
        sessionStorage.removeItem(draftKey(initialSession.id));
      } catch {
        /* noop */
      }
      addToast('Preparación guardada ☕', 'success');
      navigate(`/brew/sesiones/${initialSession.id}`);
    } catch {
      addToast('No se pudo guardar la preparación', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!step) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-coffee-950 px-6 text-center">
        <p className="text-coffee-400">Esta receta no tiene pasos.</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-coffee-50 dark:bg-coffee-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-coffee-200 px-4 py-3 dark:border-coffee-800">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
            {recipe.brewMethod?.name ?? recipe.method}
          </p>
          <h1 className="truncate font-serif text-base text-coffee-900 dark:text-cream sm:text-lg">
            {recipe.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {state.brewStartedAtMs && (
            <p className="font-mono text-xs tabular-nums text-coffee-500 dark:text-coffee-400">
              Total · {formatSecondsPadded(brewElapsedSec)}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Salir? Tu progreso se guarda.')) {
                persistDraft();
                navigate(-1);
              }
            }}
            className="p-2 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream"
            aria-label="Salir"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden bg-coffee-100 dark:bg-coffee-800">
        <div
          className="h-full bg-gold-500 transition-all"
          style={{ width: `${((state.currentStepIndex + 1) / activeSteps.length) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">
            Paso {state.currentStepIndex + 1} de {activeSteps.length}
          </p>

          <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            {step.title ?? step.type ?? 'Paso'}
          </h2>

          {step.description && (
            <p className="max-w-lg text-base leading-relaxed text-coffee-600 dark:text-coffee-400">
              {step.description}
            </p>
          )}

          {/* Scale target (Fase 5): show where the scale should be, not the
              delta textually first. */}
          <div className="rounded-lg border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
              Objetivo en báscula
            </p>
            <p className="mt-1 font-mono text-4xl font-bold text-coffee-900 dark:text-cream sm:text-5xl">
              {formatGrams(roundHalf(cumulativeWater))}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-coffee-600 dark:text-coffee-300">
              <Coffee className="h-3.5 w-3.5 text-gold-600 dark:text-gold-400" />
              {stepWater != null ? (
                <span>+{formatGrams(roundHalf(stepWater))} g en este vertido</span>
              ) : (
                <span>Sin vertido de agua en este paso</span>
              )}
              <span className="text-coffee-400">·</span>
              <span>Total {formatGrams(roundHalf(totalWater))} g</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-coffee-100 dark:bg-coffee-800">
              <div
                className="h-full bg-gold-500 transition-all"
                style={{
                  width: `${Math.min(100, (cumulativeWater / Math.max(1, totalWater)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Step timer */}
          <div className="rounded-full border border-coffee-200 bg-white px-6 py-4 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="text-[10px] uppercase tracking-widest text-coffee-500">Tiempo paso</p>
            <p className="font-mono text-3xl font-bold tabular-nums text-coffee-900 dark:text-cream">
              {formatSecondsPadded(stepElapsedSec)}
              {step.duration && (
                <span className="text-base text-coffee-400">
                  {' / '}
                  {formatSecondsPadded(step.duration)}
                </span>
              )}
            </p>
            {state.status === 'PREPARING' && step.duration && (
              <button
                type="button"
                onClick={startStep}
                className="btn-primary mt-3 inline-flex items-center gap-2 text-sm"
              >
                <Clock className="h-4 w-4" /> Iniciar {step.duration}s
              </button>
            )}
            {state.status === 'RUNNING' && (
              <button
                type="button"
                onClick={pauseStep}
                className="mt-3 inline-flex items-center gap-2 border border-coffee-300 px-4 py-1.5 text-sm font-semibold text-coffee-700 dark:border-coffee-700 dark:text-coffee-200"
              >
                Pausar
              </button>
            )}
            {state.status === 'PAUSED' && (
              <button
                type="button"
                onClick={resumeStep}
                className="btn-primary mt-3 inline-flex items-center gap-2 text-sm"
              >
                Reanudar
              </button>
            )}
            {/* Fase 7: never auto-advance; show the target is met and let the
                user move forward when ready. */}
            {targetReached && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
                ✓ Tiempo objetivo cumplido — avanza cuando esté listo
              </p>
            )}
          </div>

          {/* Parameters (editable) */}
          <details className="w-full max-w-md rounded border border-coffee-200 bg-white p-3 text-left dark:border-coffee-800 dark:bg-coffee-900">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-coffee-500">
              Parámetros
            </summary>
            <div className="mt-3 space-y-3">
              <ParamEdit
                icon={<Coffee className="h-4 w-4" />}
                label="Café"
                suffix="g"
                value={state.configuration.coffeeDoseGrams}
                onChange={onCoffeeChange}
              />
              <ParamEdit
                icon={<Scale className="h-4 w-4" />}
                label="Agua"
                suffix="g"
                value={state.configuration.waterGrams}
                onChange={onWaterChange}
              />
              <ParamEdit
                icon={<ThermometerSun className="h-4 w-4" />}
                label="Ratio"
                prefix="1:"
                value={state.configuration.ratio}
                onChange={onRatioChange}
              />
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
                  Molienda
                </span>
                <input
                  type="text"
                  value={state.configuration.grindSetting ?? ''}
                  onChange={(e) => onGrindChange(e.target.value)}
                  placeholder="ej. 18 clicks"
                  className="mt-1 w-full border border-coffee-200 bg-coffee-50 px-2 py-1.5 text-sm focus:border-gold-500 focus:outline-none dark:border-coffee-700 dark:bg-coffee-950"
                />
              </label>
              <p className="text-[11px] text-coffee-500">
                Ratio actual ·{' '}
                {formatRatio(
                  state.configuration.coffeeDoseGrams > 0
                    ? state.configuration.waterGrams / state.configuration.coffeeDoseGrams
                    : state.configuration.ratio,
                )}
              </p>

              {/* Fase 7: step alert preferences */}
              <div className="border-t border-coffee-100 pt-2 dark:border-coffee-800">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
                  Aviso de paso
                </p>
                <div className="mt-1.5 flex gap-4 text-xs text-coffee-700 dark:text-coffee-200">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={stepAlert.vibration}
                      onChange={(e) => toggleAlert({ vibration: e.target.checked })}
                    />
                    Vibración
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={stepAlert.sound}
                      onChange={(e) => toggleAlert({ sound: e.target.checked })}
                    />
                    Sonido
                  </label>
                </div>
              </div>
            </div>
          </details>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="flex items-center justify-between border-t border-coffee-200 bg-white px-4 py-3 dark:border-coffee-800 dark:bg-coffee-900">
        <button
          type="button"
          onClick={prevStep}
          disabled={state.currentStepIndex === 0}
          className="flex min-h-11 items-center gap-1 px-3 text-sm font-semibold text-coffee-700 disabled:opacity-30 dark:text-coffee-200"
          aria-label="Paso anterior"
        >
          <ChevronLeft className="h-5 w-5" /> Atrás
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="btn-primary flex min-h-11 items-center gap-1 px-5 text-sm"
        >
          {state.currentStepIndex === activeSteps.length - 1 ? 'Finalizar' : 'Siguiente'}
          <ChevronRight className="h-5 w-5" />
        </button>
      </footer>

      {/* Finish modal */}
      <AnimatePresence>
        {showFinishForm && (
          <FinishForm
            onCancel={() => setShowFinishForm(false)}
            onSubmit={submitComplete}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ParamEdit({
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
          step={label === 'Ratio' ? 0.1 : label === 'Café' ? 0.5 : 5}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="min-w-0 flex-1 bg-transparent py-1.5 pr-2 text-sm font-semibold text-coffee-900 outline-none dark:text-cream"
        />
        {suffix && <span className="px-2 text-xs text-coffee-500">{suffix}</span>}
      </div>
    </label>
  );
}

function FinishForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (rating: number, notes: string, result?: BrewSessionResult) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<BrewSessionResult | undefined>(undefined);

  const RESULTS: { value: BrewSessionResult; label: string }[] = [
    { value: 'EXCELLENT', label: 'Excelente' },
    { value: 'GOOD', label: 'Muy bueno' },
    { value: 'BALANCED', label: 'Balanceado' },
    { value: 'SOUR', label: 'Muy ácido' },
    { value: 'BITTER', label: 'Muy amargo' },
    { value: 'WATERY', label: 'Aguado' },
    { value: 'STRONG', label: 'Muy fuerte' },
    { value: 'ASTRINGENT', label: 'Astringente' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-6 dark:bg-coffee-900 sm:rounded-2xl"
      >
        <h3 className="font-serif text-2xl text-coffee-900 dark:text-cream">
          ¿Cómo quedó tu café?
        </h3>
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} estrellas`}
              className={`text-3xl transition-transform ${
                rating >= n ? 'text-gold-500' : 'text-coffee-300 dark:text-coffee-700'
              } hover:scale-110`}
            >
              ★
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-coffee-500">{rating}/5</p>

        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-coffee-500">
          Resultado
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RESULTS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setResult(r.value)}
              className={`rounded-full border px-3 py-1 text-xs ${
                result === r.value
                  ? 'border-gold-500 bg-gold-500 text-coffee-950'
                  : 'border-coffee-200 text-coffee-700 hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-widest text-coffee-500">
            Notas (opcional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full border border-coffee-200 bg-coffee-50 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none dark:border-coffee-700 dark:bg-coffee-950"
            placeholder="Algo memorable de esta taza…"
          />
        </label>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-coffee-200 px-4 py-2.5 text-sm font-semibold dark:border-coffee-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onSubmit(rating, notes, result)}
            className="btn-primary flex-1 px-4 py-2.5 text-sm"
          >
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
