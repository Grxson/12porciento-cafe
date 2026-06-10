import { useState, useEffect, useRef } from 'react';
import { X, Star, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBarista } from '../hooks/useBarista';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { uploadsApi } from '../api';
import type { Recipe } from '../types';

interface BrewLogFormProps {
  recipe: Recipe;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BrewLogForm({ recipe, onClose, onSuccess }: BrewLogFormProps) {
  const user = useUser((s) => s.user);
  const { submitBrewLog, loading, error } = useBarista(user?.id);
  const addToast = useToast((s) => s.add);

  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

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
    const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
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
      });
      addToast(`+${xpPreview} XP ganados ☕`, 'success');
      for (const a of newAchievements) {
        setTimeout(() => addToast(`🏆 Logro: ${a.icon} ${a.name} (+${a.xpReward} XP)`, 'success'), 400);
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
        <div className="bg-coffee-900 border border-gold-500/30 p-6 max-w-sm w-full">
          <h3 className="text-cream font-serif text-lg mb-3">Inicia sesión para registrar tu brew</h3>
          <p className="text-coffee-400 text-sm mb-4">Necesitas una cuenta para guardar tus brews y ganar XP.</p>
          <button onClick={onClose} className="btn-primary w-full">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-coffee-900 border border-gold-500/30 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-cream font-serif text-lg">Registrar Brew</h3>
          <button type="button" onClick={onClose} className="p-1 text-coffee-400 hover:text-cream transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-coffee-400 text-sm mb-5">
          {recipe.title}{recipe.method ? ` · ${recipe.method}` : ''}
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-xs p-2 mb-4 rounded">
            {error}
          </div>
        )}

        {/* Rating */}
        <div className="mb-5">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">Calificación</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                className={`transition-colors ${r <= rating ? 'text-gold-400' : 'text-coffee-600 hover:text-gold-300'}`}
              >
                <Star className="w-7 h-7 fill-current" />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe tu experiencia..."
            className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500 focus:outline-none resize-none"
          />
          <p className="text-xs text-coffee-600 mt-1 text-right">{notes.length}/500</p>
        </div>

        {/* Photo */}
        <div className="mb-5">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">Foto (opcional)</label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full h-28 object-cover rounded" />
              <button
                type="button"
                onClick={() => {
                  if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
                  setPhotoPreview(null);
                  setPhotoUrl('');
                }}
                className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-coffee-700 p-4 rounded cursor-pointer hover:border-gold-500 transition-colors">
              <Upload className="w-4 h-4 text-coffee-500" />
              <span className="text-xs text-coffee-400">Subir foto</span>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
        </div>

        {/* XP preview */}
        <div className="bg-gold-500/10 border border-gold-500/20 p-3 mb-5 text-xs text-gold-400 rounded">
          Ganarás <span className="font-bold">+{xpPreview} XP</span> por este brew
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Subiendo foto...' : submitting ? 'Registrando...' : `Registrar Brew (+${xpPreview} XP)`}
        </button>
      </motion.form>
    </motion.div>
  );
}
