import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

// GET /api/admin-users — list all admin users
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const admins = await prisma.adminUser.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(admins);
  } catch (err) {
    console.error('[admin-users] Error:', err);
    res.status(500).json({ error: 'Error al cargar usuarios admin' });
  }
});

// POST /api/admin-users — create admin user
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Contraseña debe tener al menos 6 caracteres' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un usuario admin con este email' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.adminUser.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashed },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.json(admin);
  } catch (err) {
    console.error('[admin-users] Error:', err);
    res.status(500).json({ error: 'Error al crear usuario admin' });
  }
});

// DELETE /api/admin-users/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.admin!.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    await prisma.adminUser.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin-users] Error:', err);
    res.status(500).json({ error: 'Error al eliminar usuario admin' });
  }
});

export default router;
