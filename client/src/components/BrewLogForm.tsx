import { useState, useEffect, useRef } from 'react';
import { X, Star, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useBarista } from '../hooks/useBarista';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { uploadsApi, baristaApi } from '../api';
import { useQuery } from '@tanstack/react-query';
import type { Recipe, BaristaEquipment } from '../types';

interface BrewLogFormProps {
  recipe: Recipe;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BrewLogForm({ recipe, onClose, onSuccess }: BrewLogFormProps) {
  const user = useUser((s) => s.user);
  const { submitBrewLog, error } = useBarista(user?.id);
  const addToast = useToast((s) => s.add);

  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const formDialogRef = useRef<HTMLFormElement>(null);
  const loginDialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  // Technical params state
  const [showTechnical, setShowTechnical] = useState(false);
  const [grindSize, setGrindSize] = useState('');
  const [waterTemp, setWaterTemp] = useState<number | ''>('');
  const [brewTime, setBrewTime] = useState<number | ''>('');
  const [coffeeWeight, setCoffeeWeight] = useState<number | ''>('');
  const [waterVolume, setWaterVolume] = useState<number | ''>('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [flavorTags, setFlavorTags] = useState<string[]>([]);

  const { data: equipmentList } = useQuery({
    queryKey: ['barista-equipment'],
    queryFn: () => baristaApi.listEquipment().then((r) => r.data as BaristaEquipment[]),
  });

  const FLAVOR_OPTIONS = [
    'Chocolate',
    'Caramelo',
    'Frutos rojos',
    'Cítrico',
    'Floral',
    'Nueces',
    'Miel',
    'Vainilla',
    'Especias',
    'Tropical',
  ];
  const GRIND_OPTIONS = [
    'Muy fino',
    'Fino',
    'Medio-fino',
    'Medio',
    'Medio-grueso',
    'Grueso',
    'Muy grueso',
  ];

  const toggleEquipment = (id: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const toggleFlavorTag = (tag: string) => {
    setFlavorTags((prev) => (prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag]));
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      const dialog = formDialogRef.current ?? loginDialogRef.current;
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      openerRef.current?.focus();
    };
  }, [onClose]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = objectUrl;
    setPhotoPreview(objectUrl);
    setUploading(true);
    try {
      const res = await uploadsApi.upload(file);
      setPhotoUrl(res.data.data.url);
    } catch {
      addToast('Error al subir foto', 'error');
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const xpPreview = (() => {
    const baseXp: Record<string, number> = { FÁCIL: 10, MEDIA: 20, DIFÍCIL: 30 };
    return (baseXp[recipe.difficulty ?? 'MEDIA'] ?? 20) + (rating - 1) * 5;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || uploading) return;
    setSubmitting(true);
    try {
      const { newAchievements } = await submitBrewLog({
        recipeId: recipe.id,
        rating,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl || undefined,
        grindSize: grindSize || undefined,
        waterTemp: waterTemp || undefined,
        brewTime: brewTime || undefined,
        coffeeWeight: coffeeWeight || undefined,
        waterVolume: waterVolume || undefined,
        equipmentIds: selectedEquipmentIds.length > 0 ? selectedEquipmentIds : undefined,
        tags: flavorTags.length > 0 ? flavorTags : undefined,
      });
      addToast(`+${xpPreview} XP ganados ☕`, 'success');
      for (const a of newAchievements) {
        setTimeout(
          () => addToast(`🏆 Logro: ${a.icon} ${a.name} (+${a.xpReward} XP)`, 'success'),
          400,
        );
      }
      onSuccess?.();
      onClose();
    } catch {
      // error shown from hook state
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
        <div
          ref={loginDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="brew-login-title"
          className="bg-coffee-100 dark:bg-coffee-900 border border-gold-500/30 p-6 max-w-sm w-full"
        >
          <h3
            id="brew-login-title"
            className="text-coffee-900 dark:text-cream font-serif text-lg mb-3"
          >
            Inicia sesión para registrar tu brew
          </h3>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-4">
            Necesitas una cuenta para guardar tus brews y ganar XP.
          </p>
          <button ref={closeRef} onClick={onClose} className="btn-primary w-full">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        ref={formDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="brew-log-title"
        initial={reduceMotion ? false : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-1rem)] w-full max-w-md overflow-y-auto overscroll-contain border border-gold-500/30 bg-coffee-100 p-5 dark:bg-coffee-900 sm:p-6"
        style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 1rem)' }}
      >
        <div className="sticky top-0 z-10 -mx-2 mb-4 flex items-center justify-between bg-coffee-100 px-2 py-2 dark:bg-coffee-900">
          <h3 id="brew-log-title" className="text-coffee-900 dark:text-cream font-serif text-lg">
            Registrar Brew
          </h3>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="icon-button text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-5">
          {recipe.title}
          {recipe.method ? ` · ${recipe.method}` : ''}
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-xs p-2 mb-4 rounded">
            {error}
          </div>
        )}

        {/* Rating */}
        <div className="mb-5">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">
            Calificación
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                aria-label={`Calificación ${r} de 10`}
                aria-pressed={rating === r}
                className={`flex min-h-11 min-w-11 items-center justify-center transition-colors ${r <= rating ? 'text-gold-400' : 'text-coffee-600 hover:text-gold-300'}`}
              >
                <Star className="w-5 h-5 fill-current" />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe tu experiencia..."
            className="field-control min-h-24 resize-none"
          />
          <p className="text-xs text-coffee-600 mt-1 text-right">{notes.length}/500</p>
        </div>

        {/* Photo */}
        <div className="mb-5">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">
            Foto (opcional)
          </label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full h-28 object-cover rounded" />
              <button
                type="button"
                onClick={() => {
                  if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                  }
                  setPhotoPreview(null);
                  setPhotoUrl('');
                }}
                aria-label="Eliminar foto"
                className="absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center rounded bg-red-600/80 text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-coffee-200 p-4 transition-colors hover:border-gold-500 dark:border-coffee-700">
              <Upload className="w-4 h-4 text-coffee-500" />
              <span className="text-xs text-coffee-600 dark:text-coffee-400">Subir foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                aria-label="Seleccionar foto del brew"
              />
            </label>
          )}
        </div>

        {/* Parámetros técnicos */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="flex min-h-11 w-full items-center gap-2 text-left text-xs uppercase tracking-wider text-coffee-500 transition-colors hover:text-coffee-700 dark:hover:text-coffee-300"
          >
            {showTechnical ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Parámetros técnicos
          </button>
          {showTechnical && (
            <div className="space-y-4">
              {/* Grind size */}
              <div>
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1">
                  Molido
                </label>
                <select
                  value={grindSize}
                  onChange={(e) => setGrindSize(e.target.value)}
                  className="field-control"
                >
                  <option value="">Seleccionar</option>
                  {GRIND_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Water temp */}
              <div>
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1">
                  Temp. agua (°C)
                </label>
                <input
                  type="number"
                  value={waterTemp}
                  onChange={(e) => setWaterTemp(e.target.value ? Number(e.target.value) : '')}
                  min={0}
                  max={110}
                  placeholder="93"
                  className="field-control"
                />
              </div>

              {/* Brew time */}
              <div>
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1">
                  Tiempo (segundos)
                </label>
                <input
                  type="number"
                  value={brewTime}
                  onChange={(e) => setBrewTime(e.target.value ? Number(e.target.value) : '')}
                  min={1}
                  max={3600}
                  placeholder="180"
                  className="field-control"
                />
              </div>

              {/* Coffee weight */}
              <div>
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1">
                  Café (gramos)
                </label>
                <input
                  type="number"
                  value={coffeeWeight}
                  onChange={(e) => setCoffeeWeight(e.target.value ? Number(e.target.value) : '')}
                  min={1}
                  max={100}
                  placeholder="15"
                  className="field-control"
                />
              </div>

              {/* Water volume */}
              <div>
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1">
                  Agua (ml)
                </label>
                <input
                  type="number"
                  value={waterVolume}
                  onChange={(e) => setWaterVolume(e.target.value ? Number(e.target.value) : '')}
                  min={1}
                  max={2000}
                  placeholder="250"
                  className="field-control"
                />
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1">
                  Equipo
                </label>
                <div className="max-h-[300px] overflow-y-auto border border-coffee-200 dark:border-coffee-700 p-2 space-y-1.5">
                  {(!equipmentList || equipmentList.length === 0) && (
                    <p className="text-xs text-coffee-500 italic">Sin equipo registrado</p>
                  )}
                  {equipmentList?.map((eq) => (
                    <label
                      key={eq.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 px-2 text-sm text-coffee-900 dark:text-cream"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEquipmentIds.includes(eq.id)}
                        onChange={() => toggleEquipment(eq.id)}
                        className="accent-gold-500"
                      />
                      {eq.name}
                      {eq.brand ? ` (${eq.brand})` : ''}
                    </label>
                  ))}
                </div>
              </div>

              {/* Flavor tags */}
              <div>
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1">
                  Sabores (máx 3)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FLAVOR_OPTIONS.map((tag) => {
                    const selected = flavorTags.includes(tag);
                    const atMax = !selected && flavorTags.length >= 3;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => !atMax && toggleFlavorTag(tag)}
                        disabled={atMax}
                        className={`min-h-11 px-3 py-2 text-xs border transition-colors ${
                          selected
                            ? 'bg-gold-500/20 border-gold-500 text-gold-400'
                            : atMax
                              ? 'border-coffee-600 text-coffee-600 cursor-not-allowed opacity-40'
                              : 'border-coffee-300 dark:border-coffee-600 text-coffee-700 dark:text-coffee-300 hover:border-gold-500'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 -mx-2 bg-coffee-100 px-2 pb-1 pt-3 dark:bg-coffee-900">
          <div className="mb-3 rounded border border-gold-500/20 bg-gold-500/10 p-3 text-xs text-gold-500">
            Ganarás <span className="font-bold">+{xpPreview} XP</span> por este brew
          </div>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? 'Subiendo foto...'
              : submitting
                ? 'Registrando...'
                : `Registrar Brew (+${xpPreview} XP)`}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
