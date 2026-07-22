import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../db';

const router = Router();

// GET /api/admin/rewards — list all rewards
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rewards = await prisma.reward.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: rewards });
  } catch (err) {
    console.error('Error al listar recompensas:', err);
    res.status(500).json({ error: 'Error al listar recompensas' });
  }
});

// POST /api/admin/rewards — create reward
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, icon, xpCost, discountPct, maxUses, stock } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (!xpCost || typeof xpCost !== 'number' || xpCost < 1) {
      return res.status(400).json({ error: 'xpCost debe ser un número >= 1' });
    }
    if (
      discountPct !== undefined &&
      (typeof discountPct !== 'number' || discountPct < 1 || discountPct > 100)
    ) {
      return res.status(400).json({ error: 'discountPct debe estar entre 1 y 100' });
    }

    const reward = await prisma.reward.create({
      data: {
        name: name.trim(),
        description: description?.trim() ?? '',
        icon: icon?.trim() || '🎁',
        xpCost,
        discountPct: discountPct ?? 10,
        maxUses: maxUses ?? 1,
        stock: stock ?? null,
      },
    });

    res.status(201).json({ data: reward });
  } catch (err) {
    console.error('Error al crear recompensa:', err);
    res.status(500).json({ error: 'Error al crear recompensa' });
  }
});

// PUT /api/admin/rewards/:id — update reward
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.reward.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Recompensa no encontrada' });
    }

    const { name, description, icon, xpCost, discountPct, maxUses, stock, isActive } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'El nombre no puede estar vacío' });
    }
    if (xpCost !== undefined && (typeof xpCost !== 'number' || xpCost < 1)) {
      return res.status(400).json({ error: 'xpCost debe ser un número >= 1' });
    }
    if (
      discountPct !== undefined &&
      (typeof discountPct !== 'number' || discountPct < 1 || discountPct > 100)
    ) {
      return res.status(400).json({ error: 'discountPct debe estar entre 1 y 100' });
    }

    const reward = await prisma.reward.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(xpCost !== undefined && { xpCost }),
        ...(discountPct !== undefined && { discountPct }),
        ...(maxUses !== undefined && { maxUses }),
        ...(stock !== undefined && { stock }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ data: reward });
  } catch (err) {
    console.error('Error al actualizar recompensa:', err);
    res.status(500).json({ error: 'Error al actualizar recompensa' });
  }
});

// DELETE /api/admin/rewards/:id — toggle isActive (never hard-delete)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.reward.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Recompensa no encontrada' });
    }

    const reward = await prisma.reward.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.json({ data: reward });
  } catch (err) {
    console.error('Error al desactivar/activar recompensa:', err);
    res.status(500).json({ error: 'Error al desactivar/activar recompensa' });
  }
});

// ── Admin: Achievement CRUD ──

// GET /api/admin/achievements — list all achievements
router.get('/achievements', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({ orderBy: { xpReward: 'asc' } });
    res.json({ data: achievements });
  } catch (err) {
    console.error('Error al listar logros:', err);
    res.status(500).json({ error: 'Error al listar logros' });
  }
});

// POST /api/admin/achievements — create achievement
router.post('/achievements', requireAuth, async (req: AuthRequest, res: Response) => {
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
      data: {
        name,
        slug,
        description: description || '',
        icon: icon || '🏆',
        rarity: rarity || 'COMMON',
        xpReward: xpReward || 20,
      },
    });
    res.json({ data: achievement });
  } catch (err) {
    console.error('Error al crear logro:', err);
    res.status(500).json({ error: 'Error al crear logro' });
  }
});

// PUT /api/admin/achievements/:id — update achievement
router.put('/achievements/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, rarity, xpReward } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (rarity !== undefined) data.rarity = rarity;
    if (xpReward !== undefined) data.xpReward = xpReward;
    const achievement = await prisma.achievement.update({ where: { id }, data });
    res.json({ data: achievement });
  } catch (err) {
    console.error('Error al actualizar logro:', err);
    res.status(500).json({ error: 'Error al actualizar logro' });
  }
});

// DELETE /api/admin/achievements/:id — delete achievement
router.delete('/achievements/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.achievement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar logro:', err);
    res.status(500).json({ error: 'Error al eliminar logro' });
  }
});

export default router;
