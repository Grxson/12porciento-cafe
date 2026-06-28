import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

const brewLogLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiados registros. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function calculateXp(recipeDifficulty: string, rating: number): number {
  const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 25, 'DIFÍCIL': 50 };
  return (baseXp[recipeDifficulty] ?? 25) + (rating - 1) * 5;
}

async function checkAndUnlockAchievements(userId: string): Promise<{ id: string; name: string; icon: string; xpReward: number }[]> {
  const today = new Date().toISOString().split('T')[0];

  const [profile, brewCount, hasPerfect, v60Count, aeropressCount, espressoCount, recentBrews, allBrews] = await Promise.all([
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
    new Set(recentBrews.map((b: { createdAt: Date }) => b.createdAt.toISOString().split('T')[0]))
  ).sort().reverse();

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
  const streakActive = uniqueDates.length > 0 && (uniqueDates[0] === today || uniqueDates[0] === yesterday);

  // G10 achievements: Compute conditions for new achievements
  // Coffee Connoisseur: 50 brews
  const coffeeConnoisseurMet = brewCount >= 50;

  // Perfect Streak 30: 30 consecutive days
  let longestStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    if (uniqueDates[i] === expected) currentStreak++;
    else { longestStreak = Math.max(longestStreak, currentStreak); currentStreak = 0; break; }
  }
  longestStreak = Math.max(longestStreak, currentStreak);
  const perfectStreak30Met = longestStreak >= 30;

  // Method Collector: 5+ brews of 3 different methods
  const methodCounts = new Map<string, number>();
  allBrews.forEach((b: typeof allBrews[number]) => {
    const method = b.recipe.method || 'Unknown';
    methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
  });
  const methodCollectorMet = Array.from(methodCounts.values()).filter(c => c >= 5).length >= 3;

  // Master Taster: average rating >= 8
  const avgRating = allBrews.length ? allBrews.reduce((s: number, b: typeof allBrews[number]) => s + b.rating, 0) / allBrews.length : 0;
  const masterTasterMet = avgRating >= 8 && allBrews.length >= 1;

  // Early Bird: 5 brews before 8am
  const earlyBirdMet = allBrews.filter((b: typeof allBrews[number]) => {
    const hour = new Date(b.createdAt).getHours();
    return hour < 8;
  }).length >= 5;

  // Night Owl: 5 brews after 9pm
  const nightOwlMet = allBrews.filter((b: typeof allBrews[number]) => {
    const hour = new Date(b.createdAt).getHours();
    return hour >= 21;
  }).length >= 5;

  // Weekend Warrior: 10 brews on weekends (Sat/Sun)
  const weekendBrews = allBrews.filter((b: typeof allBrews[number]) => {
    const day = new Date(b.createdAt).getDay();
    return day === 0 || day === 6;
  }).length;
  const weekendWarriorMet = weekendBrews >= 10;

  const candidates = [
    { slug: 'first_brew',    met: brewCount >= 1 },
    { slug: 'five_brews',    met: brewCount >= 5 },
    { slug: 'ten_brews',     met: brewCount >= 10 },
    { slug: 'perfect_brew',  met: hasPerfect !== null },
    { slug: 'v60_5',         met: v60Count >= 5 },
    { slug: 'aeropress_5',   met: aeropressCount >= 5 },
    { slug: 'espresso_5',    met: espressoCount >= 5 },
    { slug: 'streak_3',      met: streak >= 3 },
    { slug: 'streak_7',      met: streak >= 7 },
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
    const alreadyUnlocked = profile.achievements.some((a: { achievement: { slug: string } }) => a.achievement.slug === c.slug);
    if (alreadyUnlocked) continue;
    const achievement = await prisma.achievement.findUnique({ where: { slug: c.slug } });
    if (!achievement) continue;
    await prisma.achievementUnlock.create({ data: { userId, achievementId: achievement.id } });
    bonusXp += achievement.xpReward;
    unlocked.push({ id: achievement.id, name: achievement.name, icon: achievement.icon, xpReward: achievement.xpReward });
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
    const period = (req.query.period as string || 'all-time').toLowerCase();

    // Calculate cutoff date based on period
    let dateFilter: any = undefined;
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
        brewLogs: dateFilter ? { where: { createdAt: dateFilter }, select: { xpEarned: true } } : false,
      },
    });

    // If period filter, recompute XP from brewLogs in that period and re-sort
    if (dateFilter) {
      leaderboard = leaderboard.map((entry: (typeof leaderboard)[number]) => ({
        ...entry,
        totalXp: entry.brewLogs ? entry.brewLogs.reduce((sum: number, log: { xpEarned: number }) => sum + log.xpEarned, 0) : 0,
      }));
      leaderboard.sort((a: (typeof leaderboard)[number], b: (typeof leaderboard)[number]) => b.totalXp - a.totalXp || (a.createdAt.getTime() - b.createdAt.getTime()));
    }

    res.json({ data: leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
});

