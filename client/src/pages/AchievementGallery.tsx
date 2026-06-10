import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { baristaApi } from '../api';
import type { AchievementWithUnlock } from '../types';

const rarityConfig: Record<string, { label: string; color: string }> = {
  COMMON:    { label: 'Común',     color: 'text-coffee-400 bg-coffee-800/60' },
  RARE:      { label: 'Raro',      color: 'text-blue-400 bg-blue-900/30' },
  EPIC:      { label: 'Épico',     color: 'text-purple-400 bg-purple-900/30' },
  LEGENDARY: { label: 'Legendario', color: 'text-gold-400 bg-gold-500/10' },
};

function AchievementSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-coffee-900 border border-coffee-800 p-5 space-y-3">
          <div className="shimmer-dark w-10 h-10 rounded-full" />
          <div className="shimmer-dark h-4 w-3/4" />
          <div className="shimmer-dark h-3 w-full" />
          <div className="shimmer-dark h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function AchievementGallery() {
  const [achievements, setAchievements] = useState<AchievementWithUnlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    baristaApi.getAchievements()
      .then((res) => setAchievements(res.data.achievements))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unlocked = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="min-h-screen bg-coffee-950 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Colección</p>
          <h1 className="font-serif text-4xl text-cream mb-2">Mis Logros</h1>
          {!loading && (
            <p className="text-coffee-400 text-sm">
              {unlocked} / {achievements.length} desbloqueados
            </p>
          )}
        </div>

        {loading ? (
          <AchievementSkeleton />
        ) : achievements.length === 0 ? (
          <p className="text-center text-coffee-500 py-12">No hay logros disponibles aún.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {achievements.map((a) => {
              const rarity = rarityConfig[a.rarity] ?? rarityConfig.COMMON;
              const isUnlocked = a.unlockedAt !== null;
              return (
                <div
                  key={a.id}
                  className={`bg-coffee-900 border p-5 transition-colors ${
                    isUnlocked ? 'border-gold-500/30' : 'border-coffee-800'
                  }`}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center mb-3">
                    <span
                      className={`text-3xl select-none ${isUnlocked ? '' : 'grayscale opacity-40'}`}
                    >
                      {a.icon}
                    </span>
                    {!isUnlocked && (
                      <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-coffee-600" />
                    )}
                  </div>

                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${rarity.color}`}>
                    {rarity.label}
                  </span>

                  <h3 className={`font-serif text-base mt-2 mb-1 ${isUnlocked ? 'text-cream' : 'text-coffee-600'}`}>
                    {a.name}
                  </h3>
                  <p className="text-coffee-500 text-xs leading-relaxed mb-3">{a.description}</p>

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
