import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { notifyFollow, notifyLikeBrew, notifyAchievementUnlock } from '../lib/notifications';

const router = Router();

const brewLogLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiados registros. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function calculateXp(recipeDifficulty: string, rating: number): number {
  const baseXp: Record<string, number> = { FÁCIL: 10, MEDIA: 25, DIFÍCIL: 50 };
  return (baseXp[recipeDifficulty] ?? 25) + (rating - 1) * 5;
}

async function checkAndUnlockAchievements(
  userId: string,
): Promise<{ id: string; name: string; icon: string; xpReward: number }[]> {
  const today = new Date().toISOString().split('T')[0];

  const [
    profile,
    brewCount,
    hasPerfect,
    v60Count,
    aeropressCount,
    espressoCount,
    recentBrews,
    allBrews,
  ] = await Promise.all([
    prisma.baristaProfile.findUnique({
      where: { userId },
      include: { achievements: { include: { achievement: true } } },
    }),
    prisma.brewLog.count({ where: { userId } }),
    prisma.brewLog.findFirst({ where: { userId, rating: 10 }, select: { id: true } }),
    prisma.brewLog.count({ where: { userId, recipe: { method: 'V60' } } }),
    prisma.brewLog.count({ where: { userId, recipe: { method: 'AeroPress' } } }),
    prisma.brewLog.count({ where: { userId, recipe: { method: 'Espresso' } } }),
    prisma.brewLog.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brewLog.findMany({
      where: { userId },
      select: { createdAt: true, rating: true, recipe: { select: { method: true } } },
    }),
  ]);
  if (!profile) return [];

  // Compute streak
  const uniqueDates = Array.from(
    new Set(recentBrews.map((b: { createdAt: Date }) => b.createdAt.toISOString().split('T')[0])),
  )
    .sort()
    .reverse();

  let streak = 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (uniqueDates.length > 0) {
    const first = uniqueDates[0];
    if (first === today || first === yesterday) {
      for (let i = 0; i < uniqueDates.length; i++) {
        const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        if (uniqueDates[i] === expected) streak++;
        else break;
      }
    }
  }

  // Determine if streak is active (includes today or yesterday)
  // G10 achievements: Compute conditions for new achievements
  // Coffee Connoisseur: 50 brews
  const coffeeConnoisseurMet = brewCount >= 50;

  // Perfect Streak 30: 30 consecutive days
  let longestStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    if (uniqueDates[i] === expected) currentStreak++;
    else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 0;
      break;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);
  const perfectStreak30Met = longestStreak >= 30;

  // Method Collector: 5+ brews of 3 different methods
  const methodCounts = new Map<string, number>();
  allBrews.forEach((b: (typeof allBrews)[number]) => {
    const method = b.recipe.method || 'Unknown';
    methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
  });
  const methodCollectorMet = Array.from(methodCounts.values()).filter((c) => c >= 5).length >= 3;

  // Master Taster: average rating >= 8
  const avgRating = allBrews.length
    ? allBrews.reduce((s: number, b: (typeof allBrews)[number]) => s + b.rating, 0) /
      allBrews.length
    : 0;
  const masterTasterMet = avgRating >= 8 && allBrews.length >= 1;

  // Early Bird: 5 brews before 8am
  const earlyBirdMet =
    allBrews.filter((b: (typeof allBrews)[number]) => {
      const hour = new Date(b.createdAt).getHours();
      return hour < 8;
    }).length >= 5;

  // Night Owl: 5 brews after 9pm
  const nightOwlMet =
    allBrews.filter((b: (typeof allBrews)[number]) => {
      const hour = new Date(b.createdAt).getHours();
      return hour >= 21;
    }).length >= 5;

  // Weekend Warrior: 10 brews on weekends (Sat/Sun)
  const weekendBrews = allBrews.filter((b: (typeof allBrews)[number]) => {
    const day = new Date(b.createdAt).getDay();
    return day === 0 || day === 6;
  }).length;
  const weekendWarriorMet = weekendBrews >= 10;

  const candidates = [
    { slug: 'first_brew', met: brewCount >= 1 },
    { slug: 'five_brews', met: brewCount >= 5 },
    { slug: 'ten_brews', met: brewCount >= 10 },
    { slug: 'perfect_brew', met: hasPerfect !== null },
    { slug: 'v60_5', met: v60Count >= 5 },
    { slug: 'aeropress_5', met: aeropressCount >= 5 },
    { slug: 'espresso_5', met: espressoCount >= 5 },
    { slug: 'streak_3', met: streak >= 3 },
    { slug: 'streak_7', met: streak >= 7 },
    { slug: 'coffee_connoisseur', met: coffeeConnoisseurMet },
    { slug: 'perfect_streak_30', met: perfectStreak30Met },
    { slug: 'method_collector', met: methodCollectorMet },
    { slug: 'master_taster', met: masterTasterMet },
    { slug: 'early_bird', met: earlyBirdMet },
    { slug: 'night_owl', met: nightOwlMet },
    { slug: 'weekend_warrior', met: weekendWarriorMet },
  ];

  const unlocked: { id: string; name: string; icon: string; xpReward: number }[] = [];
  let bonusXp = 0;

  for (const c of candidates) {
    if (!c.met) continue;
    const alreadyUnlocked = profile.achievements.some(
      (a: { achievement: { slug: string } }) => a.achievement.slug === c.slug,
    );
    if (alreadyUnlocked) continue;
    const achievement = await prisma.achievement.findUnique({ where: { slug: c.slug } });
    if (!achievement) continue;
    await prisma.achievementUnlock.create({ data: { userId, achievementId: achievement.id } });
    bonusXp += achievement.xpReward;
    unlocked.push({
      id: achievement.id,
      name: achievement.name,
      icon: achievement.icon,
      xpReward: achievement.xpReward,
    });

    // Send achievement notification (non-blocking)
    notifyAchievementUnlock(userId, achievement.name, achievement.icon).catch((err) =>
      console.error('[notifyAchievementUnlock]', err),
    );
  }

  if (bonusXp > 0) {
    const after = await prisma.baristaProfile.update({
      where: { userId },
      data: { totalXp: { increment: bonusXp } },
    });
    await prisma.baristaProfile.update({
      where: { userId },
      data: { level: Math.floor(after.totalXp / 100) + 1 },
    });
  }

  return unlocked;
}

