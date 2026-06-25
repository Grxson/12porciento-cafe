import { useEffect, useState } from 'react';
import { Lock, Trophy } from 'lucide-react';
import { baristaApi } from '../api';
import type { AchievementWithUnlock } from '../types';
import { PageMeta } from '../hooks/usePageMeta';

const rarityConfig: Record<string, { label: string; color: string }> = {
  COMMON:    { label: 'Común',      color: 'text-coffee-600 dark:text-coffee-400 bg-coffee-100 dark:bg-coffee-800/60' },
  RARE:      { label: 'Raro',       color: 'text-blue-400 bg-blue-900/30' },
  EPIC:      { label: 'Épico',      color: 'text-purple-400 bg-purple-900/30' },
  LEGENDARY: { label: 'Legendario', color: 'text-gold-400 bg-gold-500/10' },
};

const unlockHints: Record<string, string> = {
  'first_brew':    'Prepara y registra tu primer café',
  'five_brews':    'Acumula 5 preparaciones registradas',
  'ten_brews':     'Acumula 10 preparaciones registradas',
  'perfect_brew':  'Obtén una calificación perfecta en tu preparación',
};

function AchievementSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 space-y-3">
          <div className="shimmer dark:shimmer-dark w-10 h-10 rounded-full" />
          <div className="shimmer dark:shimmer-dark h-4 w-3/4" />
          <div className="shimmer dark:shimmer-dark h-3 w-full" />
          <div className="shimmer dark:shimmer-dark h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function AchievementGallery() {
  const [achievements, setAchievements] = useState<AchievementWithUnlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    baristaApi.getAchievements()
      .then((res) => setAchievements(res.data.achievements))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const unlocked = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
      <PageMeta title="Logros" description="Todos los logros disponibles en 12% Café. Completa cada desafío barista." />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Colección</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2">Mis Logros</h1>
          {!loading && (
            <p className="text-coffee-600 dark:text-coffee-400 text-sm">
              {unlocked} / {achievements.length} desbloqueados
            </p>
          )}
        </div>

        {loading ? (
          <AchievementSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-coffee-500 text-sm mb-3">No se pudieron cargar los logros.</p>
            <button
              onClick={() => { setError(false); setLoading(true); baristaApi.getAchievements().then((res) => setAchievements(res.data.achievements)).catch(() => setError(true)).finally(() => setLoading(false)); }}
              className="text-xs text-gold-500 hover:text-gold-400 underline transition-colors"
              aria-label="Reintentar carga de logros"
            >
              Reintentar
            </button>
          </div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-coffee-700 mx-auto mb-3" aria-hidden="true" />
            <p className="text-coffee-500">No hay logros disponibles aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {achievements.map((a) => {
              const rarity = rarityConfig[a.rarity] ?? rarityConfig.COMMON;
              const isUnlocked = a.unlockedAt !== null;
              return (
                <div
                  key={a.id}
                  className={`bg-white dark:bg-coffee-900 border p-5 transition-colors ${
                    isUnlocked ? 'border-gold-500/30' : 'border-coffee-200 dark:border-coffee-800'
                  }`}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center mb-3">
                    <span
                      className={`text-3xl select-none ${isUnlocked ? '' : 'grayscale opacity-40'}`}
                    >
                      {a.icon}
                    </span>
                    {!isUnlocked && (
                      <Lock aria-hidden="true" className="absolute -bottom-1 -right-1 w-4 h-4 text-coffee-600" />
                    )}
                  </div>

                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${rarity.color}`}>
                    {rarity.label}
                  </span>

                  <h3 className={`font-serif text-base mt-2 mb-1 ${isUnlocked ? 'text-coffee-900 dark:text-cream' : 'text-coffee-600'}`}>
                    {a.name}
                  </h3>
                  <p className="text-coffee-500 text-xs leading-relaxed">{a.description}</p>
                  {!isUnlocked && unlockHints[a.slug] && (
                    <p className="text-coffee-400 dark:text-coffee-500 text-[10px] italic mt-1 mb-3">
                      {unlockHints[a.slug]}
                    </p>
                  )}
                  {isUnlocked && <div className="mb-3" />}

                  {isUnlocked ? (
                    <div className="text-xs text-gold-500">
                      +{a.xpReward} XP · {new Date(a.unlockedAt!).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  ) : (
                    <div className="text-xs text-coffee-600">+{a.xpReward} XP al desbloquear</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
