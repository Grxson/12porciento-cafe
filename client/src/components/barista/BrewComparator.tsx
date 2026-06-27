import { useState } from 'react';

interface BrewLogForComparison {
  id: string;
  rating: number;
  notes?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  recipe?: { id: string; title: string; method: string; difficulty?: string } | null;
}

interface BrewComparatorProps {
  brews: BrewLogForComparison[];
}

export default function BrewComparator({ brews }: BrewComparatorProps) {
  const [brew1Id, setBrew1Id] = useState<string | null>(null);
  const [brew2Id, setBrew2Id] = useState<string | null>(null);

  const brew1 = brews.find((b) => b.id === brew1Id);
  const brew2 = brews.find((b) => b.id === brew2Id);

  if (!brew1 || !brew2) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-coffee-900 dark:text-cream mb-3">Comparar Intentos</h3>
        <div className="space-y-2 text-xs text-coffee-600 dark:text-coffee-400">
          <div>
            <label className="block mb-1">Primer brew:</label>
            <select
              value={brew1Id ?? ''}
              onChange={(e) => setBrew1Id(e.target.value || null)}
              className="w-full bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-2 py-1 rounded"
            >
              <option value="">Selecciona un brew...</option>
              {brews.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.recipe?.title ?? 'Receta'} — {b.rating}/10 ({new Date(b.createdAt).toLocaleDateString('es-MX')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Segundo brew:</label>
            <select
              value={brew2Id ?? ''}
              onChange={(e) => setBrew2Id(e.target.value || null)}
              className="w-full bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-2 py-1 rounded"
            >
              <option value="">Selecciona un brew...</option>
              {brews.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.recipe?.title ?? 'Receta'} — {b.rating}/10 ({new Date(b.createdAt).toLocaleDateString('es-MX')})
                </option>
              ))}
            </select>
          </div>
          {brews.length < 2 && (
            <p className="text-coffee-500 text-xs">Necesitas al menos 2 brews para comparar.</p>
          )}
        </div>
      </div>
    );
  }

  const ratingDiff = brew2.rating - brew1.rating;

  return (
    <div className="mb-6 border border-coffee-200 dark:border-coffee-700 p-4 rounded">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-coffee-900 dark:text-cream">Comparación</h3>
        <button
          onClick={() => { setBrew1Id(null); setBrew2Id(null); }}
          className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-gold-400"
        >
          ← Cambiar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { brew: brew1, label: 'A' },
          { brew: brew2, label: 'B', diff: ratingDiff },
        ].map(({ brew, label, diff }) => (
          <div key={brew.id} className="border border-coffee-200/50 dark:border-coffee-700/50 p-3 rounded text-xs">
            <p className="font-semibold text-coffee-900 dark:text-cream mb-1">{brew.recipe?.title ?? 'Receta'}</p>
            <div className="text-coffee-600 dark:text-coffee-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gold-400 font-bold">{brew.rating}/10</span>
                {diff !== undefined && diff !== 0 && (
                  <span className={`font-semibold ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                )}
              </div>
              <div className="text-xs">{new Date(brew.createdAt).toLocaleDateString('es-MX')}</div>
              {brew.photoUrl && (
                <img src={brew.photoUrl} alt={`Brew ${label}`} className="w-full h-20 object-cover rounded mt-1" />
              )}
              {brew.notes && <p className="line-clamp-2 mt-1">{brew.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
