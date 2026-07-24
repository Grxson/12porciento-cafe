import { useParams, Link } from 'react-router-dom';
import { Trophy, Zap, Coffee, Star, Share2 } from 'lucide-react';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useBaristaProfileQuery } from '../hooks/queries/useBaristaProfileQuery';
import { useBaristaStatsQuery } from '../hooks/queries/useBaristaStatsQuery';
import PushPermissionBanner from '../components/PushPermissionBanner';
import { useUser } from '../context/UserContext';
import { useShare } from '../hooks/useShare';
import FollowButton from '../components/FollowButton';
import BrewComparator from '../components/barista/BrewComparator';
import StreakHeatmap from '../components/StreakHeatmap';
import RankBadge from '../components/RankBadge';
import StreakWidget from '../components/StreakWidget';
import { PageMeta } from '../hooks/usePageMeta';
import BrewLikeButton from '../components/BrewLikeButton';
import BrewPurchaseButton from '../components/BrewPurchaseButton';
import BaristaRecords from '../components/BaristaRecords';
import EquipmentRecs from '../components/EquipmentRecs';
import SubscriptionMatchBanner from '../components/SubscriptionMatchBanner';
import FlavorRadarChart from '../components/FlavorRadarChart';
import CollapsibleSection from '../components/CollapsibleSection';
import { useClientTheme } from '../context/ThemeContext';

