import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

// Helper: check premium access from auth header
async function hasRecipeAccess(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET!) as { id: string; role: string };
    if (payload.role === 'ADMIN') return true;
    const sub = await prisma.subscription.findFirst({ where: { userId: payload.id, status: 'ACTIVE' } });
    return !!sub;
  } catch {
    return false;
  }
}

// Helper: strip premium step details for locked recipes
function lockRecipe(recipe: any) {
  return {
    ...recipe,
    steps: recipe.steps.slice(0, 1).map((s: any) => ({
      ...s,
      description: s.description.substring(0, 80) + '…',
      imageUrl: null,
      videoUrl: null,
    })),
    locked: true,
  };
}

// ── Public / User routes ─────────────────────────────────────────────────

// GET / — list published recipes; premium ones gated behind subscription
router.get('/', async (req: Request, res: Response) => {
  try {
    const { method, productId, premium } = req.query;
    const where: any = { isPublished: true };
    if (method) where.method = method;
    if (productId) where.productId = productId as string;
    if (premium === 'true') where.isPremium = true;
    if (premium === 'false') where.isPremium = false;

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
      orderBy: [{ isPremium: 'asc' }, { method: 'asc' }, { title: 'asc' }],
    });

    res.json({ data: recipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// GET /admin/all — all recipes regardless of published status (MUST be before /:id)
router.get('/admin/all', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true } },
        _count: { select: { steps: true } },
      },
      orderBy: [{ method: 'asc' }, { title: 'asc' }],
    });
    res.json({ data: recipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// GET /by-slug/:slug (MUST be before /:id)
router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug: req.params.slug },
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
    });
    if (!recipe || !recipe.isPublished) return res.status(404).json({ error: 'Receta no encontrada' });

    if (recipe.isPremium && !(await hasRecipeAccess(req.headers.authorization))) {
      return res.json({ data: lockRecipe(recipe) });
    }
    res.json({ data: { ...recipe, locked: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
});

// GET /:id — single recipe; full steps only if user has access
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
    });
    if (!recipe || !recipe.isPublished) return res.status(404).json({ error: 'Receta no encontrada' });

    if (recipe.isPremium && !(await hasRecipeAccess(req.headers.authorization))) {
      return res.json({ data: lockRecipe(recipe) });
    }
    res.json({ data: { ...recipe, locked: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────

// POST /admin — create recipe
router.post('/admin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, slug, description, method, difficulty = 'MEDIA',
      prepTime, yield: yieldAmount, temp, grind, ratio,
      isPremium = false, isPublished = false, productId,
    } = req.body;

    if (!title?.trim() || !slug?.trim() || !method?.trim()) {
      return res.status(400).json({ error: 'title, slug y method son requeridos' });
    }

    const recipe = await prisma.recipe.create({
      data: {
        title: title.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description?.trim() ?? null,
        method: method.trim(),
        difficulty,
        prepTime: prepTime ? parseInt(prepTime) : null,
        yield: yieldAmount?.trim() ?? null,
        temp: temp?.trim() ?? null,
        grind: grind?.trim() ?? null,
        ratio: ratio?.trim() ?? null,
        isPremium,
        isPublished,
        productId: productId || null,
      },
      include: { steps: true, product: { select: { id: true, name: true, slug: true } } },
    });

    res.status(201).json({ data: recipe });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe una receta con ese slug' });
    res.status(500).json({ error: 'Error al crear receta' });
  }
});

// PUT /admin/:id — update recipe metadata
router.put('/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, slug, description, method, difficulty,
      prepTime, yield: yieldAmount, temp, grind, ratio,
      isPremium, isPublished, productId,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (slug !== undefined) data.slug = slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (method !== undefined) data.method = method.trim();
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (prepTime !== undefined) data.prepTime = prepTime ? parseInt(prepTime) : null;
    if (yieldAmount !== undefined) data.yield = yieldAmount?.trim() ?? null;
    if (temp !== undefined) data.temp = temp?.trim() ?? null;
    if (grind !== undefined) data.grind = grind?.trim() ?? null;
    if (ratio !== undefined) data.ratio = ratio?.trim() ?? null;
    if (isPremium !== undefined) data.isPremium = isPremium;
    if (isPublished !== undefined) data.isPublished = isPublished;
    if (productId !== undefined) data.productId = productId || null;

    const recipe = await prisma.recipe.update({
      where: { id: req.params.id },
      data,
      include: { steps: { orderBy: { order: 'asc' } }, product: { select: { id: true, name: true, slug: true } } },
    });

    res.json({ data: recipe });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug ya existe' });
    res.status(500).json({ error: 'Error al actualizar receta' });
  }
});

// DELETE /admin/:id
router.delete('/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.recipe.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar receta' });
  }
});

// POST /admin/:id/steps — add a step
router.post('/admin/:id/steps', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'title y description son requeridos' });
    }

    const last = await prisma.recipeStep.findFirst({
      where: { recipeId: req.params.id },
      orderBy: { order: 'desc' },
    });
    const order = (last?.order ?? 0) + 1;

    const step = await prisma.recipeStep.create({
      data: {
        recipeId: req.params.id,
        order,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl?.trim() ?? null,
        videoUrl: videoUrl?.trim() ?? null,
        duration: duration ? parseInt(duration) : null,
      },
    });

    res.status(201).json({ data: step });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar paso' });
  }
});

// PUT /admin/:id/steps/reorder — reorder all steps (MUST be before /steps/:stepId)
router.put('/admin/:id/steps/reorder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { stepIds } = req.body as { stepIds: string[] };
    if (!Array.isArray(stepIds)) return res.status(400).json({ error: 'stepIds debe ser un arreglo' });

    // Two-phase update to avoid unique constraint collision on (recipeId, order)
    await prisma.$transaction(
      stepIds.map((id, i) => prisma.recipeStep.update({ where: { id }, data: { order: 1000 + i } }))
    );
    await prisma.$transaction(
      stepIds.map((id, i) => prisma.recipeStep.update({ where: { id }, data: { order: i + 1 } }))
    );

    const steps = await prisma.recipeStep.findMany({
      where: { recipeId: req.params.id },
      orderBy: { order: 'asc' },
    });
    res.json({ data: steps });
  } catch {
    res.status(500).json({ error: 'Error al reordenar pasos' });
  }
});

// PUT /admin/:id/steps/:stepId — update a step
router.put('/admin/:id/steps/:stepId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration, order } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() ?? null;
    if (videoUrl !== undefined) data.videoUrl = videoUrl?.trim() ?? null;
    if (duration !== undefined) data.duration = duration ? parseInt(duration) : null;
    if (order !== undefined) data.order = parseInt(order);

    const step = await prisma.recipeStep.update({ where: { id: req.params.stepId }, data });
    res.json({ data: step });
  } catch {
    res.status(500).json({ error: 'Error al actualizar paso' });
  }
});

// DELETE /admin/:id/steps/:stepId — delete a step and re-number
router.delete('/admin/:id/steps/:stepId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.recipeStep.delete({ where: { id: req.params.stepId } });

    const remaining = await prisma.recipeStep.findMany({
      where: { recipeId: req.params.id },
      orderBy: { order: 'asc' },
    });
    await prisma.$transaction(
      remaining.map((s, i) => prisma.recipeStep.update({ where: { id: s.id }, data: { order: i + 1 } }))
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar paso' });
  }
});

export default router;
