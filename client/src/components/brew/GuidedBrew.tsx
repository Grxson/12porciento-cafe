/**
 * 12% Brew — GuidedBrew
 *
 * The Guided Brew driver for 12% Brew. Mirrors the UX of RecipeLiveMode
 * (mobile-first full-screen step-by-step timer) but persists to BrewSession
 * (the snapshot-preserving entity) instead of BrewLog (gamification).
 *
 * Uses timestamps for timer accuracy (no setInterval drift accumulation).
 * Persists the in-progress draft to sessionStorage keyed by session id so
 * a refresh keeps current step + parameters.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Scale,
  ThermometerSun,
  Coffee,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  brewApi,
  formatRatio,
  formatGrams,
  formatSecondsPadded,
  calculateWater,
} from '@12porciento/shared';
import type {
  BrewRecipeStructured,
  BrewSession,
  BrewSessionResult,
  BrewStepStructured,
} from '@12porciento/shared';
import { useToast, type ToastStore } from '../../context/ToastContext';

type BrewStatus = 'IDLE' | 'PREPARING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

interface GuidedBrewProps {
  recipe: BrewRecipeStructured;
  initialSession: BrewSession;
}

interface DraftState {
  currentStepIndex: number;
  coffeeDoseGrams: number;
  waterGrams: number;
  ratio: number;
  grindSetting: string;
  startedAtMs: number | null;
  pausedAtMs: number | null;
  totalPausedMs: number;
  /** When the draft was last persisted. Used to expire stale drafts. */
  savedAtMs: number;
}

function draftKey(sessionId: string) {
  return `brew:guided:${sessionId}`;
}