// GET /barista/leaderboard — MUST be before /:userId/profile
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || '50') || 50), 100);
    const period = ((req.query.period as string) || 'all-time').toLowerCase();

    // Calculate cutoff date based on period
    let dateFilter: { gte: Date } | undefined;
    if (period === 'this-week') {
      dateFilter = { gte: new Date(Date.now() - 7 * 86400000) };
    } else if (period === 'this-month') {
      dateFilter = { gte: new Date(Date.now() - 30 * 86400000) };
    }

    // For period-based filtering, we need to compute XP earned in that period
    let leaderboard = await prisma.baristaProfile.findMany({
      orderBy: [{ totalXp: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        brewLogs: dateFilter
          ? { where: { createdAt: dateFilter }, select: { xpEarned: true } }
          : false,
      },
    });

    // If period filter, recompute XP from brewLogs in that period and re-sort
    if (dateFilter) {
      leaderboard = leaderboard.map((entry: (typeof leaderboard)[number]) => ({
        ...entry,
        totalXp: entry.brewLogs
          ? entry.brewLogs.reduce((sum: number, log: { xpEarned: number }) => sum + log.xpEarned, 0)
          : 0,
      }));
      leaderboard.sort(
        (a: (typeof leaderboard)[number], b: (typeof leaderboard)[number]) =>
          b.totalXp - a.totalXp || a.createdAt.getTime() - b.createdAt.getTime(),
      );
    }

    res.json({ data: leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
});

// POST /barista/brew-logs
router.post(
  '/brew-logs',
  brewLogLimiter,
  requireUserAuth,
  async (req: UserAuthRequest, res: Response) => {
    try {
      const {
        recipeId,
        rating,
        notes,
        photoUrl,
        clientBrewId,
        grindSize,
        waterTemp,
        brewTime,
        coffeeWeight,
        waterVolume,
        beanId,
        equipmentIds,
        tags,
      } = req.body;
      const userId = req.user!.id;

      if (!recipeId || !Number.isInteger(rating) || rating < 1 || rating > 10) {
        return res.status(400).json({ error: 'recipeId y rating (1-10 entero) requeridos' });
      }
      if (notes && (typeof notes !== 'string' || notes.length > 500)) {
        return res.status(400).json({ error: 'Las notas no pueden superar 500 caracteres' });
      }
      if (
        photoUrl &&
        (typeof photoUrl !== 'string' || !/^\/api\/uploads\/[a-f0-9]{24}\.webp$/.test(photoUrl))
      ) {
        return res.status(400).json({ error: 'URL de foto no válida' });
      }
      if (
        waterTemp !== undefined &&
        (!Number.isInteger(waterTemp) || waterTemp < 0 || waterTemp > 110)
      ) {
        return res.status(400).json({ error: 'waterTemp debe ser entero 0-110°C' });
      }
      if (
        brewTime !== undefined &&
        (!Number.isInteger(brewTime) || brewTime < 1 || brewTime > 3600)
      ) {
        return res.status(400).json({ error: 'brewTime debe ser entero 1-3600s' });
      }
      if (
        coffeeWeight !== undefined &&
        (!Number.isInteger(coffeeWeight) || coffeeWeight < 1 || coffeeWeight > 100)
      ) {
        return res.status(400).json({ error: 'coffeeWeight debe ser entero 1-100g' });
      }
      if (
        waterVolume !== undefined &&
        (!Number.isInteger(waterVolume) || waterVolume < 1 || waterVolume > 2000)
      ) {
        return res.status(400).json({ error: 'waterVolume debe ser entero 1-2000ml' });
      }
      if (tags && (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string'))) {
        return res.status(400).json({ error: 'tags debe ser un array de strings' });
      }
      if (
        equipmentIds &&
        (!Array.isArray(equipmentIds) || equipmentIds.some((e: unknown) => typeof e !== 'string'))
      ) {
        return res.status(400).json({ error: 'equipmentIds debe ser un array de strings' });
      }

      if (clientBrewId) {
        const existing = await prisma.brewLog.findUnique({ where: { clientBrewId } });
        if (existing) {
          return res
            .status(409)
            .json({ data: { brewLog: existing, profile: null, newAchievements: [] } });
        }
      }

      const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!recipe) return res.status(404).json({ error: 'Receta no encontrada' });

      await prisma.baristaProfile.upsert({
        where: { userId },
        create: { userId, favoriteMethod: recipe.method },
        update: {},
      });

      const xpEarned = calculateXp(recipe.difficulty || 'MEDIA', rating);

      const brewLog = await prisma.brewLog.create({
        data: {
          userId,
          recipeId,
          rating,
          notes: notes?.trim() ?? null,
          photoUrl: photoUrl?.trim() ?? null,
          xpEarned,
          clientBrewId: clientBrewId ?? null,
          grindSize: grindSize?.trim() ?? null,
          waterTemp: waterTemp ?? null,
          brewTime: brewTime ?? null,
          coffeeWeight: coffeeWeight ?? null,
          waterVolume: waterVolume ?? null,
          beanId: beanId ?? null,
          equipmentIds: equipmentIds ?? [],
          tags: tags ?? [],
        },
        include: { recipe: { select: { id: true, title: true, method: true, difficulty: true } } },
      });

      let updatedProfile = await prisma.baristaProfile.update({
        where: { userId },
        data: {
          totalXp: { increment: xpEarned },
          totalBrews: { increment: 1 },
          favoriteMethod: recipe.method,
        },
      });
      const correctLevel = Math.floor(updatedProfile.totalXp / 100) + 1;
      if (updatedProfile.level !== correctLevel) {
        updatedProfile = await prisma.baristaProfile.update({
          where: { userId },
          data: { level: correctLevel },
        });
      }

      const newAchievements = await checkAndUnlockAchievements(userId);

      const finalProfile =
        newAchievements.length > 0
          ? await prisma.baristaProfile.findUnique({ where: { userId } })
          : updatedProfile;

      res.status(201).json({ data: { brewLog, profile: finalProfile, newAchievements } });
    } catch (err: unknown) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar brew' });
    }
  },
);

