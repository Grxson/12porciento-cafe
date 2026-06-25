import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import webpush from 'web-push';
import {
  saveSubscription,
  removeSubscription,
  getUserSubscriptions,
  getAdminSubscriptions,
  getSubscriptionByEndpoint,
  cleanupSubscription,
  getAdminPreferences,
  upsertAdminPreference,
  seedDefaultAdminPreferences,
} from '../lib/push';

const router = Router();

// Validation helper
function isValidSubscription(body: any): body is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!body || typeof body !== 'object') return false;
  if (typeof body.endpoint !== 'string' || !body.endpoint.startsWith('https://')) return false;
  if (!body.keys || typeof body.keys !== 'object') return false;
  if (typeof body.keys.p256dh !== 'string' || body.keys.p256dh.length < 20) return false;
  if (typeof body.keys.auth !== 'string' || body.keys.auth.length < 8) return false;
  return true;
}

// POST /api/push/subscribe — register push subscription
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    if (!isValidSubscription(req.body)) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    // Try to extract user from token if present
    let userId: string | undefined;
    if (token) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role?: string };
        userId = payload.id;
      } catch {
        // Invalid token — subscription is anonymous
      }
    }

    const existing = await getSubscriptionByEndpoint(req.body.endpoint);
    if (existing) {
      return res.status(200).json({
        ok: true,
        id: existing.id,
        message: 'Ya estás suscrito desde este dispositivo',
      });
    }

    const sub = await saveSubscription(
      { endpoint: req.body.endpoint, keys: req.body.keys },
      userId,
      req.headers['user-agent'],
    );

    return res.status(201).json({
      ok: true,
      id: sub.id,
      message: 'Suscripción registrada exitosamente',
    });
  } catch (err) {
    console.error('[PUSH] subscribe error:', err);
    return res.status(500).json({ error: 'Error al registrar suscripción' });
  }
});

// DELETE /api/push/subscribe — remove push subscription
router.delete('/subscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'endpoint is required' });
    }

    await removeSubscription(endpoint);
    return res.json({ ok: true, message: 'Suscripción eliminada' });
  } catch (err) {
    console.error('[PUSH] unsubscribe error:', err);
    return res.status(500).json({ error: 'Error al eliminar suscripción' });
  }
});

// GET /api/push/subscriptions — list subscriptions (admin-only)
router.get('/subscriptions', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const subs = await getAdminSubscriptions();
    return res.json({
      subscriptions: subs.map((s: { id: string; endpoint: string; userId: string | null; userAgent: string | null; createdAt: Date }) => ({
        id: s.id,
        endpoint: s.endpoint,
        userId: s.userId,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('[PUSH] list error:', err);
    return res.status(500).json({ error: 'Error al listar suscripciones' });
  }
});

// POST /api/push/test — send test notification (admin-only)
router.post('/test', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const subs = await getAdminSubscriptions();
    if (subs.length === 0) {
      return res.status(404).json({ error: 'No hay dispositivos suscritos' });
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: '🔔 Notificación de prueba',
            message: 'Si ves esto, las notificaciones push funcionan correctamente.',
            event: 'test_notification',
            data: { url: '/admin' },
            timestamp: new Date().toISOString(),
          }),
        );
        sent++;
      } catch (pushErr: any) {
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await cleanupSubscription(sub.id);
          console.log(`[PUSH] cleaned up expired subscription: ${sub.id}`);
        }
        failed++;
      }
    }

    return res.json({ ok: true, sent, failed });
  } catch (err) {
    console.error('[PUSH] test error:', err);
    return res.status(500).json({ error: 'Error al enviar notificación de prueba' });
  }
});

// GET /api/push/my-subscriptions — user's own subscriptions (user auth)
router.get('/my-subscriptions', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const subs = await getUserSubscriptions(req.user!.id);
    return res.json({
      subscriptions: subs.map((s: { id: string; endpoint: string; userAgent: string | null; createdAt: Date }) => ({
        id: s.id,
        endpoint: s.endpoint,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('[PUSH] my-subscriptions error:', err);
    return res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

// GET /api/push/preferences — admin notification preferences
router.get('/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(401).json({ error: 'Admin ID not found' });

    let prefs = await getAdminPreferences(adminId);
    // Seed defaults if empty (first time)
    if (Object.keys(prefs).length === 0) {
      await seedDefaultAdminPreferences(adminId);
      prefs = await getAdminPreferences(adminId);
    }

    return res.json({ preferences: prefs });
  } catch (err) {
    console.error('[PUSH] get preferences error:', err);
    return res.status(500).json({ error: 'Error al obtener preferencias' });
  }
});

// PUT /api/push/preferences — update admin notification preferences
router.put('/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.status(401).json({ error: 'Admin ID not found' });

    const { eventType, enabled } = req.body;
    if (!eventType || typeof eventType !== 'string' || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'eventType (string) and enabled (boolean) required' });
    }

    await upsertAdminPreference(adminId, eventType, enabled);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PUSH] update preferences error:', err);
    return res.status(500).json({ error: 'Error al actualizar preferencias' });
  }
});

export default router;
