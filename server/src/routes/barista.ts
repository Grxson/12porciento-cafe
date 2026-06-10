import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
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
  const [profile, brewCount, hasPerfect] = await Promise.all([
    prisma.baristaProfile.findUnique({
      where: { userId },
      include: { achievements: { include: { achievement: true } } },
    }),
    prisma.brewLog.count({ where: { userId } }),
    prisma.brewLog.findFirst({ where: { userId, rating: 5 }, select: { id: true } }),
  ]);
  if (!profile) return [];

  const candidates = [
    { slug: 'first_brew', met: brewCount >= 1 },
    { slug: 'five_brews', met: brewCount >= 5 },
    { slug: 'ten_brews', met: brewCount >= 10 },
    { slug: 'perfect_brew', met: hasPerfect !== null },
  ];

  const unlocked: { id: string; name: string; icon: string; xpReward: number }[] = [];

  let bonusXp = 0;

  for (const c of candidates) {
    if (!c.met) continue;
    const alreadyUnlocked = profile.achievements.some((a) => a.achievement.slug === c.slug);
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
    const { recipeId, rating, notes, photoUrl } = req.body;
    const userId = req.user!.id;

    if (!recipeId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'recipeId y rating (1-5 entero) requeridos' });
    }
    if (notes && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ error: 'Las notas no pueden superar 500 caracteres' });
    }
    if (photoUrl && (typeof photoUrl !== 'string' || !/^\/api\/uploads\/[a-f0-9]{24}\.webp$/.test(photoUrl))) {
      return res.status(400).json({ error: 'URL de foto no válida' });
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
      },
      include: { recipe: { select: { id: true, title: true, method: true, difficulty: true } } },
    });

    let updatedProfile = await prisma.baristaProfile.update({
      where: { userId },
      data: {
        totalXp: { increment: xpEarned },
        totalBrews: { increment: 1 },
        ...(rating === 5 ? { favoriteMethod: recipe.method } : {}),
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

// GET /barista/:userId/profile
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.baristaProfile.findUnique({
      where: { userId: req.params.userId },
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

    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json({ data: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

export default router;