// GET /barista/achievements — MUST be before /:userId/profile
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    let userId: string | null = null;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
        if (payload.role === 'USER') userId = payload.id;
      } catch {
        /* invalid token — ignore */
      }
    }

    const achievements = await prisma.achievement.findMany({
      orderBy: { xpReward: 'asc' },
    });

    const unlockMap = new Map<string, string>();
    if (userId) {
      const unlocks = await prisma.achievementUnlock.findMany({
        where: { userId },
        select: { achievementId: true, unlockedAt: true },
      });
      unlocks.forEach((u: { achievementId: string; unlockedAt: Date }) =>
        unlockMap.set(u.achievementId, u.unlockedAt.toISOString()),
      );
    }

    const result = achievements.map(
      (a: {
        id: string;
        slug: string;
        name: string;
        description: string;
        icon: string;
        rarity: string;
        xpReward: number;
      }) => ({
        ...a,
        unlockedAt: unlockMap.get(a.id) ?? null,
      }),
    );

    res.json({ achievements: result });
  } catch {
    res.status(500).json({ error: 'Error al obtener logros' });
  }
});

// GET /barista/me/brewed-ids — lightweight list of recipe IDs the user has brewed
router.get('/me/brewed-ids', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const brews = await prisma.brewLog.findMany({
      where: { userId },
      select: { recipeId: true },
      distinct: ['recipeId'],
    });
    res.json({ data: brews.map((b) => b.recipeId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener recetas preparadas' });
  }
});

// GET /barista/:userId/brews — MUST be before /:userId/profile
router.get('/:userId/brews', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || '20') || 20), 100);
    const page = Math.max(1, parseInt((req.query.page as string) || '1') || 1);
    const recipeId = req.query.recipeId as string | undefined;

    const where = {
      userId,
      ...(recipeId ? { recipeId } : {}),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.brewLog.findMany({
        where,
        include: { recipe: { select: { id: true, title: true, method: true, difficulty: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.brewLog.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener brews' });
  }
});

// GET /barista/:userId/stats — aggregated stats with F3 extended data
router.get('/:userId/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const month = req.query.month as string | undefined;

    const where: { userId: string; createdAt?: { gte: Date; lt: Date } } = { userId };
    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      where.createdAt = { gte: start, lt: end };
    }

    const brews = await prisma.brewLog.findMany({
      where,
      include: { recipe: { select: { method: true, difficulty: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (brews.length === 0) {
      return res.json({
        data: {
          favoriteMethod: null,
          favMethodEmoji: null,
          avgRating: 0,
          totalBrews: 0,
          totalXp: 0,
          daysBrewed: 0,
          brewsPerMethod: {},
          xpPerWeek: [],
          flavorTags: {},
          equipmentUsage: {},
          monthlyTrends: [],
          timeStats: { earlyBirdCount: 0, nightOwlCount: 0, weekendCount: 0 },
        },
      });
    }

    // Favorite method (most brews)
    const methodCounts = new Map<string, number>();
    brews.forEach((b: (typeof brews)[number]) => {
      const method = b.recipe.method || 'Unknown';
      methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
    });
    const [favoriteMethod] = Array.from(methodCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    // Method emojis
    const methodEmojis: Record<string, string> = {
      V60: '☕',
      AeroPress: '🫖',
      Espresso: '💪',
      Moka: '⚡',
    };
    const favMethodEmoji = methodEmojis[favoriteMethod] || '☕';

    // Average rating
    const avgRating =
      brews.reduce((s: number, b: (typeof brews)[number]) => s + b.rating, 0) / brews.length;

    // XP per week (last 8 weeks)
    const weeklyXp = new Map<string, number>();
    brews.forEach((b: (typeof brews)[number]) => {
      const date = new Date(b.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyXp.set(weekKey, (weeklyXp.get(weekKey) ?? 0) + b.xpEarned);
    });
    const xpPerWeek = Array.from(weeklyXp.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([week, xp]) => ({ week, xp }));

    // ── F3 extended stats ──

    // Flavor tag cloud
    const flavorTags = new Map<string, number>();
    brews.forEach((b: (typeof brews)[number]) => {
      if (b.tags && Array.isArray(b.tags)) {
        b.tags.forEach((tag: string) => flavorTags.set(tag, (flavorTags.get(tag) ?? 0) + 1));
      }
    });
    const flavorTagCloud = Object.fromEntries(
      Array.from(flavorTags.entries()).sort((a, b) => b[1] - a[1]),
    );

    // Equipment usage
    const equipmentUsage = new Map<string, number>();
    brews.forEach((b: (typeof brews)[number]) => {
      if (b.equipmentIds && Array.isArray(b.equipmentIds)) {
        b.equipmentIds.forEach((eid: string) =>
          equipmentUsage.set(eid, (equipmentUsage.get(eid) ?? 0) + 1),
        );
      }
    });

    // Monthly trends (brews per month)
    const monthlyMap = new Map<string, number>();
    brews.forEach((b: (typeof brews)[number]) => {
      const monthKey = b.createdAt.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + 1);
    });
    const monthlyTrends = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    // Time-based stats
    let earlyBirdCount = 0;
    let nightOwlCount = 0;
    let weekendCount = 0;
    brews.forEach((b: (typeof brews)[number]) => {
      const h = b.createdAt.getHours();
      const d = b.createdAt.getDay();
      if (h < 8) earlyBirdCount++;
      if (h >= 21) nightOwlCount++;
      if (d === 0 || d === 6) weekendCount++;
    });

    // Total XP for filtered period
    const totalXp = brews.reduce((sum: number, b: (typeof brews)[number]) => sum + b.xpEarned, 0);

    // Unique days with brews
    const uniqueDays = new Set(
      brews.map((b: (typeof brews)[number]) => b.createdAt.toISOString().split('T')[0]),
    );
    const daysBrewed = uniqueDays.size;

    // ── F3 Radar: tag-based dimensions ──
    const RADAR_DIMS = ['Dulzor', 'Acidez', 'Cuerpo', 'Amargor', 'Final', 'Intensidad'] as const;
    const tagToDim: Record<string, string> = {
      caramelo: 'Dulzor',
      chocolate: 'Dulzor',
      dulce: 'Dulzor',
      vainilla: 'Dulzor',
      citrico: 'Acidez',
      citricos: 'Acidez',
      frutos: 'Acidez',
      floral: 'Acidez',
      acido: 'Acidez',
      cuerpo: 'Cuerpo',
      nueces: 'Cuerpo',
      cremoso: 'Cuerpo',
      amargo: 'Amargor',
      cacao: 'Amargor',
      especias: 'Amargor',
      herbal: 'Amargor',
      final: 'Final',
      persistente: 'Final',
      intenso: 'Intensidad',
      fuerte: 'Intensidad',
    };

    function computeRadar(brewsArr: typeof brews): { flavor: string; value: number }[] {
      const sums: Record<string, { total: number; count: number }> = {};
      RADAR_DIMS.forEach((d) => (sums[d] = { total: 0, count: 0 }));
      brewsArr.forEach((b: (typeof brews)[number]) => {
        if (!b.tags || !Array.isArray(b.tags)) return;
        b.tags.forEach((tag: string) => {
          const t = tag.toLowerCase();
          const dim = tagToDim[t] ?? Object.entries(tagToDim).find(([k]) => t.includes(k))?.[1];
          if (dim && sums[dim]) {
            sums[dim].total += b.rating;
            sums[dim].count += 1;
          }
        });
      });
      return RADAR_DIMS.map((d) => {
        const { total, count } = sums[d];
        const avg = count > 0 ? total / count : 0;
        return { flavor: d, value: Math.round(avg * 10) };
      });
    }

    const flavorRadarUser = computeRadar(brews);
    // Community radar: aggregate in DB instead of fetching all brew logs
    const communityRaw = await prisma.$queryRaw<
      Array<{ tag: string; total_rating: number; tag_count: bigint }>
    >`
      SELECT
        tag,
        SUM(rating)::float AS total_rating,
        COUNT(*)::bigint AS tag_count
      FROM "BrewLog", unnest("BrewLog".tags) AS tag
      GROUP BY tag
    `;
    const communityTagSums: Record<string, { total: number; count: number }> = {};
    RADAR_DIMS.forEach((d) => (communityTagSums[d] = { total: 0, count: 0 }));
    communityRaw.forEach((row) => {
      const tag = (row.tag || '').toLowerCase();
      const dim = tagToDim[tag] ?? Object.entries(tagToDim).find(([k]) => tag.includes(k))?.[1];
      if (dim && communityTagSums[dim]) {
        communityTagSums[dim].total += row.total_rating;
        communityTagSums[dim].count += Number(row.tag_count);
      }
    });
    const flavorRadarCommunity = RADAR_DIMS.map((d) => {
      const { total, count } = communityTagSums[d];
      const avg = count > 0 ? total / count : 0;
      return { flavor: d, value: Math.round(avg * 10) };
    });

    res.json({
      data: {
        favoriteMethod,
        favMethodEmoji,
        avgRating: Math.round(avgRating * 10) / 10,
        totalBrews: brews.length,
        totalXp,
        daysBrewed,
        brewsPerMethod: Object.fromEntries(methodCounts),
        xpPerWeek,
        flavorTags: flavorTagCloud,
        equipmentUsage: Object.fromEntries(equipmentUsage),
        monthlyTrends,
        timeStats: { earlyBirdCount, nightOwlCount, weekendCount },
        flavorRadar: { user: flavorRadarUser, community: flavorRadarCommunity },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener stats' });
  }
});

function getRankTitle(level: number): string {
  if (level <= 2) return 'Aprendiz';
  if (level <= 5) return 'Barista';
  if (level <= 10) return 'Maestro Tostador';
  if (level <= 15) return 'Catador Experto';
  if (level <= 20) return 'Maestro del Café';
  return 'Leyenda Viva';
}

// GET /barista/:userId/profile
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Fetch all brew logs for computed stats (method counts, avg rating, time-based)
    const allBrewLogs = await prisma.brewLog.findMany({
      where: { userId },
      select: { createdAt: true, rating: true, recipe: { select: { method: true } } },
    });

    const avgRating =
      allBrewLogs.length > 0
        ? allBrewLogs.reduce((sum, l) => sum + (l.rating || 0), 0) / allBrewLogs.length
        : 0;

    const methodCounts: Record<string, number> = {};
    let earlyBirdCount = 0;
    let nightOwlCount = 0;
    let weekendCount = 0;
    for (const l of allBrewLogs) {
      const method = l.recipe?.method;
      if (method) methodCounts[method] = (methodCounts[method] || 0) + 1;

      const h = l.createdAt.getHours();
      const d = l.createdAt.getDay();
      if (h >= 5 && h < 9) earlyBirdCount++;
      if (h >= 21 || h < 5) nightOwlCount++;
      if (d === 0 || d === 6) weekendCount++;
    }

    let profile = await prisma.baristaProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
        brewLogs: {
          include: {
            recipe: { select: { id: true, title: true, method: true, difficulty: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Compute streak data: daily brew counts for last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const rawBrews = await prisma.brewLog.findMany({
      where: { userId, createdAt: { gte: ninetyDaysAgo } },
      select: { createdAt: true },
    });
    const dateCount = new Map<string, number>();
    for (const b of rawBrews) {
      const day = b.createdAt.toISOString().split('T')[0];
      dateCount.set(day, (dateCount.get(day) ?? 0) + 1);
    }
    const streakData: { date: string; count: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      streakData.push({ date: d, count: dateCount.get(d) ?? 0 });
    }

    if (!profile) {
      const rawUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatarUrl: true },
      });
      if (!rawUser) return res.status(404).json({ error: 'Perfil no encontrado' });
      profile = {
        id: rawUser.id,
        userId: rawUser.id,
        user: { id: rawUser.id, name: rawUser.name, avatarUrl: rawUser.avatarUrl },
        level: 1,
        totalXp: 0,
        totalBrews: 0,
        favoriteMethod: null,
        bio: null,
        bannerUrl: null,
        activeTitleId: null,
        flavorProfile: null,
        achievements: [],
        brewLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }

    // Recompute current streak for profile response
    const ninetyDaysAgoBrews = rawBrews;
    const uniqueDatesProfile = Array.from(
      new Set(
        ninetyDaysAgoBrews.map((b: { createdAt: Date }) => b.createdAt.toISOString().split('T')[0]),
      ),
    )
      .sort()
      .reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    if (uniqueDatesProfile.length > 0) {
      const firstDate = uniqueDatesProfile[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (firstDate === todayStr || firstDate === yesterday) {
        for (let i = 0; i < uniqueDatesProfile.length; i++) {
          const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
          if (uniqueDatesProfile[i] === expected) currentStreak++;
          else break;
        }
      }
      // Compute longest streak
      let tempStreak = 1;
      for (let i = 1; i < uniqueDatesProfile.length; i++) {
        const prev = new Date(uniqueDatesProfile[i - 1]);
        const curr = new Date(uniqueDatesProfile[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }

    res.json({
      data: {
        ...profile,
        rankTitle: getRankTitle(profile!.level),
        streakData,
        currentStreak,
        longestStreak,
        avgRating: Math.round(avgRating * 10) / 10,
        methodCounts,
        earlyBirdCount,
        nightOwlCount,
        weekendCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ── Fase 1: Identity — Profile customization ──

// PUT /barista/me/profile — update bio, banner, title, flavor profile
router.put('/me/profile', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { bio, bannerUrl, activeTitleId, flavorProfile } = req.body;

    const data: Prisma.BaristaProfileUpdateInput = {};
    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 280) {
        return res.status(400).json({ error: 'Bio no puede superar 280 caracteres' });
      }
      data.bio = bio.trim() || null;
    }
    if (bannerUrl !== undefined) data.bannerUrl = bannerUrl || null;
    if (activeTitleId !== undefined) data.activeTitleId = activeTitleId || null;
    if (flavorProfile !== undefined) data.flavorProfile = flavorProfile;

    const profile = await prisma.baristaProfile.upsert({
      where: { userId },
      create: { userId, ...data } as Prisma.BaristaProfileUncheckedCreateInput,
      update: data as Prisma.BaristaProfileUncheckedUpdateInput,
    });

    res.json({ data: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// GET /barista/me/equipment — list user equipment
router.get('/me/equipment', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const equipment = await prisma.baristaEquipment.findMany({
      where: { userId },
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ data: equipment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener equipo' });
  }
});

// POST /barista/me/equipment — create equipment
router.post('/me/equipment', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, brand, category, photoUrl, isFavorite } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Nombre y categoría requeridos' });
    }
    const validCategories = ['GRINDER', 'KETTLE', 'DRIPPER', 'SCALE', 'OTHER'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Categoría no válida' });
    }

    const equipment = await prisma.baristaEquipment.create({
      data: { userId, name, brand, category, photoUrl, isFavorite: isFavorite ?? false },
    });
    res.status(201).json({ data: equipment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear equipo' });
  }
});

// PUT /barista/me/equipment/:id — update equipment
router.put('/me/equipment/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, brand, category, photoUrl, isFavorite } = req.body;

    const existing = await prisma.baristaEquipment.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const data: Prisma.BaristaEquipmentUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (brand !== undefined) data.brand = brand;
    if (category !== undefined) {
      const validCategories = ['GRINDER', 'KETTLE', 'DRIPPER', 'SCALE', 'OTHER'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Categoría no válida' });
      }
      data.category = category;
    }
    if (photoUrl !== undefined) data.photoUrl = photoUrl;
    if (isFavorite !== undefined) data.isFavorite = isFavorite;

    const equipment = await prisma.baristaEquipment.update({ where: { id }, data });
    res.json({ data: equipment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar equipo' });
  }
});

// DELETE /barista/me/equipment/:id — delete equipment
router.delete('/me/equipment/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.baristaEquipment.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    await prisma.baristaEquipment.delete({ where: { id } });
    res.json({ data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar equipo' });
  }
});

// GET /barista/titles — list all titles with unlock status
router.get('/titles', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const titles = await prisma.baristaTitle.findMany({ orderBy: { name: 'asc' } });

    // Get user's unlocked achievements to check requirements
    const profile = await prisma.baristaProfile.findUnique({
      where: { userId },
      include: {
        achievements: {
          include: { achievement: true },
        },
      },
    });

    const unlockedSlugs = new Set(profile?.achievements.map((a) => a.achievement.slug) ?? []);

    const result = titles.map((t) => ({
      ...t,
      isUnlocked: unlockedSlugs.has(t.requirement),
      isActive: profile?.activeTitleId === t.id,
    }));

    res.json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener títulos' });
  }
});

// GET /barista/rewards — list active rewards with user claim status
router.get('/rewards', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { xpCost: 'asc' },
    });

    const userClaims = await prisma.rewardClaim.findMany({
      where: { userId },
      select: { rewardId: true },
    });

    const claimedIds = new Set(userClaims.map((c) => c.rewardId));

    const data = rewards.map((r) => ({
      ...r,
      isClaimed: claimedIds.has(r.id),
    }));

    res.json({ data });
  } catch (err) {
    console.error('[barista/rewards] Error:', err);
    res.status(500).json({ error: 'Error al obtener recompensas' });
  }
});

// POST /barista/rewards/:id/claim — claim a reward
router.post('/rewards/:id/claim', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward) {
      return res.status(404).json({ error: 'Recompensa no encontrada' });
    }
    if (!reward.isActive) {
      return res.status(400).json({ error: 'Recompensa no disponible' });
    }
    if (reward.stock !== null && reward.stock <= 0) {
      return res.status(400).json({ error: 'Recompensa agotada' });
    }

    const profile = await prisma.baristaProfile.findUnique({ where: { userId } });
    if (!profile) {
      return res.status(400).json({ error: 'Perfil de barista no encontrado' });
    }
    if (profile.totalXp < reward.xpCost) {
      return res.status(400).json({ error: 'XP insuficiente para canjear esta recompensa' });
    }

    const existingClaim = await prisma.rewardClaim.findUnique({
      where: { rewardId_userId: { rewardId: id, userId } },
    });
    if (existingClaim) {
      return res.status(409).json({ error: 'Ya has canjeado esta recompensa' });
    }

    const code = `promo-${reward.id.slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`;

    let updatedProfile = await prisma.baristaProfile.update({
      where: { userId },
      data: { totalXp: { decrement: reward.xpCost } },
    });

    const correctLevel = Math.floor(updatedProfile.totalXp / 100) + 1;
    if (updatedProfile.level !== correctLevel) {
      updatedProfile = await prisma.baristaProfile.update({
        where: { userId },
        data: { level: correctLevel },
      });
    }

    // Decrement stock atomically if limited (prevents negative stock from race conditions)
    if (reward.stock !== null && reward.stock > 0) {
      const updated = await prisma.reward.updateMany({
        where: { id, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (updated.count === 0) {
        return res.status(400).json({ error: 'Recompensa agotada' });
      }
    }

    // Create PromoCode for the reward (usable in checkout)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const promoCode = await prisma.promoCode.upsert({
      where: { code },
      create: {
        code,
        discount: reward.discountPct,
        type: 'PERCENT',
        maxUses: reward.maxUses ?? 1,
        expiresAt,
        isActive: true,
      },
      update: {},
    });

    const claim = await prisma.rewardClaim.create({
      data: { rewardId: id, userId, code },
    });

    res.status(201).json({ data: { claim, profile: updatedProfile } });
  } catch (err) {
    console.error('[barista/rewards/claim] Error:', err);
    res.status(500).json({ error: 'Error al canjear recompensa' });
  }
});

// GET /barista/rewards/claims — list user's claims with reward details
router.get('/rewards/claims', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const claims = await prisma.rewardClaim.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: claims });
  } catch (err) {
    console.error('[barista/rewards/claims] Error:', err);
    res.status(500).json({ error: 'Error al obtener canjes' });
  }
});

// ── F2 — Social: Follow/Unfollow ──

// POST /barista/follow/:userId — follow a user
router.post('/follow/:userId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.userId;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Ya sigues a este usuario' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await prisma.follow.create({ data: { followerId, followingId } });

    // Send follow notification (non-blocking)
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true },
    });
    if (follower) {
      notifyFollow(followingId, followerId, follower.name).catch((err) =>
        console.error('[notifyFollow]', err),
      );
    }

    res.status(201).json({ data: { followerId, followingId } });
  } catch (err) {
    console.error('[barista/follow] Error:', err);
    res.status(500).json({ error: 'Error al seguir usuario' });
  }
});

