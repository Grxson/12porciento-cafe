import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/users/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Ya existe una cuenta con este email' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, createdAt: true },
    });
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' },
    );
    res.status(201).json({ token, user });
  } catch {
    res.status(500).json({ error: 'Error al crear cuenta' });
  }
});

// POST /api/users/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña requeridos' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' },
    );
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/users/me
router.get('/me', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/users/me
router.put('/me', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { name, phone, address, city, state, zipCode } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, phone, address, city, state, zipCode },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, createdAt: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// GET /api/users/me/orders
router.get('/me/orders', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// GET /api/users/me/reviews
router.get('/me/reviews', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// GET /api/users/me/subscription
router.get('/me/subscription', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true },
            },
          },
        },
      },
    });
    res.json(subscription ?? null);
  } catch {
    res.status(500).json({ error: 'Error al obtener suscripción' });
  }
});

// PUT /api/users/me/subscription/:id/status
router.put('/me/subscription/:id/status', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['CANCELLED', 'PAUSED'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }
    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!sub) { res.status(404).json({ error: 'Suscripción no encontrada' }); return; }
    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});

export default router;
