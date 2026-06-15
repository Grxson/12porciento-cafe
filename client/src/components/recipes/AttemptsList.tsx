import { useState, useEffect } from 'react';
import { baristaApi } from '../../api';

interface BrewAttempt {
  id: string;
  rating: number;
  notes?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  status?: string; // for offline-queued brews (future)
}

interface AttemptsListProps {
  recipeId: string;
  userId: string;
}

export default function AttemptsList({ recipeId, userId }: AttemptsListProps) {
  const [brews, setBrews] = useState<BrewAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    baristaApi.getUserBrews(userId, { recipeId, limit: '20' })
      .then((res) => setBrews(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, recipeId]);

  if (loading) return (
    <div className="text-xs text-coffee-600 dark:text-coffee-400 mt-4">Cargando intentos...</div>
  );
  if (brews.length === 0) return (
    <div className="text-xs text-coffee-500 mt-4">Sin intentos aún. ¡Sé el primero en preparar esta receta!</div>
  );

  return (
    <div className="mt-6 border-t border-coffee-200/50 dark:border-coffee-800/50 pt-4">
      <h3 className="text-sm font-semibold text-coffee-900 dark:text-cream mb-3">Tus Intentos</h3>
      <div className="space-y-3">
        {brews.map((brew) => (
          <div key={brew.id} className="flex gap-3 items-start">
            {brew.photoUrl && (
              <img
                src={brew.photoUrl}
                alt="Foto del brew"
                className="w-14 h-14 object-cover rounded flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gold-400">{brew.rating}/10</span>
                <span className="text-[10px] text-coffee-500">
                  {new Date(brew.createdAt).toLocaleDateString('es-MX')}
                </span>
              </div>
              {brew.notes && (
                <p className="text-xs text-coffee-600 dark:text-coffee-400 mt-1 line-clamp-2">{brew.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