// POST /barista/brew-logs
router.post('/brew-logs', brewLogLimiter, requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { recipeId, rating, notes, photoUrl, clientBrewId } = req.body;
    const userId = req.user!.id;

    if (!recipeId || !Number.isInteger(rating) || rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'recipeId y rating (1-10 entero) requeridos' });
    }
    if (notes && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ error: 'Las notas no pueden superar 500 caracteres' });
    }
    if (photoUrl && (typeof photoUrl !== 'string' || !/^\/api\/uploads\/[a-f0-9]{24}\.webp$/.test(photoUrl))) {
      return res.status(400).json({ error: 'URL de foto no válida' });
    }

    if (clientBrewId) {
      const existing = await prisma.brewLog.findUnique({ where: { clientBrewId } });
      if (existing) {
        return res.status(409).json({ data: { brewLog: existing, profile: null, newAchievements: [] } });
      }
    }

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Receta no encontrada' });

    let profile = await prisma.baristaProfile.upsert({
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

    const finalProfile = newAchievements.length > 0
      ? await prisma.baristaProfile.findUnique({ where: { userId } })
      : updatedProfile;

    res.status(201).json({ data: { brewLog, profile: finalProfile, newAchievements } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar brew' });
  }
});

// GET /barista/achievements — MUST be before /:userId/profile
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    let userId: string | null = null;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
        if (payload.role === 'USER') userId = payload.id;
      } catch {}
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
      unlocks.forEach((u: { achievementId: string; unlockedAt: Date }) => unlockMap.set(u.achievementId, u.unlockedAt.toISOString()));
    }

    const result = achievements.map((a: { id: string; slug: string; name: string; description: string; icon: string; rarity: string; xpReward: number }) => ({
      ...a,
      unlockedAt: unlockMap.get(a.id) ?? null,
    }));

    res.json({ achievements: result });
  } catch {
    res.status(500).json({ error: 'Error al obtener logros' });
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

// GET /barista/:userId/stats — G8 stats aggregation
router.get('/:userId/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const brews = await prisma.brewLog.findMany({
      where: { userId },
      include: { recipe: { select: { method: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (brews.length === 0) {
      return res.json({
        data: {
          favoriteMethod: null,
          favMethodEmoji: null,
          avgRating: 0,
          totalBrews: 0,
          brewsPerMethod: {},
          xpPerWeek: [],
        },
      });
    }

    // Favorite method (most brews)
    const methodCounts = new Map<string, number>();
    brews.forEach((b: typeof brews[number]) => {
      const method = b.recipe.method || 'Unknown';
      methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
    });
    const [favoriteMethod, count] = Array.from(methodCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    // Method emojis
    const methodEmojis: Record<string, string> = {
      'V60': '☕',
      'AeroPress': '🫖',
      'Espresso': '💪',
      'Moka': '⚡',
    };
    const favMethodEmoji = methodEmojis[favoriteMethod] || '☕';

    // Average rating
    const avgRating = brews.reduce((s: number, b: typeof brews[number]) => s + b.rating, 0) / brews.length;

    // XP per week (last 8 weeks)
    const weeklyXp = new Map<string, number>();
    brews.forEach((b: typeof brews[number]) => {
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

    res.json({
      data: {
        favoriteMethod,
        favMethodEmoji,
        avgRating: Math.round(avgRating * 10) / 10,
        totalBrews: brews.length,
        brewsPerMethod: Object.fromEntries(methodCounts),
        xpPerWeek,
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

    let profile = await prisma.baristaProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true } },
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
        brewLogs: {
          include: { recipe: { select: { id: true, title: true, method: true, difficulty: true } } },
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
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      });
      if (!user) return res.status(404).json({ error: 'Perfil no encontrado' });
      profile = {
        id: user.id,
        userId: user.id,
        user,
        level: 1,
        totalXp: 0,
        totalBrews: 0,
        favoriteMethod: null,
        achievements: [],
        brewLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as {
        id: string;
        userId: string;
        user: { id: string; name: string; };
        level: number;
        totalXp: number;
        totalBrews: number;
        favoriteMethod: null;
        achievements: never[];
        brewLogs: never[];
        createdAt: Date;
        updatedAt: Date;
      };
    }

    // Recompute current streak for profile response
    const ninetyDaysAgoBrews = rawBrews;
    const uniqueDatesProfile = Array.from(
      new Set(ninetyDaysAgoBrews.map((b: { createdAt: Date }) => b.createdAt.toISOString().split('T')[0]))
    ).sort().reverse();

    let currentStreak = 0;
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
    }

    res.json({
      data: {
        ...profile,
        rankTitle: getRankTitle(profile!.level),
        streakData,
        currentStreak,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Admin: Create achievement
router.post('/admin-achievements', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description, icon, rarity, xpReward } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Nombre y slug requeridos' });
    }
    const existing = await prisma.achievement.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un logro con ese slug' });
    }
    const achievement = await prisma.achievement.create({
      data: { name, slug, description: description || '', icon: icon || '🏆', rarity: rarity || 'COMMON', xpReward: xpReward || 20 },
    });
    res.json(achievement);
  } catch (err) {
    console.error('[admin/achievements] Error:', err);
    res.status(500).json({ error: 'Error al crear logro' });
  }
});

// Admin: Update achievement
router.put('/admin-achievements/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description, icon, rarity, xpReward } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (rarity !== undefined) data.rarity = rarity;
    if (xpReward !== undefined) data.xpReward = xpReward;
    const achievement = await prisma.achievement.update({
      where: { id: req.params.id },
      data,
    });
    res.json(achievement);
  } catch (err) {
    console.error('[admin/achievements] Error:', err);
    res.status(500).json({ error: 'Error al actualizar logro' });
  }
});

// Admin: Delete achievement
router.delete('/admin-achievements/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.achievement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin/achievements] Error:', err);
    res.status(500).json({ error: 'Error al eliminar logro' });
  }
});

export default router;
