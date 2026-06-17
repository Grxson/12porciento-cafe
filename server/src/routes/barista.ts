import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
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
  const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
  return (baseXp[recipeDifficulty] ?? 20) + (rating - 1) * 5;
}

async function checkAndUnlockAchievements(userId: string): Promise<{ id: string; name: string; icon: string; xpReward: number }[]> {
  const today = new Date().toISOString().split('T')[0];

  const [profile, brewCount, hasPerfect, v60Count, aeropressCount, espressoCount, recentBrews] = await Promise.all([
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
  ]);
  if (!profile) return [];

  // Compute streak
  const uniqueDates = Array.from(
    new Set(recentBrews.map((b: { createdAt: Date }) => b.createdAt.toISOString().split('T')[0]))
  ).sort().reverse();

  let streak = 0;
  if (uniqueDates.length > 0) {
    const first = uniqueDates[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (first === today || first === yesterday) {
      for (let i = 0; i < uniqueDates.length; i++) {
        const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        if (uniqueDates[i] === expected) streak++;
        else break;
      }
    }
  }

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
    const leaderboard = await prisma.baristaProfile.findMany({
      orderBy: [{ totalXp: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    });
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
        ...(rating === 10 ? { favoriteMethod: recipe.method } : {}),
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

    if (!profile) {
      // Users exist before they brew; return an empty profile instead of 404
      // so the UI can render level 1 / 0 XP without a console error.
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;
    }

    res.json({ data: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

export default router;