// DELETE /barista/follow/:userId — unfollow a user
router.delete('/follow/:userId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.userId;

    await prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    res.json({ data: { followerId, followingId } });
  } catch (err) {
    console.error('[barista/follow] Error:', err);
    res.status(500).json({ error: 'Error al dejar de seguir usuario' });
  }
});

// GET /barista/followers/:userId — list followers
router.get('/followers/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        include: { follower: { select: { id: true, name: true, avatarUrl: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    res.json({
      data: followers.map((f) => ({
        userId: f.follower.id,
        name: f.follower.name,
        avatarUrl: f.follower.avatarUrl,
        followedAt: f.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[barista/followers] Error:', err);
    res.status(500).json({ error: 'Error al obtener seguidores' });
  }
});

// GET /barista/following/:userId — list who user follows
router.get('/following/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        include: { following: { select: { id: true, name: true, avatarUrl: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);

    res.json({
      data: following.map((f) => ({
        userId: f.following.id,
        name: f.following.name,
        avatarUrl: f.following.avatarUrl,
        followedAt: f.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[barista/following] Error:', err);
    res.status(500).json({ error: 'Error al obtener seguidos' });
  }
});

// GET /barista/follow/status?ids=id1,id2,id3 — batch check follow status
router.get('/follow/status', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const followerId = req.user!.id;
    const idsParam = req.query.ids as string;
    if (!idsParam) return res.json({ data: {} });

    const targetIds = idsParam.split(',').filter(Boolean);

    const follows = await prisma.follow.findMany({
      where: { followerId, followingId: { in: targetIds } },
      select: { followingId: true },
    });

    const statusMap: Record<string, boolean> = {};
    targetIds.forEach((id) => {
      statusMap[id] = follows.some((f) => f.followingId === id);
    });

    res.json({ data: statusMap });
  } catch (err) {
    console.error('[barista/follow/status] Error:', err);
    res.status(500).json({ error: 'Error al obtener estado de seguimiento' });
  }
});

// ── F2 — Social: Feed (cursor pagination) ──

// GET /barista/feed — brew logs from followed users
router.get('/feed', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    // Get IDs of followed users
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return res.json({ data: [], meta: { nextCursor: null, hasMore: false } });
    }

    const where: { userId: { in: string[] }; createdAt?: { lt: Date } } = {
      userId: { in: followingIds },
    };
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const brews = await prisma.brewLog.findMany({
      where,
      include: {
        recipe: { select: { title: true, method: true } },
        bean: { select: { name: true, slug: true } },
        likes: { select: { id: true, userId: true } },
        baristaProfile: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // fetch one extra to detect hasMore
    });

    const hasMore = brews.length > limit;
    const feedItems = brews.slice(0, limit);

    res.json({
      data: feedItems.map((b) => ({
        id: b.id,
        userId: b.userId,
        authorName: b.baristaProfile?.user?.name || 'Unknown',
        authorAvatar: b.baristaProfile?.user?.avatarUrl || null,
        recipeName: b.recipe?.title || null,
        method: b.recipe?.method || null,
        beanName: b.bean?.name || null,
        beanSlug: b.bean?.slug || null,
        rating: b.rating,
        notes: b.notes,
        photoUrl: b.photoUrl,
        tags: b.tags,
        xpEarned: b.xpEarned,
        likeCount: b.likes.length,
        isLiked: b.likes.some((l) => l.userId === userId),
        createdAt: b.createdAt,
      })),
      meta: {
        nextCursor: hasMore ? feedItems[feedItems.length - 1]?.createdAt.toISOString() : null,
        hasMore,
      },
    });
  } catch (err) {
    console.error('[barista/feed] Error:', err);
    res.status(500).json({ error: 'Error al obtener feed' });
  }
});

