import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../db';

const router = Router();

// GET /api/admin/logs — paginated audit log with optional entity/action filters
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const skip = (page - 1) * pageSize;
    const entity = (req.query.entity as string) || '';
    const action = (req.query.action as string) || '';

    const where: Prisma.AdminLogWhereInput = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, name: true, email: true } } },
      }),
      prisma.adminLog.count({ where }),
    ]);

    res.json({ data: logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch {
    res.status(500).json({ error: 'Error al obtener logs de auditoría' });
  }
});

export default router;