export default function BaristaProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading: loading, error } = useBaristaProfileQuery(userId ?? '');
  const currentUser = useUser((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;
  const { data: stats, isLoading: statsLoading } = useBaristaStatsQuery(userId);
  const { share } = useShare();
  const { dark } = useClientTheme();

  const chartColors = {
    text: dark ? '#e8d5b7' : '#4a3728',
    grid: dark ? '#3d2015' : '#e8d5c4',
    bg: dark ? '#1a0f0a' : '#ffffff',
    border: dark ? '#2c1810' : '#e8d5c4',
    accent: '#c9a96e',
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-24 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Coffee className="w-12 h-12 text-coffee-700 dark:text-coffee-400 mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
            Usuario no encontrado
          </h2>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
            No se especificó un usuario válido.
          </p>
          <Link to="/" className="btn-primary">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
        <PageMeta title="Perfil Barista" description="Nivel barista, experiencia y logros." />
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="flex items-center gap-4 pt-6">
            <div className="shimmer dark:shimmer-dark w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="shimmer dark:shimmer-dark h-6 w-40" />
              <div className="shimmer dark:shimmer-dark h-4 w-24" />
            </div>
          </div>
          <div className="shimmer dark:shimmer-dark h-3 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 space-y-2"
              >
                <div className="shimmer dark:shimmer-dark h-7 w-12" />
                <div className="shimmer dark:shimmer-dark h-3 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 space-y-2"
              >
                <div className="shimmer dark:shimmer-dark h-4 w-3/4" />
                <div className="shimmer dark:shimmer-dark h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-coffee-950 pt-24 flex items-center justify-center px-4">
        <PageMeta title="Perfil Barista" description="Nivel barista, experiencia y logros." />
        <div className="text-center max-w-sm">
          <Coffee className="w-12 h-12 text-coffee-400 mx-auto mb-4" />
          {isOwnProfile ? (
            <>
              <h2 className="font-serif text-2xl text-cream mb-2">Sin brews aún</h2>
              <p className="text-coffee-400 text-sm mb-6">
                Prepara una receta en modo en vivo y regístrala para comenzar tu camino como
                barista.
              </p>
              <Link to="/recetas" className="btn-primary">
                Ver recetas
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-cream mb-2">Perfil no encontrado</h2>
              <p className="text-coffee-400 text-sm">
                Este barista aún no ha registrado ningún brew.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const xpInCurrentLevel = profile.totalXp % 100;
  const xpProgress = xpInCurrentLevel / 100;
  const xpToNext = 100 - xpInCurrentLevel;

  return (
    <div className="min-h-dvh bg-coffee-50 dark:bg-coffee-950">
      <PageMeta
        title={`Perfil de ${currentUser?.name || 'Barista'}`}
        description="Nivel barista, experiencia y logros."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Banner ── */}
        <div className="relative -mx-4 sm:-mx-0 sm:rounded-xl overflow-hidden">
          {profile.bannerUrl ? (
            <div
              className="aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.bannerUrl})` }}
            />
          ) : (
            <div className="aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] bg-gradient-to-r from-coffee-900 via-coffee-800 to-gold-900/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/60 via-transparent to-coffee-950/20 pointer-events-none" />
        </div>

        {/* ── Layout lg: sidebar + contenido ── */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 lg:items-start">
          {/* ── Sidebar ── */}
          <div className="flex items-end gap-4 md:gap-5 -mt-10 md:-mt-14 relative z-10 mb-6 lg:mb-0 lg:mt-0">
            <div className="shrink-0">
              <RankBadge
                level={profile.level}
                size="lg"
                frameType={profile.bannerUrl ? 'avatar' : 'badge'}
                avatarUrl={profile.user?.avatarUrl}
                name={profile.user?.name}
                showLabel={false}
              />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              {profile.user && (
                <p className="line-clamp-2 break-words font-serif text-xl leading-tight text-coffee-900 dark:text-cream md:text-2xl">
                  {profile.user.name}
                </p>
              )}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-coffee-600 dark:text-coffee-400">
                <span className="text-gold-500 font-semibold">Nivel {profile.level}</span>
                <span className="text-coffee-400 dark:text-coffee-600">·</span>
                <span>{profile.totalBrews} brews</span>
                {profile.totalXp > 0 && (
                  <>
                    <span className="text-coffee-400 dark:text-coffee-600">·</span>
                    <span className="text-gold-500">{profile.totalXp} XP</span>
                  </>
                )}
                {profile.rankTitle && (
                  <>
                    <span className="text-coffee-400 dark:text-coffee-600">·</span>
                    <span>{profile.rankTitle}</span>
                  </>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-coffee-600 dark:text-coffee-400 italic mt-1 leading-relaxed line-clamp-2">
                  {profile.bio}
                </p>
              )}
              {!isOwnProfile && profile.user && (
                <div className="flex items-center gap-2 mt-3">
                  <FollowButton
                    targetUserId={profile.user.id}
                    targetUserName={profile.user.name}
                    size="sm"
                  />
                  <button
                    onClick={() =>
                      share({
                        title: `Perfil de ${profile.user!.name}`,
                        text: `Mira el perfil barista de ${profile.user!.name} en 12% Café`,
                      })
                    }
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-coffee-300 px-4 text-xs text-coffee-600 transition-colors hover:bg-coffee-100 dark:border-coffee-600 dark:text-coffee-400 dark:hover:bg-coffee-800"
                    aria-label="Compartir perfil"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Main content ── */}
          <div className="lg:col-start-2 min-w-0">
            {isOwnProfile && <PushPermissionBanner />}

            {/* Streak Widget + Heatmap — siempre visibles, compactos */}
            {profile.currentStreak !== undefined && (
              <div className="mb-4">
                <StreakWidget
                  currentStreak={profile.currentStreak}
                  isActive={profile.currentStreak > 0}
                />
              </div>
            )}
            {profile.streakData && profile.streakData.length > 0 && (
              <div className="mb-6">
                <StreakHeatmap data={profile.streakData} />
              </div>
            )}

            {/* Stats Rápidas — siempre visibles */}
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: <Trophy className="w-5 h-5 text-gold-500" />,
                  label: 'Nivel',
                  value: profile.level,
                },
                {
                  icon: <Zap className="w-5 h-5 text-gold-500" />,
                  label: 'XP Total',
                  value: profile.totalXp,
                },
                {
                  icon: <Coffee className="w-5 h-5 text-gold-500" />,
                  label: 'Brews',
                  value: profile.totalBrews,
                },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  className={`border border-coffee-200 bg-white dark:border-coffee-800 dark:bg-coffee-900 p-4 text-center ${label === 'Nivel' ? 'col-span-2 sm:col-span-1' : ''}`}
                >
                  <div className="flex justify-center mb-2">{icon}</div>
                  <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-1">
                    {label}
                  </p>
                  <p className="text-xl font-bold text-coffee-900 dark:text-cream sm:text-2xl">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* XP Progress */}
            <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 mb-4">
              <div className="flex justify-between mb-2">
                <p className="text-sm text-coffee-600 dark:text-coffee-400">
                  Progreso nivel {profile.level + 1}
                </p>
                <p className="text-xs text-coffee-500 dark:text-coffee-400">
                  {xpInCurrentLevel}/100 XP
                </p>
              </div>
              <div
                className="h-2 bg-coffee-200 dark:bg-coffee-800 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(xpProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso XP al siguiente nivel"
              >
                <div
                  className="h-full bg-gold-500 transition-all duration-500"
                  style={{ width: `${xpProgress * 100}%` }}
                />
              </div>
              <p className="text-xs text-coffee-500 dark:text-coffee-400 mt-2">
                {xpToNext} XP para el siguiente nivel
              </p>
            </div>

            {/* Achievements — siempre visibles */}
            {profile.achievements.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">Logros</h2>
                  <Link
                    to="/logros"
                    className="text-xs text-gold-500 hover:text-gold-400 transition-colors"
                  >
                    Ver todos ({profile.achievements.length})
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {profile.achievements.slice(0, 4).map((unlock) => (
                    <div
                      key={unlock.id}
                      className="bg-white dark:bg-coffee-900 border border-gold-500/30 p-3 text-center hover:border-gold-500 transition-colors"
                      title={unlock.achievement.description}
                    >
                      <p className="text-3xl mb-1">{unlock.achievement.icon || '🏆'}</p>
                      <p className="text-xs text-coffee-900 dark:text-cream font-semibold leading-tight">
                        {unlock.achievement.name}
                      </p>
                      <p className="text-xs text-gold-500 mt-0.5">
                        +{unlock.achievement.xpReward} XP
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brews Recientes — siempre visibles */}
            {profile.brewLogs.length > 0 && (
              <div className="mb-4">
                <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">
                  Brews Recientes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {profile.brewLogs.map((brew) => (
                    <div
                      key={brew.id}
                      className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden"
                    >
                      {brew.photoUrl && (
                        <img
                          src={brew.photoUrl}
                          alt="brew"
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="p-4 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-coffee-900 dark:text-cream font-medium truncate">
                            {brew.recipe.title}
                          </p>
                          <p className="text-xs text-coffee-500 dark:text-coffee-400 mt-0.5">
                            {brew.recipe.method}
                            {brew.recipe.difficulty ? ` · ${brew.recipe.difficulty}` : ''} ·{' '}
                            {new Date(brew.createdAt).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          {brew.notes && (
                            <p className="text-sm text-coffee-700 dark:text-coffee-300 mt-2 line-clamp-2">
                              {brew.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4 shrink-0 flex flex-col items-end gap-1">
                          <p className="text-gold-400">
                            {brew.rating}/10 <span className="text-coffee-500">★</span>
                          </p>
                          <p className="text-xs text-gold-500">+{brew.xpEarned} XP</p>
                          <BrewLikeButton
                            brewId={brew.id}
                            initialLiked={false}
                            initialCount={0}
                            size="sm"
                          />
                          {brew.beanId && (
                            <BrewPurchaseButton beanId={brew.beanId} className="mt-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Secciones colapsables (PWA: lazy render on expand) ── */}

            {/* Stats Detalladas */}
            <CollapsibleSection
              title="📊 Estadísticas"
              sectionKey="stats"
              defaultOpen={false}
              badge={statsLoading ? undefined : stats ? '1' : undefined}
            >
              {statsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shimmer dark:shimmer-dark h-40 rounded" />
                  ))}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Radar */}
                  {stats.flavorRadar && (
                    <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-3">
                        Tu Perfil de Sabor
                      </p>
                      <FlavorRadarChart
                        userData={stats.flavorRadar.user}
                        communityData={stats.flavorRadar.community}
                      />
                    </div>
                  )}

                  {/* Método favorito */}
                  {stats.favoriteMethod && (
                    <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-2">
                        Método Favorito
                      </p>
                      <p className="text-xl font-semibold text-coffee-900 dark:text-cream">
                        {stats.favMethodEmoji} {stats.favoriteMethod}
                      </p>
                      <p className="text-xs text-coffee-600 dark:text-coffee-400 mt-1">
                        {stats.brewsPerMethod[stats.favoriteMethod] || 0} brews
                      </p>
                    </div>
                  )}

                  {/* Calificación promedio */}
                  {stats.totalBrews > 0 && (
                    <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-2">
                        Calificación Promedio
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-gold-500">{stats.avgRating}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.round(stats.avgRating)
                                  ? 'fill-gold-500 text-gold-500'
                                  : 'text-coffee-300 dark:text-coffee-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Brews por método — Pie */}
                  {Object.keys(stats.brewsPerMethod).length > 0 && (
                    <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-3">
                        Brews por Método
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={Object.entries(stats.brewsPerMethod).map(([method, count]) => ({
                              name: method,
                              value: count,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {Object.entries(stats.brewsPerMethod).map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  [
                                    '#c9a96e',
                                    '#8b5a2b',
                                    '#d4a76a',
                                    '#6b3a1f',
                                    '#a08055',
                                    '#a05a2c',
                                  ][i % 6]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: chartColors.bg,
                              border: `1px solid ${chartColors.border}`,
                              borderRadius: 0,
                              color: chartColors.text,
                            }}
                            itemStyle={{ color: chartColors.text }}
                            formatter={(value) => [`${value} brews`, 'Brews']}
                          />
                          <Legend
                            formatter={(value) => (
                              <span className="text-coffee-700 dark:text-coffee-300 text-xs">
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* XP/Semana — Bar */}
                  {stats.xpPerWeek.length > 0 && (
                    <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-3">
                        XP/Semana (Últimas 8)
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                          data={stats.xpPerWeek.map((w) => ({
                            semana: new Date(w.week + 'T12:00:00').toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                            }),
                            xp: w.xp,
                          }))}
                          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={chartColors.grid}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="semana"
                            tick={{ fill: chartColors.text, fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: chartColors.text, fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: chartColors.bg,
                              border: `1px solid ${chartColors.border}`,
                              borderRadius: 0,
                              color: chartColors.text,
                            }}
                            labelStyle={{
                              color: chartColors.accent,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                            itemStyle={{ color: chartColors.text, fontSize: 12 }}
                            formatter={(v) => [`${v} XP`, 'Experiencia']}
                          />
                          <Bar dataKey="xp" fill={chartColors.accent} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Brews por mes — Area */}
                  {stats.monthlyTrends && stats.monthlyTrends.length > 0 && (
                    <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-3">
                        Brews por Mes
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart
                          data={stats.monthlyTrends.map((m) => ({
                            mes: new Date(m.month + '-15T12:00:00').toLocaleDateString('es-MX', {
                              month: 'short',
                              year: '2-digit',
                            }),
                            brews: m.count,
                          }))}
                          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="goldGradStats" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#c9a96e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={chartColors.grid}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="mes"
                            tick={{ fill: chartColors.text, fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: chartColors.text, fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: chartColors.bg,
                              border: `1px solid ${chartColors.border}`,
                              borderRadius: 0,
                              color: chartColors.text,
                            }}
                            labelStyle={{
                              color: chartColors.accent,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                            itemStyle={{ color: chartColors.text, fontSize: 12 }}
                            formatter={(v) => [`${v}`, 'Brews']}
                          />
                          <Area
                            type="monotone"
                            dataKey="brews"
                            stroke={chartColors.accent}
                            strokeWidth={2}
                            fill="url(#goldGradStats)"
                            dot={false}
                            activeDot={{ r: 4, fill: chartColors.accent, strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Tags de sabor */}
                  {stats.flavorTags && Object.keys(stats.flavorTags).length > 0 && (
                    <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-3">
                        Tags de Sabor
                      </p>
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(
                          160,
                          Object.keys(stats.flavorTags).slice(0, 8).length * 32,
                        )}
                      >
                        <BarChart
                          data={Object.entries(stats.flavorTags)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([tag, count]) => ({ tag, count }))}
                          layout="vertical"
                          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={chartColors.grid}
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{ fill: chartColors.text, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="tag"
                            width={100}
                            tick={{ fill: chartColors.text, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: chartColors.bg,
                              border: `1px solid ${chartColors.border}`,
                              borderRadius: 0,
                              color: chartColors.text,
                            }}
                            formatter={(value) => [`${value} menciones`, 'Frecuencia']}
                          />
                          <Bar dataKey="count" fill={chartColors.accent} radius={[0, 2, 2, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Horarios */}
                  {stats.timeStats &&
                    stats.timeStats.earlyBirdCount +
                      stats.timeStats.nightOwlCount +
                      stats.timeStats.weekendCount >
                      0 && (
                      <div className="bg-coffee-50 dark:bg-coffee-950 border border-coffee-200 dark:border-coffee-800 p-4 rounded-lg">
                        <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase mb-3">
                          Horarios de Brew
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: 'Madrugador',
                                  value: stats.timeStats.earlyBirdCount,
                                  fill: '#c9a96e',
                                },
                                {
                                  name: 'Búho nocturno',
                                  value: stats.timeStats.nightOwlCount,
                                  fill: '#8b5a2b',
                                },
                                {
                                  name: 'Fines de semana',
                                  value: stats.timeStats.weekendCount,
                                  fill: '#d4a76a',
                                },
                              ].filter((d) => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                            />
                            <Tooltip
                              contentStyle={{
                                background: chartColors.bg,
                                border: `1px solid ${chartColors.border}`,
                                borderRadius: 0,
                                color: chartColors.text,
                              }}
                              itemStyle={{ color: chartColors.text }}
                              formatter={(value) => [`${value} brews`, '']}
                            />
                            <Legend
                              formatter={(value) => (
                                <span className="text-coffee-700 dark:text-coffee-300 text-xs">
                                  {value}
                                </span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-coffee-500 dark:text-coffee-400 text-center py-4">
                  No hay estadísticas disponibles
                </p>
              )}
            </CollapsibleSection>

            {/* Comparador */}
            <CollapsibleSection
              title="⚖️ Comparador de Brews"
              sectionKey="comparator"
              defaultOpen={false}
            >
              {profile.brewLogs.length > 0 && <BrewComparator brews={profile.brewLogs} />}
            </CollapsibleSection>

            {/* Records */}
            <CollapsibleSection
              title="🏆 Records Personales"
              sectionKey="records"
              defaultOpen={false}
            >
              {userId && <BaristaRecords userId={userId} />}
            </CollapsibleSection>

            {/* Equipamiento */}
            <CollapsibleSection title="☕ Equipamiento" sectionKey="equipment" defaultOpen={false}>
              {userId && <EquipmentRecs userId={userId} />}
            </CollapsibleSection>

            {/* Subscription Banner */}
            {userId && (
              <div className="mt-4">
                <SubscriptionMatchBanner userId={userId} />
              </div>
            )}

            {/* Empty state */}
            {profile.brewLogs.length === 0 && profile.achievements.length === 0 && (
              <div className="text-center py-12">
                <Coffee className="w-12 h-12 text-coffee-400 mx-auto mb-3" />
                <p className="text-coffee-500 dark:text-coffee-400">
                  Aún no hay brews registrados.
                </p>
                <p className="text-coffee-400 dark:text-coffee-500 text-sm mt-1">
                  ¡Prepara tu primer café y regístralo!
                </p>
              </div>
            )}
          </div>
          {/* end main col */}
        </div>
        {/* end grid sidebar+main */}
      </div>
      {/* end max-w-6xl */}
    </div>
  );
}