// ── F2 — Social: Brew Likes ──

// POST /barista/brews/:brewId/like — like a brew log
router.post('/brews/:brewId/like', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const brewId = req.params.brewId;

    const brew = await prisma.brewLog.findUnique({ where: { id: brewId } });
    if (!brew) {
      return res.status(404).json({ error: 'Brew log no encontrado' });
    }

    const existing = await prisma.brewLogLike.findUnique({
      where: { userId_brewLogId: { userId, brewLogId: brewId } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Ya te gusta este brew' });
    }

    const like = await prisma.brewLogLike.create({ data: { userId, brewLogId: brewId } });

    // Send like notification (non-blocking)
    const liker = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (liker && brew.userId !== userId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: brew.recipeId },
        select: { title: true },
      });
      notifyLikeBrew(brew.userId, userId, liker.name, brewId, recipe?.title || 'tu brew').catch(
        (err) => console.error('[notifyLikeBrew]', err),
      );
    }

    res.status(201).json({ data: like });
  } catch (err) {
    console.error('[barista/brews/like] Error:', err);
    res.status(500).json({ error: 'Error al dar like' });
  }
});

// DELETE /barista/brews/:brewId/like — unlike a brew log
router.delete(
  '/brews/:brewId/like',
  requireUserAuth,
  async (req: UserAuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const brewId = req.params.brewId;

      await prisma.brewLogLike.delete({
        where: { userId_brewLogId: { userId, brewLogId: brewId } },
      });

      res.json({ data: { userId, brewLogId: brewId } });
    } catch (err) {
      console.error('[barista/brews/like] Error:', err);
      res.status(500).json({ error: 'Error al quitar like' });
    }
  },
);

export default router;