/** Drafts older than 7 days are considered abandoned and ignored. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default function GuidedBrew({ recipe, initialSession }: GuidedBrewProps) {
  const navigate = useNavigate();
  const addToast = useToast((s: ToastStore) => s.add);

  // Hydrate from sessionStorage first, fall back to session defaults.
  // Stale drafts (> 7 days) are ignored so the user doesn't accidentally resume
  // a brew that started a week ago.
  const initialDraft = useMemo<DraftState | null>(() => {
    try {
      const raw = sessionStorage.getItem(draftKey(initialSession.id));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DraftState;
      if (
        typeof parsed.savedAtMs === 'number' &&
        Date.now() - parsed.savedAtMs > DRAFT_TTL_MS
      ) {
        try {
          sessionStorage.removeItem(draftKey(initialSession.id));
        } catch {
          /* noop */
        }
        return null;
      }
      return parsed;
    } catch {
      // ignore
    }
    return null;
  }, [initialSession.id]);

  const [currentStepIndex, setCurrentStepIndex] = useState(
    initialDraft?.currentStepIndex ?? 0,
  );
  const [status, setStatus] = useState<BrewStatus>('PREPARING');
  const [stepStartedAtMs, setStepStartedAtMs] = useState<number | null>(
    initialDraft?.startedAtMs ?? null,
  );
  const [pausedAtMs, setPausedAtMs] = useState<number | null>(
    initialDraft?.pausedAtMs ?? null,
  );
  const [totalPausedMs, setTotalPausedMs] = useState<number>(
    initialDraft?.totalPausedMs ?? 0,
  );
  const [now, setNow] = useState<number>(Date.now());
  const [coffeeDoseGrams, setCoffeeDoseGrams] = useState(
    initialDraft?.coffeeDoseGrams ?? initialSession.coffeeDoseGrams ?? recipe.coffeeDoseGrams ?? 20,
  );
  const [waterGrams, setWaterGrams] = useState(
    initialDraft?.waterGrams ?? initialSession.waterGrams ?? recipe.waterGrams ?? 300,
  );
  const [grindSetting, setGrindSetting] = useState(
    initialDraft?.grindSetting ?? initialSession.grindSetting ?? '',
  );
  // Server-scaled steps (RecipeEngine) — single source of scaling truth.
  const [scaledSteps, setScaledSteps] = useState<BrewStepStructured[] | null>(null);
  const scaleTimeoutRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<unknown> } | null>(null);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Live "now" for the timer.
  useEffect(() => {
    if (status !== 'RUNNING') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [status]);

  // Keep the screen awake while a step is running (Wake Lock API with
  // graceful fallback — timer still works if the browser refuses).
  useEffect(() => {
    if (status !== 'RUNNING') return;
    let cancelled = false;
    let lock: { release: () => Promise<unknown> } | null = null;
    const wl = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<unknown> }> };
    }).wakeLock;
    if (wl) {
      wl
        .request('screen')
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
    return () => {
      cancelled = true;
      lock?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [status]);

  // Rescale the steps through the server RecipeEngine (fallback: local).
  useEffect(() => {
    if (!recipe.id || !coffeeDoseGrams) return;
    let cancelled = false;
    brewApi
      .scaleRecipe(recipe.id, coffeeDoseGrams)
      .then((r) => {
        if (!cancelled) setScaledSteps(r.data.data.steps);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  // Persist draft on every meaningful change.
  const persistDraft = useCallback(
    (overrides?: Partial<DraftState>) => {
      const draft: DraftState = {
        currentStepIndex,
        coffeeDoseGrams,
        waterGrams,
        ratio: waterGrams / coffeeDoseGrams,
        grindSetting,
        startedAtMs: stepStartedAtMs,
        pausedAtMs,
        totalPausedMs,
        savedAtMs: Date.now(),
        ...overrides,
      };
      try {
        sessionStorage.setItem(draftKey(initialSession.id), JSON.stringify(draft));
      } catch {
        // ignore quota errors
      }
    },
    [
      initialSession.id,
      currentStepIndex,
      coffeeDoseGrams,
      waterGrams,
      grindSetting,
      stepStartedAtMs,
      pausedAtMs,
      totalPausedMs,
    ],
  );

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  const step = recipe.steps[currentStepIndex];

  // Compute current step's target water (cumulative).
  const cumulativeWater = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= currentStepIndex; i++) {
      const w = recipe.steps[i].waterAmountGrams;
      if (typeof w === 'number') sum += w;
    }
    return sum;
  }, [currentStepIndex, recipe.steps]);

  // Scaled step water for current step. Server-scaled steps (RecipeEngine)
  // win when available; local proportional scaling is the offline fallback.
  const scaledStepWater = useMemo(() => {
    if (!step || !step.waterAmountGrams || !recipe.coffeeDoseGrams) return null;
    if (scaledSteps) {
      const serverStep = scaledSteps.find((s) => s.order === step.order);
      if (serverStep?.waterAmountGrams && serverStep.waterAmountGrams > 0) {
        return Math.round(serverStep.waterAmountGrams * 2) / 2;
      }
    }
    const scale = coffeeDoseGrams / recipe.coffeeDoseGrams;
    return Math.round(step.waterAmountGrams * scale * 2) / 2;
  }, [step, scaledSteps, coffeeDoseGrams, recipe.coffeeDoseGrams]);

  const totalWater = calculateWater(coffeeDoseGrams, waterGrams / coffeeDoseGrams);

  const stepElapsedSec = useMemo(() => {
    if (!stepStartedAtMs) return 0;
    const refNow = pausedAtMs ?? now;
    return Math.max(0, Math.floor((refNow - stepStartedAtMs - totalPausedMs) / 1000));
  }, [stepStartedAtMs, pausedAtMs, now, totalPausedMs]);

  // Step lifecycle actions.
  function startStep() {
    setStepStartedAtMs(Date.now());
    setPausedAtMs(null);
    setTotalPausedMs(0);
    setStatus('RUNNING');
  }

  function pauseStep() {
    setPausedAtMs(Date.now());
    setStatus('PAUSED');
  }

  function resumeStep() {
    if (pausedAtMs) {
      setTotalPausedMs((p) => p + (Date.now() - pausedAtMs));
    }
    setPausedAtMs(null);
    setStatus('RUNNING');
  }

  function nextStep() {
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex((c) => c + 1);
      setStepStartedAtMs(null);
      setPausedAtMs(null);
      setTotalPausedMs(0);
      setStatus('PREPARING');
    } else {
      setStatus('COMPLETED');
      setShowFinishForm(true);
    }
  }

  function prevStep() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((c) => c - 1);
      setStepStartedAtMs(null);
      setPausedAtMs(null);
      setTotalPausedMs(0);
      setStatus('PREPARING');
    }
  }

  async function submitComplete(rating: number, notes: string, result?: BrewSessionResult) {
    setSubmitting(true);
    try {
      await brewApi.completeSession(initialSession.id, {
        rating,
        notes: notes || undefined,
        result: result ?? undefined,
        brewTimeSeconds: stepStartedAtMs ? Math.floor((Date.now() - stepStartedAtMs) / 1000) : undefined,
      });
      // Also update params to what was actually used.
      await brewApi.updateSession(initialSession.id, {
        coffeeDoseGrams,
        waterGrams,
        ratio: waterGrams / coffeeDoseGrams,
        grindSetting: grindSetting || undefined,
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
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden bg-coffee-100 dark:bg-coffee-800">
        <div
          className="h-full bg-gold-500 transition-all"
          style={{ width: `${((currentStepIndex + 1) / recipe.steps.length) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-500">
            Paso {currentStepIndex + 1} de {recipe.steps.length}
          </p>

          <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            {step.title ?? step.type ?? 'Paso'}
          </h2>

          {step.description && (
            <p className="max-w-lg text-base leading-relaxed text-coffee-600 dark:text-coffee-400">
              {step.description}
            </p>
          )}

          {/* Step water target */}
          {scaledStepWater != null && scaledStepWater > 0 && (
            <div className="rounded-lg border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900">
              <p className="text-[10px] uppercase tracking-widest text-coffee-500">
                Agrega en este paso
              </p>
              <p className="mt-1 font-mono text-4xl font-bold text-coffee-900 dark:text-cream">
                {formatGrams(scaledStepWater)}
              </p>
              <p className="mt-2 text-xs text-coffee-500">
                Total acumulado · {formatGrams(cumulativeWater)} / {formatGrams(totalWater)}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-coffee-100 dark:bg-coffee-800">
                <div
                  className="h-full bg-gold-500 transition-all"
                  style={{ width: `${Math.min(100, (cumulativeWater / totalWater) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Timer */}
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
            {status === 'PREPARING' && step.duration && (
              <button
                type="button"
                onClick={startStep}
                className="btn-primary mt-3 inline-flex items-center gap-2 text-sm"
              >
                <Clock className="h-4 w-4" /> Iniciar {step.duration}s
              </button>
            )}
            {status === 'RUNNING' && (
              <button
                type="button"
                onClick={pauseStep}
                className="mt-3 inline-flex items-center gap-2 border border-coffee-300 px-4 py-1.5 text-sm font-semibold text-coffee-700 dark:border-coffee-700 dark:text-coffee-200"
              >
                Pausar
              </button>
            )}
            {status === 'RUNNING' && step.duration && stepElapsedSec >= step.duration && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
                ✓ Tiempo cumplido — avanza cuando esté listo
              </p>
            )}
            {status === 'PAUSED' && (
              <button
                type="button"
                onClick={resumeStep}
                className="btn-primary mt-3 inline-flex items-center gap-2 text-sm"
              >
                Reanudar
              </button>
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
                value={coffeeDoseGrams}
                onChange={(n) => {
                  if (n <= 0) return;
                  setCoffeeDoseGrams(n);
                  setWaterGrams(calculateWater(n, waterGrams / coffeeDoseGrams));
                  if (scaleTimeoutRef.current) window.clearTimeout(scaleTimeoutRef.current);
                  scaleTimeoutRef.current = window.setTimeout(() => {
                    brewApi
                      .scaleRecipe(recipe.id, n)
                      .then((r) => setScaledSteps(r.data.data.steps))
                      .catch(() => {});
                  }, 350);
                }}
              />
              <ParamEdit
                icon={<Scale className="h-4 w-4" />}
                label="Agua"
                suffix="g"
                value={waterGrams}
                onChange={(n) => {
                  if (n <= 0) return;
                  setWaterGrams(n);
                }}
              />
              <ParamEdit
                icon={<ThermometerSun className="h-4 w-4" />}
                label="Ratio"
                prefix="1:"
                value={Number((waterGrams / coffeeDoseGrams).toFixed(2))}
                onChange={(n) => {
                  if (n <= 0) return;
                  setWaterGrams(calculateWater(coffeeDoseGrams, n));
                }}
              />
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
                  Molienda
                </span>
                <input
                  type="text"
                  value={grindSetting}
                  onChange={(e) => setGrindSetting(e.target.value)}
                  placeholder="ej. 18 clicks"
                  className="mt-1 w-full border border-coffee-200 bg-coffee-50 px-2 py-1.5 text-sm focus:border-gold-500 focus:outline-none dark:border-coffee-700 dark:bg-coffee-950"
                />
              </label>
              <p className="text-[11px] text-coffee-500">
                Ratio actual · {formatRatio(waterGrams / coffeeDoseGrams)}
              </p>
            </div>
          </details>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="flex items-center justify-between border-t border-coffee-200 bg-white px-4 py-3 dark:border-coffee-800 dark:bg-coffee-900">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStepIndex === 0}
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
          {currentStepIndex === recipe.steps.length - 1 ? 'Finalizar' : 'Siguiente'}
          <ChevronRight className="h-5 w-5" />
        </button>
      </footer>

      {/* Finish modal */}
      <AnimatePresence>
        {showFinishForm && (
          <FinishForm
            onCancel={() => {
              setShowFinishForm(false);
              setStatus('COMPLETED');
            }}
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
