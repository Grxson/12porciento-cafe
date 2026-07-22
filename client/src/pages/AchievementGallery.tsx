import { useEffect, useState } from 'react';
import { Lock, Trophy } from 'lucide-react';
import { baristaApi } from '../api';
import type { AchievementWithUnlock } from '../types';
import { PageMeta } from '../hooks/usePageMeta';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import TitleSelector from '../components/TitleSelector';

const rarityConfig: Record<string, { label: string; color: string }> = {
  COMMON: {
    label: 'Común',
    color:
      'text-coffee-600 dark:text-coffee-400 dark:text-coffee-400 bg-coffee-100 dark:bg-coffee-800/60',
  },
  RARE: { label: 'Raro', color: 'text-blue-400 bg-blue-900/30' },
  EPIC: { label: 'Épico', color: 'text-purple-400 bg-purple-900/30' },
  LEGENDARY: { label: 'Legendario', color: 'text-gold-400 bg-gold-500/10' },
};

const unlockHints: Record<string, string> = {
  first_brew: 'Prepara y registra tu primer café',
  five_brews: 'Acumula 5 preparaciones registradas',
  ten_brews: 'Acumula 10 preparaciones registradas',
  perfect_brew: 'Obtén una calificación perfecta en tu preparación',
  v60_5: 'Registra 5 preparaciones con V60',
  aeropress_5: 'Registra 5 preparaciones con AeroPress',
  espresso_5: 'Registra 5 preparaciones con Espresso',
  streak_3: 'Registra preparaciones 3 días seguidos',
  streak_7: 'Registra preparaciones 7 días seguidos',
  coffee_connoisseur: 'Acumula 50 preparaciones registradas',
  method_collector: 'Domina 3 métodos con al menos 5 preparaciones cada uno',
  master_taster: 'Mantén un promedio de calificación ≥ 4.5',
  perfect_streak_30: 'Alcanza una racha de 30 días de preparaciones',
  early_bird: 'Registra 10 preparaciones entre las 5am y 9am',
  night_owl: 'Registra 10 preparaciones entre las 9pm y 5am',
  weekend_warrior: 'Registra 15 preparaciones en fines de semana',
};

function AchievementSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 space-y-3"
        >
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
  const [progressData, setProgressData] = useState<
    Record<string, { current: number; target: number }>
  >({});
  const currentUser = useUser((s) => s.user);
  const { add: addToast } = useToast();
  const [titleRefreshKey, setTitleRefreshKey] = useState(0);

  const handleTitleSelect = async (titleId: string | null) => {
    try {
      await baristaApi.updateProfile({ activeTitleId: titleId ?? undefined });
      addToast('Título actualizado', 'success');
      setTitleRefreshKey((k) => k + 1);
    } catch {
      addToast('Error al actualizar título', 'error');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [achievementsRes, profileRes] = await Promise.all([
          baristaApi.getAchievements(),
          currentUser ? baristaApi.getProfile(currentUser.id) : Promise.resolve(null),
        ]);

        setAchievements(achievementsRes.data.achievements);

        // Build progress data from profile
        if (profileRes) {
          const profile = profileRes.data.data;
          const progress: Record<string, { current: number; target: number }> = {};

          const totalBrews = profile.totalBrews || 0;
          progress['five_brews'] = { current: Math.min(totalBrews, 5), target: 5 };
          progress['ten_brews'] = { current: Math.min(totalBrews, 10), target: 10 };
          progress['coffee_connoisseur'] = { current: Math.min(totalBrews, 50), target: 50 };

          if (profile.brewLogs) {
            const methodCounts: Record<string, number> = {};
            profile.brewLogs.forEach((log: { recipe?: { method?: string } }) => {
              const method = log.recipe?.method;
              if (method) methodCounts[method] = (methodCounts[method] || 0) + 1;
            });
            progress['v60_5'] = { current: Math.min(methodCounts['V60'] || 0, 5), target: 5 };
            progress['aeropress_5'] = {
              current: Math.min(methodCounts['AeroPress'] || 0, 5),
              target: 5,
            };
            progress['espresso_5'] = {
              current: Math.min(methodCounts['Espresso'] || 0, 5),
              target: 5,
            };
          }

          // Use server-computed methodCounts for method_collector (more accurate)
          const mc: Record<string, number> = profile.methodCounts || {};
          const methodsWith5 = Object.values(mc).filter((c) => c >= 5).length;
          progress['method_collector'] = { current: Math.min(methodsWith5, 3), target: 3 };

          if (profile.currentStreak !== undefined) {
            progress['streak_3'] = { current: Math.min(profile.currentStreak, 3), target: 3 };
            progress['streak_7'] = { current: Math.min(profile.currentStreak, 7), target: 7 };
          }

          if (profile.longestStreak !== undefined) {
            progress['perfect_streak_30'] = {
              current: Math.min(profile.longestStreak, 30),
              target: 30,
            };
          }

          if (profile.avgRating !== undefined) {
            progress['master_taster'] = {
              current: Math.min(Math.round(profile.avgRating * 10), 45),
              target: 45,
            };
          }

          if (profile.earlyBirdCount !== undefined) {
            progress['early_bird'] = { current: Math.min(profile.earlyBirdCount, 10), target: 10 };
          }
          if (profile.nightOwlCount !== undefined) {
            progress['night_owl'] = { current: Math.min(profile.nightOwlCount, 10), target: 10 };
          }
          if (profile.weekendCount !== undefined) {
            progress['weekend_warrior'] = {
              current: Math.min(profile.weekendCount, 15),
              target: 15,
            };
          }

          setProgressData(progress);
        }
      } catch (err) {
        console.error('Error loading achievement data:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  const unlocked = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
      <PageMeta
        title="Logros"
        description="Todos los logros disponibles en 12% Café. Completa cada desafío barista."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Colección</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2">Mis Logros</h1>
          {!loading && (
            <p className="text-coffee-600 dark:text-coffee-400 dark:text-coffee-400 text-sm">
              {unlocked} / {achievements.length} desbloqueados
            </p>
          )}
        </div>

        {loading ? (
          <AchievementSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-coffee-500 dark:text-coffee-400 text-sm mb-3">
              No se pudieron cargar los logros.
            </p>
            <button
              onClick={() => {
                setError(false);
                setLoading(true);
                baristaApi
                  .getAchievements()
                  .then((res) => setAchievements(res.data.achievements))
                  .catch(() => setError(true))
                  .finally(() => setLoading(false));
              }}
              className="text-xs text-gold-500 hover:text-gold-400 underline transition-colors"
              aria-label="Reintentar carga de logros"
            >
              Reintentar
            </button>
          </div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-12">
            <Trophy
              className="w-12 h-12 text-coffee-700 dark:text-coffee-400 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-coffee-500 dark:text-coffee-400">No hay logros disponibles aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                      <Lock
                        aria-hidden="true"
                        className="absolute -bottom-1 -right-1 w-4 h-4 text-coffee-600 dark:text-coffee-400"
                      />
                    )}
                  </div>

                  <span className={`text-xs uppercase tracking-widest px-2 py-0.5 ${rarity.color}`}>
                    {rarity.label}
                  </span>

                  <h3
                    className={`font-serif text-base mt-2 mb-1 ${isUnlocked ? 'text-coffee-900 dark:text-cream' : 'text-coffee-600 dark:text-coffee-400'}`}
                  >
                    {a.name}
                  </h3>
                  <p className="text-coffee-500 dark:text-coffee-400 text-xs leading-relaxed">
                    {a.description}
                  </p>

                  {/* Progress bar for locked achievements */}
                  {!isUnlocked && progressData[a.slug] && (
                    <div className="mt-2 mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-coffee-400 dark:text-coffee-500 text-xs font-medium">
                          {progressData[a.slug].current} de {progressData[a.slug].target}
                        </p>
                      </div>
                      <div className="w-full h-1.5 bg-coffee-200 dark:bg-coffee-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-400 transition-all duration-300"
                          style={{
                            width: `${(progressData[a.slug].current / progressData[a.slug].target) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {!isUnlocked && unlockHints[a.slug] && (
                    <p className="text-coffee-400 dark:text-coffee-500 text-xs italic mt-1 mb-3">
                      {unlockHints[a.slug]}
                    </p>
                  )}
                  {isUnlocked && <div className="mb-3" />}

                  {isUnlocked ? (
                    <div className="text-xs text-gold-500">
                      +{a.xpReward} XP ·{' '}
                      {new Date(a.unlockedAt!).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-coffee-600 dark:text-coffee-400">
                      +{a.xpReward} XP al desbloquear
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Títulos Barista ── */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Insignias</p>
            <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
              Títulos Barista
            </h2>
            <p className="text-coffee-600 dark:text-coffee-400 dark:text-coffee-400 text-sm">
              Gana logros para desbloquear títulos
            </p>
          </div>
          <TitleSelector key={titleRefreshKey} onSelect={handleTitleSelect} />
        </section>
      </div>
    </div>
  );
}
