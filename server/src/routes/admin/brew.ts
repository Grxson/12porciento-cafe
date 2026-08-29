/**
 * 12% Brew — admin routes
 *
 * Mounted at /api/brew/admin by the server entrypoint. Provides admin CRUD
 * for BrewMethod. Recipe structured-field updates live in routes/recipes.ts
 * (the canonical recipe admin endpoint) — we extend its whitelist there.
 *
 * All routes require requireAuth + adminLimiter (set at mount time).
 * Mutations write to AdminLog.
 */

import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../db';
import { getErrorCode } from '../../lib/error-utils';

const router = Router();

/**
 * Fire-and-forget audit log writer for brew-admin mutations.
 * Mirrors lib/adminLog.ts but doesn't require extending the AdminEntity
 * union type. Failures are swallowed silently.
 */
async function audit(
  req: AuthRequest,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: req.admin?.id ?? null,
        action,
        entity: 'BrewMethod',
        entityId,
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (err) {
    console.error('[brew-admin] audit log failed:', (err as Error)?.message ?? err);
  }
}

// All admin routes require auth
router.use(requireAuth);

const VALID_CATEGORIES = [
  'POUR_OVER',
  'IMMERSION',
  'PRESSURE',
  'STOVETOP',
  'COLD',
  'TRADITIONAL',
  'EVALUATION',
] as const;

// GET /admin/methods — list ALL methods (including inactive)
router.get('/methods', async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.brewMethod.findMany({
      orderBy: [{ active: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { recipes: true, brewSessions: true } } },
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener métodos' });
  }
});

// POST /admin/methods — create
router.post('/methods', async (req: AuthRequest, res: Response) => {
  try {
    const {
      slug,
      name,
      description,
      shortDescription,
      category,
      icon,
      image,
      difficulty,
      defaultRatioMin,
      defaultRatioMax,
      defaultTemperatureMin,
      defaultTemperatureMax,
      defaultGrindMin,
      defaultGrindMax,
      active,
    } = req.body ?? {};

    if (!slug?.trim() || !name?.trim() || !category) {
      return res.status(400).json({ error: 'slug, name y category son requeridos' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category inválida (${VALID_CATEGORIES.join('|')})` });
    }

    const created = await prisma.brewMethod.create({
      data: {
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        name: name.trim(),
        description: description?.trim() ?? null,
        shortDescription: shortDescription?.trim() ?? null,
        category,
        icon: icon?.trim() ?? null,
        image: image?.trim() ?? null,
        difficulty: difficulty ?? 'MEDIA',
        defaultRatioMin: Number.isFinite(defaultRatioMin) ? Number(defaultRatioMin) : 13,
        defaultRatioMax: Number.isFinite(defaultRatioMax) ? Number(defaultRatioMax) : 18,
        defaultTemperatureMin: Number.isFinite(defaultTemperatureMin)
          ? Number(defaultTemperatureMin)
          : 88,
        defaultTemperatureMax: Number.isFinite(defaultTemperatureMax)
          ? Number(defaultTemperatureMax)
          : 96,
        defaultGrindMin: Number.isFinite(defaultGrindMin) ? Number(defaultGrindMin) : null,
        defaultGrindMax: Number.isFinite(defaultGrindMax) ? Number(defaultGrindMax) : null,
        active: active !== false,
      },
    });

    await audit(req, 'CREATE', created.id, { after: created });

    res.status(201).json({ data: created });
  } catch (err) {
    console.error(err);
    const code = getErrorCode(err);
    if (code === 'P2002') return res.status(409).json({ error: 'slug ya existe' });
    res.status(500).json({ error: 'Error al crear método' });
  }
});

// PUT /admin/methods/:id — update
router.put('/methods/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.brewMethod.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Método no encontrado' });

    const data: Prisma.BrewMethodUpdateInput = {};
    const allowed: Array<keyof Prisma.BrewMethodUpdateInput> = [
      'name',
      'description',
      'shortDescription',
      'category',
      'icon',
      'image',
      'difficulty',
      'defaultRatioMin',
      'defaultRatioMax',
      'defaultTemperatureMin',
      'defaultTemperatureMax',
      'defaultGrindMin',
      'defaultGrindMax',
      'active',
    ];

    for (const key of allowed) {
      if (req.body?.[key] === undefined) continue;
      const value = req.body[key];
      if (key === 'category' && !VALID_CATEGORIES.includes(value)) {
        return res.status(400).json({ error: `category inválida (${VALID_CATEGORIES.join('|')})` });
      }
      if (
        key === 'name' ||
        key === 'description' ||
        key === 'shortDescription' ||
        key === 'icon' ||
        key === 'image' ||
        key === 'difficulty'
      ) {
        (data as Record<string, unknown>)[key] = typeof value === 'string' ? value.trim() : value;
      } else {
        (data as Record<string, unknown>)[key] = value;
      }
    }

    const updated = await prisma.brewMethod.update({ where: { id: req.params.id }, data });

    await audit(req, 'UPDATE', updated.id, { before: existing, after: updated });

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar método' });
  }
});

// DELETE /admin/methods/:id
router.delete('/methods/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.brewMethod.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Método no encontrado' });

    await prisma.brewMethod.delete({ where: { id: req.params.id } });

    await audit(req, 'DELETE', existing.id, { before: existing });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar método' });
  }
});

export default router;
