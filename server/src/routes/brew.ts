/**
 * 12% Brew — public + user routes
 *
 * Mounted at /api/brew by the server entrypoint. Provides:
 *   GET    /methods              — list active brewing methods (public)
 *   GET    /methods/:slug        — single method (public)
 *   GET    /recipes              — list published recipes (public, filters)
 *   GET    /recipes/:slug        — recipe detail with method + steps (public)
 *   GET    /coffees/:slug/recipes — recipes linked to a coffee (public, QR-ready)
 *   POST   /recipes/:id/scale    — deterministic RecipeEngine scaling (public)
 *   POST   /recipes/:id/dial-in  — DialInEngine recommendation (public)
 *
 *   POST   /sessions             — start a brew session, snapshot recipe
 *   GET    /sessions             — list MY sessions with filters
 *   GET    /sessions/:id         — single session (owner or admin)
 *   PUT    /sessions/:id         — update in-progress params
 *   POST   /sessions/:id/complete — finalize with rating + result
 *   DELETE /sessions/:id         — delete (owner)
 *   POST   /sessions/:id/favorite — toggle favorite (owner)
 *   DELETE /sessions/:id/favorite — toggle favorite (owner)
 *
 *   GET    /equipment            — list MY equipment
 *   POST   /equipment            — add equipment
 *   PUT    /equipment/:id        — update MY equipment
 *   DELETE /equipment/:id        — delete MY equipment
 *
 *   GET    /water-profiles       — public official + my own
 *   POST   /water-profiles       — create my profile
 *   DELETE /water-profiles/:id   — delete my profile (or admin for official)
 */

import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getErrorCode } from '../lib/error-utils';
import { scaleRecipe, validateRecipeConsistency, type BrewRecipe } from '../lib/recipe-engine';
import { getDialInProvider, type BrewSessionResult } from '../lib/dial-in-engine';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────

