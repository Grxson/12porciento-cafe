import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Recipe } from '../../types';
import type { RecipeDraft, StepDraft } from '../../types';
import { saveDraft, loadDraft, clearDraft } from '../../hooks/useRecipeDraft';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { useBarista } from '../../hooks/useBarista';
import { recipesApi } from '../../api';
import RatingSlider from './RatingSlider';
import NotesCapture from './NotesCapture';
import GestureHints from './GestureHints';

interface RecipeLiveModeProps {
  recipe: Recipe;
  onClose: () => void;
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'hace unos segundos';
  if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
}

export default function RecipeLiveMode({ recipe, onClose }: RecipeLiveModeProps) {
  const user = useUser((s) => s.user);
  const { add: addToast } = useToast();
  const { submitBrewLog } = useBarista(user?.id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timerActive, setTimerActive] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [brewRegistered, setBrewRegistered] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [stepPhotos, setStepPhotos] = useState<Record<number, { preview: string; blob: Blob }>>({});
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [relatedRecipes, setRelatedRecipes] = useState<Recipe[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const step = recipe.steps[currentStepIndex];
  const hasNext = currentStepIndex < recipe.steps.length - 1;
  const hasPrev = currentStepIndex > 0;
  const finalStep = currentStepIndex === recipe.steps.length - 1;
  const currentStepDraft = steps.find((s) => s.index === currentStepIndex) ?? { index: currentStepIndex };

  // R6: Calculate total time in minutes
  const totalSeconds = recipe.steps.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  // Load draft on mount
  useEffect(() => {
    if (!user) return;
    loadDraft(user.id, recipe.id).then((d) => {
      if (d && d.status === 'in_progress') setDraft(d);
    }).catch((err) => { console.error(err); });
  }, [user?.id, recipe.id]);

  // Persist draft helper
  const persistDraft = useCallback((newSteps: StepDraft[], stepIndex: number) => {
    if (!user) return;
    const d: RecipeDraft = {
      id: `${user.id}:${recipe.id}`,
      recipeId: recipe.id,
      userId: user.id,
      startedAt: startedAtRef.current,
      currentStepIndex: stepIndex,
      steps: newSteps,
      status: 'in_progress',
    };
    saveDraft(d).catch(console.error);
  }, [user?.id, recipe.id]);

  const handleResume = () => {
    if (!draft) return;
    startedAtRef.current = draft.startedAt;
    setCurrentStepIndex(draft.currentStepIndex);
    setSteps(draft.steps);
    setDraft(null);
  };

  const handleStartOver = () => {
    if (user) clearDraft(user.id, recipe.id).catch(console.error);
    startedAtRef.current = new Date().toISOString();
    setDraft(null);
    setSteps([]);
    setCurrentStepIndex(0);
  };

  const updateStep = (patch: Partial<StepDraft>) => {
    setSteps((prev) => {
      const existing = prev.find((s) => s.index === currentStepIndex);
      const updated = existing
        ? prev.map((s) => s.index === currentStepIndex ? { ...s, ...patch } : s)
        : [...prev, { index: currentStepIndex, ...patch }];
      persistDraft(updated, currentStepIndex);
      return updated;
    });
  };

  // Timer
  useEffect(() => {
    if (timerActive === null) return;
    const interval = setInterval(() => {
      setTimerActive((t) => {
        if (t && t <= 1) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
          // R8: Start auto-advance countdown
          setAutoAdvanceCountdown(3);
          return null;
        }
        return t ? t - 1 : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => { setTimerActive(null); }, [currentStepIndex]);

  // R8: Auto-advance countdown when timer reaches 0
  useEffect(() => {
    if (autoAdvanceCountdown === null) return;
    if (autoAdvanceCountdown <= 0) {
      setAutoAdvanceCountdown(null);
      if (hasNext) goNext();
      return;
    }
    const interval = setInterval(() => {
      setAutoAdvanceCountdown((t) => (t ? t - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [autoAdvanceCountdown, hasNext]);

  useEffect(() => {
    return () => {
      if (longPressRef.current) clearTimeout(longPressRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // R4: Online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const goNext = () => {
    if (hasNext) {
      const updated = steps.find((s) => s.index === currentStepIndex)
        ? steps.map((s) => s.index === currentStepIndex ? { ...s, completedAt: new Date().toISOString() } : s)
        : [...steps, { index: currentStepIndex, completedAt: new Date().toISOString() }];
      setSteps(updated);
      persistDraft(updated, currentStepIndex + 1);
      setCurrentStepIndex((c) => c + 1);
    }
  };

  const goPrev = () => {
    if (hasPrev) {
      persistDraft(steps, currentStepIndex - 1);
      setCurrentStepIndex((c) => c - 1);
    }
  };

  const handleRegisterBrew = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    const ratings = steps.map((s) => s.rating).filter((r): r is number => r !== undefined);
    const avgRating = ratings.length
      ? Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length)
      : 5;
    const notes = steps.map((s) => s.notes).filter(Boolean).join(' | ').slice(0, 500);
    try {
      const { newAchievements } = await submitBrewLog({
        recipeId: recipe.id,
        rating: avgRating,
        notes: notes || undefined,
        difficulty: recipe.difficulty,
        photoUrl: photoUrl || undefined,
        photoBlob: photoBlob || undefined,
        clientBrewId: crypto.randomUUID(),
      });
      const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
      const xp = (baseXp[recipe.difficulty ?? 'MEDIA'] ?? 20) + (avgRating - 1) * 5;
      addToast(`+${xp} XP ganados ☕`, 'success');
      for (const a of newAchievements) {
        setTimeout(() => addToast(`🏆 Logro: ${a.icon} ${a.name} (+${a.xpReward} XP)`, 'success'), 400);
      }
      if (user) clearDraft(user.id, recipe.id).catch(console.error);
      setBrewRegistered(true);
    } catch {
      addToast('Error al registrar brew. Intenta de nuevo.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoPreview(url);
    setPhotoBlob(file);
    // Try to upload immediately; if offline, photoBlob will be used on sync
    try {
      const { uploadsApi } = await import('../../api');
      const res = await uploadsApi.upload(file);
      setPhotoUrl(res.data.data.url);
    } catch {
      // Offline or error — photoBlob queued by useBarista on submit
    }
  };

  const handleRemovePhoto = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPhotoPreview(null);
    setPhotoBlob(null);
    setPhotoUrl(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressRef.current = setTimeout(() => {
      setShowQuickPanel(true);
      longPressRef.current = null;
    }, 600);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (!touchStartRef.current || showQuickPanel) { touchStartRef.current = null; return; }
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    if (Math.abs(deltaX) > 50 && deltaY < 50) {
      if (deltaX > 0) goPrev(); else goNext();
    }
    touchStartRef.current = null;
  };

  if (!step) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-coffee-950 flex flex-col items-center justify-center gap-4"
      >
        <p className="text-coffee-400 text-sm">Esta receta no tiene pasos configurados.</p>
        <button onClick={onClose} className="btn-primary">Cerrar</button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-coffee-950 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Resume banner */}
      {draft && (
        <div className="bg-gold-500/10 border-b border-gold-500/30 px-4 py-2.5 flex items-center justify-between gap-4">
          {/* R10: Show relative time since brew started */}
          <p className="text-gold-400 text-xs">↻ Iniciado {getRelativeTime(draft.startedAt)}</p>
          <div className="flex gap-2">
            <button
              onClick={handleResume}
              className="text-xs px-3 py-1 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-400 transition-colors"
            >
              Continuar
            </button>
            <button
              onClick={handleStartOver}
              className="text-xs px-3 py-1 text-coffee-400 hover:text-cream transition-colors"
            >
              Empezar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-coffee-800">
        <div className="flex-1">
          <h2 className="text-cream font-serif text-lg">{recipe.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-coffee-500">
              Paso {currentStepIndex + 1} de {recipe.steps.length}
              {totalMinutes > 0 && ` • ~${totalMinutes} min total`}
            </p>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Sin conexión
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            if (currentStepIndex > 0 && !finalStep) {
              setShowCloseConfirm(true);
            } else {
              onClose();
            }
          }}
          aria-label="Cerrar receta"
          className="p-2 text-coffee-400 hover:text-cream transition-colors shrink-0"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col p-6">
        <AnimatePresence>
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full mx-auto"
          >
            <div className="flex justify-center mb-6">
              <div className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-full">
                <p className="text-gold-400 text-sm font-semibold">{currentStepIndex + 1} / {recipe.steps.length}</p>
              </div>
            </div>

            <h3 className="text-3xl md:text-4xl font-serif text-cream mb-4 text-center">{step.title}</h3>
            <p className="text-base text-coffee-300 leading-relaxed mb-6 text-center">{step.description}</p>

            {(step.duration || recipe.temp || recipe.grind) && (
              <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto">
                {step.duration && (
                  <div className="bg-coffee-900/50 p-3 rounded text-center">
                    <p className="text-xs text-coffee-500 uppercase mb-1">Duración</p>
                    <p className="text-gold-400 font-bold">{step.duration}s</p>
                  </div>
                )}
                {recipe.temp && (
                  <div className="bg-coffee-900/50 p-3 rounded text-center">
                    <p className="text-xs text-coffee-500 uppercase mb-1">Temp</p>
                    <p className="text-gold-400 font-bold">{recipe.temp}</p>
                  </div>
                )}
                {recipe.grind && (
                  <div className="bg-coffee-900/50 p-3 rounded text-center">
                    <p className="text-xs text-coffee-500 uppercase mb-1">Molienda</p>
                    <p className="text-gold-400 font-bold text-sm">{recipe.grind}</p>
                  </div>
                )}
              </div>
            )}

            {step.duration && timerActive === null && (
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => setTimerActive(step.duration!)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-400 transition-colors"
                >
                  <Clock className="w-5 h-5" /> Iniciar {step.duration}s
                </button>
              </div>
            )}

            {timerActive !== null && (
              <div className="flex justify-center mb-6">
                <div className="inline-block px-8 py-6 bg-gold-500/10 border border-gold-500/30 rounded text-center">
                  <p className="text-xs text-gold-400 uppercase mb-3">Temporizador</p>
                  <p className="text-6xl font-mono font-bold text-gold-400 mb-4">{timerActive}</p>
                  <button
                    onClick={() => setTimerActive(null)}
                    aria-label="Cancelar temporizador"
                    className="text-xs px-4 py-1 bg-red-600/30 text-red-400 hover:bg-red-600/40 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* R8: Auto-advance countdown when timer reaches 0 */}
            {autoAdvanceCountdown !== null && (
              <div className="flex justify-center mb-6">
                <div className="inline-block px-8 py-6 bg-gold-500/10 border border-gold-500/30 rounded text-center">
                  <p className="text-xs text-gold-400 uppercase mb-3">Paso completado</p>
                  <p className="text-lg text-gold-400 mb-4">Siguiente en {autoAdvanceCountdown}s</p>
                  <button
                    onClick={() => setAutoAdvanceCountdown(null)}
                    className="text-xs px-4 py-1 bg-coffee-900 border border-gold-500/30 text-gold-400 hover:border-gold-500 transition-colors"
                  >
                    Quedarme aquí
                  </button>
                </div>
              </div>
            )}

            {/* Inline rating + notes */}
            <div className="mt-4 border-t border-coffee-800/50 pt-4">
              <RatingSlider
                value={currentStepDraft.rating}
                onChange={(r) => updateStep({ rating: r })}
              />
              <NotesCapture
                value={currentStepDraft.notes ?? ''}
                onChange={(n) => updateStep({ notes: n })}
                onPhotoCapture={(photo) => setStepPhotos((prev) => ({ ...prev, [currentStepIndex]: photo }))}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="border-t border-coffee-800 bg-coffee-900/50">
        {!hasNext && (
          <div className="pt-4 px-6">
            {/* Photo capture — shown on final step */}
            {currentStepIndex === recipe.steps.length - 1 && (
              <div className="mb-4 border-t border-coffee-800/50 pt-4">
                <p className="text-xs text-coffee-500 uppercase tracking-widest mb-2">
                  Foto del resultado (opcional)
                </p>
                {photoPreview ? (
                  <div className="relative mb-3">
                    <img
                      src={photoPreview}
                      alt="Vista previa"
                      className="w-full h-36 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full"
                      aria-label="Eliminar foto"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-coffee-700 p-4 rounded cursor-pointer hover:border-gold-400 transition-colors mb-3">
                    <span className="text-xs text-coffee-400">📷 Tomar o elegir foto</span>
                    <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-2">
                      📷 Selecciona una foto de tu resultado. El navegador puede solicitar acceso a la cámara.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      onError={() => {}}
                      className="hidden"
                      aria-label="Foto del resultado"
                    />
                  </label>
                )}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 flex-col">
              {brewRegistered ? (
                <>
                  <span className="text-green-400 text-sm">✓ Brew registrado</span>

                  {/* R9: Post-brew related recipes */}
                  {relatedRecipes.length > 0 && (
                    <div className="mt-4 w-full border-t border-coffee-700 pt-4">
                      <p className="text-xs text-coffee-500 uppercase tracking-wider mb-3">Sigue probando</p>
                      <div className="space-y-2">
                        {relatedRecipes.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 p-2 bg-coffee-900/40 border border-coffee-700/50 rounded cursor-pointer hover:border-gold-500/50 transition-colors"
                          >
                            <span className="text-sm text-cream font-medium">{r.title}</span>
                            {r.difficulty && (
                              <span className="text-xs px-1.5 py-0.5 bg-gold-500/10 border border-gold-500/30 text-gold-400">
                                {r.difficulty}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* G9: Brew sharing button */}
                  {user && (
                    <button
                      onClick={() => {
                        const profileUrl = `${window.location.origin}/perfil/barista/${user.id}`;
                        navigator.clipboard.writeText(profileUrl);
                        addToast('🔗 Link copiado al portapapeles', 'success');
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500/10 border border-gold-500/40 text-gold-400 text-sm hover:bg-gold-500/20 hover:border-gold-500 transition-colors mt-2"
                    >
                      🔗 Compartir
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-coffee-950 text-sm font-semibold hover:bg-gold-400 transition-colors mt-4"
                  >
                    Finalizar
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRegisterBrew}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500/10 border border-gold-500/40 text-gold-400 text-sm hover:bg-gold-500/20 hover:border-gold-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Registrando...' : '☕ Registrar este Brew'}
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between p-4">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="Paso anterior"
            className="p-3 text-coffee-400 disabled:opacity-30 hover:text-cream transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="flex-1 mx-4">
            <div className="h-1 bg-coffee-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-500 transition-all"
                style={{ width: `${((currentStepIndex + 1) / recipe.steps.length) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Siguiente paso"
            className="p-3 text-coffee-400 disabled:opacity-30 hover:text-cream transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
        <GestureHints />
      </div>

      {/* R3: Close confirmation dialog */}
      <AnimatePresence>
        {showCloseConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowCloseConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-coffee-900 border border-coffee-800 p-6 max-w-sm w-full rounded"
            >
              <h3 className="text-cream font-serif text-lg mb-2">¿Cerrar receta?</h3>
              <p className="text-coffee-300 text-sm mb-6">
                Estás en el paso {currentStepIndex + 1}. Tu progreso se guardará y podrás continuar después.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1 px-4 py-2 border border-coffee-700 text-coffee-300 text-sm hover:bg-coffee-800 transition-colors"
                >
                  Continuar
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-semibold hover:bg-gold-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick panel (long-press) */}
      <AnimatePresence>
        {showQuickPanel && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-coffee-900 border-t border-coffee-700 px-4 pt-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-coffee-400 uppercase tracking-widest">Menú rápido</p>
              <button onClick={() => setShowQuickPanel(false)} aria-label="Cerrar menú rápido" className="text-coffee-400 hover:text-cream">
                <X className="w-4 h-4" />
              </button>
            </div>
            <RatingSlider
              value={currentStepDraft.rating}
              onChange={(r) => { updateStep({ rating: r }); }}
            />
            <NotesCapture
              value={currentStepDraft.notes ?? ''}
              onChange={(n) => updateStep({ notes: n })}
              onPhotoCapture={(photo) => setStepPhotos((prev) => ({ ...prev, [currentStepIndex]: photo }))}
            />
            <button
              onClick={() => setShowQuickPanel(false)}
              className="w-full mt-2 py-2 bg-gold-500 text-coffee-950 text-sm font-semibold hover:bg-gold-400 transition-colors"
            >
              Listo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
