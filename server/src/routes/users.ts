import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';
import { emitEvent } from '../socket';
import { sendMail } from '../lib/mail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

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
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      res.status(400).json({ error: 'Nombre debe tener entre 2 y 100 caracteres' });
      return;
    }
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: 'Ya existe una cuenta con este email' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: normalizedEmail, password: hashed },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, avatarUrl: true, stripeDefaultPaymentMethodId: true, createdAt: true },
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
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
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
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, avatarUrl: true, stripeDefaultPaymentMethodId: true, createdAt: true },
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
    const { name, phone, address, city, state, zipCode, avatarUrl } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 1 || name.length > 100)) {
      return res.status(400).json({ error: 'Nombre inválido (máx 100 caracteres)' });
    }
    if (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.length > 20)) {
      return res.status(400).json({ error: 'Teléfono inválido (máx 20 caracteres)' });
    }
    if (address !== undefined && address !== null && (typeof address !== 'string' || address.length > 200)) {
      return res.status(400).json({ error: 'Dirección demasiado larga (máx 200 caracteres)' });
    }
    if (city !== undefined && city !== null && (typeof city !== 'string' || city.length > 100)) {
      return res.status(400).json({ error: 'Ciudad demasiado larga (máx 100 caracteres)' });
    }
    if (state !== undefined && state !== null && (typeof state !== 'string' || state.length > 100)) {
      return res.status(400).json({ error: 'Estado demasiado largo (máx 100 caracteres)' });
    }
    if (zipCode !== undefined && zipCode !== null && (typeof zipCode !== 'string' || zipCode.length > 10)) {
      return res.status(400).json({ error: 'Código postal inválido (máx 10 caracteres)' });
    }
    if (avatarUrl !== undefined && avatarUrl !== null && (typeof avatarUrl !== 'string' || avatarUrl.length > 80_000)) {
      return res.status(400).json({ error: 'Avatar demasiado grande' });
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, phone, address, city, state, zipCode, ...(avatarUrl !== undefined ? { avatarUrl } : {}) },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, avatarUrl: true, stripeDefaultPaymentMethodId: true, createdAt: true },
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
    if (!['CANCELLED', 'PAUSED', 'ACTIVE'].includes(status)) {
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
    if (status === 'CANCELLED') {
      emitEvent({
        event: 'subscription_cancelled',
        title: 'Suscripción cancelada',
        message: `Suscripción ${sub.plan} cancelada`,
        data: { subscriptionId: sub.id, plan: sub.plan },
        targetUserId: req.user!.id,
      });
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});

// POST /api/users/me/payment-methods/setup — create SetupIntent (creates Stripe Customer if needed)
router.post('/me/payment-methods/setup', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear intento de configuración' });
  }
});

// GET /api/users/me/payment-methods — list saved payment methods
router.get('/me/payment-methods', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.stripeCustomerId) { res.json({ methods: [], defaultId: null }); return; }

    const methods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    res.json({
      methods: methods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      })),
      defaultId: user.stripeDefaultPaymentMethodId,
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
});

// POST /api/users/me/payment-methods/default — set default payment method
router.post('/me/payment-methods/default', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { paymentMethodId } = req.body;
    if (!paymentMethodId) return res.status(400).json({ error: 'paymentMethodId requerido' });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.stripeCustomerId) return res.status(404).json({ error: 'No hay métodos de pago' });
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== user.stripeCustomerId) return res.status(403).json({ error: 'No autorizado' });
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { stripeDefaultPaymentMethodId: paymentMethodId },
    });
    res.json({ ok: true });
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Método de pago no encontrado' });
    res.status(500).json({ error: 'Error al guardar método de pago' });
  }
});

// DELETE /api/users/me/payment-methods/:pmId — detach payment method
router.delete('/me/payment-methods/:pmId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: 'No hay métodos de pago' });
    }
    // Verify ownership before detaching
    const pm = await stripe.paymentMethods.retrieve(req.params.pmId);
    if (pm.customer !== user.stripeCustomerId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await stripe.paymentMethods.detach(req.params.pmId);
    if (user.stripeDefaultPaymentMethodId === req.params.pmId) {
      await prisma.user.update({ where: { id: user.id }, data: { stripeDefaultPaymentMethodId: null } });
    }
    res.json({ ok: true });
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Método de pago no encontrado' });
    res.status(500).json({ error: 'Error al eliminar método de pago' });
  }
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/users/forgot-password — send reset link
router.post('/forgot-password', resetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email requerido' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      console.log(`[password-reset] Email not found (silent): ${normalizedEmail}`);
      return res.json({ ok: true, message: 'Si el email existe, recibirás un enlace de recuperación.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpires: expires },
    });
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/restablecer-contrasena/${token}`;
    const html = `
      <div style="background:#1a0f0a;padding:40px 20px;font-family:sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#2a1a0e;border-radius:8px;padding:32px;">
          <h1 style="color:#c9a227;font-size:24px;margin:0 0 16px;">12% Café</h1>
          <p style="color:#d4b896;font-size:14px;line-height:1.6;">Recibimos una solicitud para restablecer tu contraseña.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#c9a227;color:#1a0f0a;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;margin:16px 0;font-size:14px;">Restablecer contraseña</a>
          <p style="color:#8c6a4a;font-size:12px;line-height:1.4;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      </div>
    `;
    const sent = await sendMail({
      to: normalizedEmail,
      subject: 'Restablece tu contraseña — 12% Café',
      html,
    });
    if (!sent) throw new Error('sendMail returned false');
    console.log(`[email] Password reset sent to ${normalizedEmail}`);
    res.json({ ok: true, message: 'Si el email existe, recibirás un enlace de recuperación.' });
  } catch (err) {
    console.error('[password-reset] Failed:', err);
    res.status(500).json({ error: 'Error al enviar el correo. Intenta más tarde.' });
  }
});

// POST /api/users/reset-password — reset password with token
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token requerido' });
    }
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres' });
    }
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: { resetToken: hashedToken, resetTokenExpires: { gt: new Date() } },
    });
    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado. Solicita un nuevo enlace.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpires: null },
    });
    res.json({ ok: true, message: 'Contraseña actualizada exitosamente.' });
  } catch (err) {
    console.error('[password-reset] Failed:', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña.' });
  }
});

export default router;