function pagination(req: Request, defaultSize = 50, maxSize = 100) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(req.query.pageSize as string) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function paginatedResponse<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Convert a Recipe + steps to a BrewRecipe snapshot. */
function recipeToBrewRecipe(
  recipe: {
    coffeeDoseGrams: number | null;
    waterGrams: number | null;
    ratio: string | null;
    waterTemperatureCelsius: number | null;
    grindTargetMicrons: number | null;
    steps: Array<{
      order: number;
      title?: string | null;
      description?: string | null;
      type?: string | null;
      duration?: number | null;
      startTimeSeconds?: number | null;
      waterAmountGrams?: number | null;
      targetTotalWaterGrams?: number | null;
      action?: string | null;
      pourPattern?: string | null;
      flowRateGramsPerSecond?: number | null;
      temperatureCelsius?: number | null;
      instruction?: string | null;
      optional?: boolean;
    }>;
  },
): BrewRecipe | null {
  if (!recipe.coffeeDoseGrams || !recipe.waterGrams || !recipe.ratio) return null;
  // Legacy ratio is a string ("1:15" or "15"); coerce to a float for the engine.
  const ratioNum = (() => {
    const raw = String(recipe.ratio).trim();
    if (!raw) return null;
    if (raw.includes(':')) {
      const [, r] = raw.split(':');
      const n = parseFloat(r);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  if (!ratioNum) return null;
  return {
    coffeeDoseGrams: recipe.coffeeDoseGrams,
    waterGrams: recipe.waterGrams,
    ratio: ratioNum,
    waterTemperatureCelsius: recipe.waterTemperatureCelsius ?? null,
    grindTargetMicrons: recipe.grindTargetMicrons ?? null,
    steps: (recipe.steps ?? []).map((s) => ({
      order: s.order,
      title: s.title ?? undefined,
      description: s.description ?? undefined,
      type: (s.type as BrewRecipe['steps'][number]['type']) ?? 'CUSTOM',
      duration: s.duration ?? null,
      startTimeSeconds: s.startTimeSeconds ?? null,
      waterAmountGrams: s.waterAmountGrams ?? null,
      targetTotalWaterGrams: s.targetTotalWaterGrams ?? null,
      action: (s.action as BrewRecipe['steps'][number]['action']) ?? null,
      pourPattern: (s.pourPattern as BrewRecipe['steps'][number]['pourPattern']) ?? null,
      flowRateGramsPerSecond: s.flowRateGramsPerSecond ?? null,
      temperatureCelsius: s.temperatureCelsius ?? null,
      instruction: s.instruction ?? null,
      optional: s.optional ?? false,
    })),
  };
}

// ════════════════════════════════════════════════════════════════════════
// Public: METHODS
// ════════════════════════════════════════════════════════════════════════

// GET /methods
router.get('/methods', async (_req: Request, res: Response) => {
  try {
    const data = await prisma.brewMethod.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener métodos' });
  }
});

// GET /methods/:slug
router.get('/methods/:slug', async (req: Request, res: Response) => {
  try {
    const method = await prisma.brewMethod.findUnique({
      where: { slug: req.params.slug },
      include: { _count: { select: { recipes: true } } },
    });
    if (!method || !method.active) return res.status(404).json({ error: 'Método no encontrado' });
    res.json({ data: method });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener método' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// Public: RECIPES (catalog for 12% Brew)
// ════════════════════════════════════════════════════════════════════════

// GET /recipes — paginated catalog with filters
router.get('/recipes', async (req: Request, res: Response) => {
  try {
    const { method, profile, difficulty, coffeeId, recipeType, featured, search } = req.query;
    const where: Prisma.RecipeWhereInput = { isPublished: true };
    if (method) where.method = method as string;
    if (profile) where.profile = profile as Prisma.EnumBrewRecipeProfileFilter;
    if (difficulty) where.difficulty = difficulty as string;
    if (recipeType) where.recipeType = recipeType as Prisma.EnumBrewRecipeTypeFilter;
    if (featured === 'true') where.featured = true;
    if (coffeeId) where.productId = coffeeId as string;
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { method: { contains: search, mode: 'insensitive' } },
      ];
    }

    const { page, pageSize, skip } = pagination(req);
    const [data, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          brewMethod: { select: { id: true, slug: true, name: true, icon: true, category: true } },
          product: { select: { id: true, slug: true, name: true, imageUrl: true } },
          _count: { select: { steps: true, brewSessions: true } },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.recipe.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, pageSize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// GET /recipes/:slug — detail
router.get('/recipes/:slug', async (req: Request, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug: req.params.slug },
      include: {
        brewMethod: true,
        product: { select: { id: true, slug: true, name: true, imageUrl: true } },
        steps: { orderBy: { order: 'asc' } },
        ingredients: { orderBy: { order: 'asc' } },
        equipment: { orderBy: { order: 'asc' } },
        parentRecipe: { select: { id: true, slug: true, title: true } },
        variants: { select: { id: true, slug: true, title: true } },
      },
    });
    if (!recipe || !recipe.isPublished) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    res.json({ data: recipe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
});

// GET /coffees/:slug/recipes — QR-ready
router.get('/coffees/:slug/recipes', async (req: Request, res: Response) => {
  try {
    const coffee = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, name: true, slug: true, imageUrl: true, category: true },
    });
    if (!coffee) return res.status(404).json({ error: 'Café no encontrado' });

    const recipes = await prisma.recipe.findMany({
      where: { productId: coffee.id, isPublished: true },
      include: {
        brewMethod: { select: { id: true, slug: true, name: true, icon: true, category: true } },
      },
      orderBy: [{ featured: 'desc' }, { title: 'asc' }],
    });

    res.json({ coffee, data: recipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener recetas del café' });
  }
});

// POST /recipes/:id/scale — public engine endpoint
router.post('/recipes/:id/scale', async (req: Request, res: Response) => {
  try {
    const coffeeDoseGrams = Number(req.body?.coffeeDoseGrams);
    if (!Number.isFinite(coffeeDoseGrams) || coffeeDoseGrams <= 0) {
      return res.status(400).json({ error: 'coffeeDoseGrams debe ser > 0' });
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    if (!recipe) return res.status(404).json({ error: 'Receta no encontrada' });

    const brewRecipe = recipeToBrewRecipe(recipe);
    if (!brewRecipe) {
      return res.status(400).json({
        error: 'La receta no tiene parámetros estructurados (coffeeDoseGrams/waterGrams/ratio).',
      });
    }

    const errors = validateRecipeConsistency(brewRecipe);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Receta inconsistente', details: errors });
    }

    const scaled = scaleRecipe(brewRecipe, coffeeDoseGrams);
    res.json({ data: scaled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al escalar receta' });
  }
});

// POST /recipes/:id/dial-in — public dial-in endpoint
router.post('/recipes/:id/dial-in', async (req: Request, res: Response) => {
  try {
    const { result, current } = req.body ?? {};
    const allowed: BrewSessionResult[] = [
      'SOUR',
      'BITTER',
      'WATERY',
      'STRONG',
      'ASTRINGENT',
      'UNDEREXTRACTED',
      'OVEREXTRACTED',
      'BALANCED',
      'GOOD',
      'EXCELLENT',
    ];
    if (!allowed.includes(result)) {
      return res.status(400).json({ error: 'result inválido', allowed });
    }

    // Optional: validate recipe exists (gives better 404 than silent engine call)
    if (req.params.id !== 'ad-hoc') {
      const exists = await prisma.recipe.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!exists) return res.status(404).json({ error: 'Receta no encontrada' });
    }

    const provider = getDialInProvider();
    const recommendation = provider.recommend({
      result: result as BrewSessionResult,
      current: current ?? {},
    });

    res.json({ data: recommendation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar recomendación' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// User: BREW SESSIONS
// ════════════════════════════════════════════════════════════════════════

// POST /sessions — start a session (snapshots recipe at start)
router.post('/sessions', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      coffeeId,
      recipeId,
      brewMethodId,
      coffeeDoseGrams,
      waterGrams,
      ratio,
      temperatureCelsius,
      grindSetting,
      grindMicrons,
      equipmentSnapshot,
    } = req.body ?? {};

    let snapshot: Prisma.InputJsonValue | null = null;
    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
      if (!recipe) return res.status(404).json({ error: 'Receta no encontrada' });
      snapshot = recipeToBrewRecipe(recipe) as unknown as Prisma.InputJsonValue;
    }

    const session = await prisma.brewSession.create({
      data: {
        userId,
        coffeeId: coffeeId ?? null,
        recipeId: recipeId ?? null,
        brewMethodId: brewMethodId ?? null,
        recipeSnapshot: snapshot ?? Prisma.JsonNull,
        coffeeDoseGrams: Number.isFinite(coffeeDoseGrams) ? Number(coffeeDoseGrams) : null,
        waterGrams: Number.isFinite(waterGrams) ? Number(waterGrams) : null,
        ratio: Number.isFinite(ratio) ? Number(ratio) : null,
        temperatureCelsius: Number.isFinite(temperatureCelsius) ? Number(temperatureCelsius) : null,
        grindSetting: grindSetting ?? null,
        grindMicrons: Number.isFinite(grindMicrons) ? Number(grindMicrons) : null,
        equipmentSnapshot: equipmentSnapshot ?? Prisma.JsonNull,
        status: 'PREPARING',
        startedAt: new Date(),
      },
    });

    res.status(201).json({ data: session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /sessions — my sessions with filters
router.get('/sessions', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { coffeeId, recipeId, brewMethodId, status, minRating, from, to } = req.query;
    const where: Prisma.BrewSessionWhereInput = { userId };
    if (coffeeId) where.coffeeId = coffeeId as string;
    if (recipeId) where.recipeId = recipeId as string;
    if (brewMethodId) where.brewMethodId = brewMethodId as string;
    if (status) where.status = status as Prisma.EnumBrewSessionStatusFilter;
    if (minRating) where.rating = { gte: parseInt(minRating as string) };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from as string);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to as string);
    }

    const { page, pageSize, skip } = pagination(req, 25);
    const [data, total] = await Promise.all([
      prisma.brewSession.findMany({
        where,
        include: {
          coffee: { select: { id: true, slug: true, name: true, imageUrl: true } },
          recipe: { select: { id: true, slug: true, title: true } },
          brewMethod: { select: { id: true, slug: true, name: true, icon: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.brewSession.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, pageSize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
});

// GET /sessions/:id — single (owner or admin)
router.get('/sessions/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const where: Prisma.BrewSessionWhereInput = { id: req.params.id };
    if (role !== 'ADMIN') where.userId = userId;

    const session = await prisma.brewSession.findFirst({
      where,
      include: {
        coffee: { select: { id: true, slug: true, name: true, imageUrl: true } },
        recipe: { select: { id: true, slug: true, title: true } },
        brewMethod: { select: { id: true, slug: true, name: true, icon: true } },
        favorites: { where: { userId }, select: { id: true } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    res.json({ data: { ...session, favorited: session.favorites.length > 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

// PUT /sessions/:id — update params / status (owner only)
router.put('/sessions/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const owned = await prisma.brewSession.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
    if (!owned) return res.status(404).json({ error: 'Sesión no encontrada' });

    const {
      coffeeDoseGrams,
      waterGrams,
      ratio,
      temperatureCelsius,
      grindSetting,
      grindMicrons,
      brewTimeSeconds,
      status,
      notes,
    } = req.body ?? {};

    const data: Prisma.BrewSessionUpdateInput = {};
    if (coffeeDoseGrams !== undefined) data.coffeeDoseGrams = Number.isFinite(coffeeDoseGrams) ? Number(coffeeDoseGrams) : null;
    if (waterGrams !== undefined) data.waterGrams = Number.isFinite(waterGrams) ? Number(waterGrams) : null;
    if (ratio !== undefined) data.ratio = Number.isFinite(ratio) ? Number(ratio) : null;
    if (temperatureCelsius !== undefined) data.temperatureCelsius = Number.isFinite(temperatureCelsius) ? Number(temperatureCelsius) : null;
    if (grindSetting !== undefined) data.grindSetting = grindSetting ?? null;
    if (grindMicrons !== undefined) data.grindMicrons = Number.isFinite(grindMicrons) ? Number(grindMicrons) : null;
    if (brewTimeSeconds !== undefined) data.brewTimeSeconds = Number.isFinite(brewTimeSeconds) ? Math.max(0, Math.floor(Number(brewTimeSeconds))) : null;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes ?? null;

    const updated = await prisma.brewSession.update({ where: { id: req.params.id }, data });
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar sesión' });
  }
});

// POST /sessions/:id/complete — finalize with feedback
router.post('/sessions/:id/complete', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const owned = await prisma.brewSession.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
    if (!owned) return res.status(404).json({ error: 'Sesión no encontrada' });

    const {
      rating,
      notes,
      result,
      sweetnessRating,
      acidityRating,
      bodyRating,
      clarityRating,
      brewTimeSeconds,
    } = req.body ?? {};

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'rating debe estar entre 1 y 5' });
    }

    const allowedResults: BrewSessionResult[] = [
      'SOUR',
      'BITTER',
      'WATERY',
      'STRONG',
      'ASTRINGENT',
      'UNDEREXTRACTED',
      'OVEREXTRACTED',
      'BALANCED',
      'GOOD',
      'EXCELLENT',
    ];
    if (result !== undefined && result !== null && !allowedResults.includes(result)) {
      return res.status(400).json({ error: 'result inválido' });
    }

    const updated = await prisma.brewSession.update({
      where: { id: req.params.id },
      data: {
        rating: rating ?? null,
        notes: notes ?? null,
        result: result ?? null,
        sweetnessRating: sweetnessRating ?? null,
        acidityRating: acidityRating ?? null,
        bodyRating: bodyRating ?? null,
        clarityRating: clarityRating ?? null,
        brewTimeSeconds: Number.isFinite(brewTimeSeconds) ? Math.floor(Number(brewTimeSeconds)) : undefined,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al completar sesión' });
  }
});

// DELETE /sessions/:id (owner)
router.delete('/sessions/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const owned = await prisma.brewSession.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
    if (!owned) return res.status(404).json({ error: 'Sesión no encontrada' });
    await prisma.brewSession.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar sesión' });
  }
});

// POST /sessions/:id/favorite (toggle)
router.post('/sessions/:id/favorite', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const existing = await prisma.brewSessionFavorite.findUnique({
      where: { userId_sessionId: { userId, sessionId: req.params.id } },
    });
    if (existing) {
      await prisma.brewSessionFavorite.delete({ where: { id: existing.id } });
      return res.json({ data: { favorited: false } });
    }
    await prisma.brewSessionFavorite.create({ data: { userId, sessionId: req.params.id } });
    res.json({ data: { favorited: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al marcar favorita' });
  }
});

router.delete('/sessions/:id/favorite', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await prisma.brewSessionFavorite.deleteMany({ where: { userId, sessionId: req.params.id } });
    res.json({ data: { favorited: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al quitar favorita' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// User: EQUIPMENT (wraps BaristaEquipment with brew-aware fields)
// ════════════════════════════════════════════════════════════════════════

router.get('/equipment', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const data = await prisma.baristaEquipment.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener equipo' });
  }
});

router.post('/equipment', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { name, brand, category, photoUrl, isFavorite } = req.body ?? {};
    const allowedCategories = ['GRINDER', 'KETTLE', 'DRIPPER', 'SCALE', 'ESPRESSO_MACHINE', 'FILTER', 'OTHER'];
    if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });
    if (category && !allowedCategories.includes(category)) {
      return res.status(400).json({ error: `category inválida (${allowedCategories.join('|')})` });
    }
    const item = await prisma.baristaEquipment.create({
      data: {
        userId: req.user!.id,
        name: name.trim(),
        brand: brand?.trim() ?? null,
        category: category ?? 'OTHER',
        photoUrl: photoUrl?.trim() ?? null,
        isFavorite: Boolean(isFavorite),
      },
    });
    res.status(201).json({ data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear equipo' });
  }
});

router.put('/equipment/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const owned = await prisma.baristaEquipment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Equipo no encontrado' });

    const { name, brand, category, photoUrl, isFavorite } = req.body ?? {};
    const data: Prisma.BaristaEquipmentUpdateInput = {};
    if (name !== undefined) data.name = name.trim();
    if (brand !== undefined) data.brand = brand?.trim() ?? null;
    if (category !== undefined) data.category = category;
    if (photoUrl !== undefined) data.photoUrl = photoUrl?.trim() ?? null;
    if (isFavorite !== undefined) data.isFavorite = Boolean(isFavorite);

    const updated = await prisma.baristaEquipment.update({ where: { id: req.params.id }, data });
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar equipo' });
  }
});

router.delete('/equipment/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const owned = await prisma.baristaEquipment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: 'Equipo no encontrado' });
    await prisma.baristaEquipment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar equipo' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// Public + User: WATER PROFILES
// ════════════════════════════════════════════════════════════════════════

router.get('/water-profiles', async (req: Request, res: Response) => {
  try {
    // Public: official profiles. User: also own.
    const where: Prisma.WaterProfileWhereInput = { OR: [{ official: true }] };
    // If authenticated, also include own
    const auth = req.headers.authorization?.replace('Bearer ', '');
    if (auth) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const payload = jwt.verify(auth, process.env.JWT_SECRET!) as { id: string; role?: string };
        if (payload.role === 'USER') {
          where.OR = [{ official: true }, { userId: payload.id }];
        }
      } catch {
        // ignore — treat as public
      }
    }
    const data = await prisma.waterProfile.findMany({ where, orderBy: [{ official: 'desc' }, { name: 'asc' }] });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfiles de agua' });
  }
});

router.post('/water-profiles', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { name, tds, gh, kh, calcium, magnesium, sodium, description } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: 'name es requerido' });

    const created = await prisma.waterProfile.create({
      data: {
        userId: req.user!.id,
        name: name.trim(),
        tds: Number.isFinite(tds) ? Number(tds) : null,
        gh: Number.isFinite(gh) ? Number(gh) : null,
        kh: Number.isFinite(kh) ? Number(kh) : null,
        calcium: Number.isFinite(calcium) ? Number(calcium) : null,
        magnesium: Number.isFinite(magnesium) ? Number(magnesium) : null,
        sodium: Number.isFinite(sodium) ? Number(sodium) : null,
        description: description?.trim() ?? null,
        official: false,
      },
    });
    res.status(201).json({ data: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear perfil de agua' });
  }
});

router.delete('/water-profiles/:id', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const item = await prisma.waterProfile.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Perfil no encontrado' });

    const isOwner = item.userId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Sin permiso' });
    if (item.official && !isAdmin) return res.status(403).json({ error: 'No se puede eliminar un perfil oficial' });

    await prisma.waterProfile.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar perfil' });
  }
});

// Suppress unused-import warning for AuthRequest when only some endpoints use admin
void AuthRequest;

export default router;

// Re-export helper for admin router
export { pagination, paginatedResponse };
