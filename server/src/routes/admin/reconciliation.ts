import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../db';
import { retryWebhookEvent } from '../webhook';
import { getErrorMessage } from '../../lib/error-utils';

const router = Router();

// GET / — surfaces the two things that need manual attention: webhook events
// Stripe sent that we failed to process, and orders whose payment never
// reached a final state (stuck in REQUIRES_ACTION/FAILED).
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const [failedWebhookEvents, stuckOrders] = await Promise.all([
      prisma.stripeWebhookEvent.findMany({
        where: { status: 'FAILED' },
        orderBy: { processedAt: 'desc' },
        take: 100,
      }),
      prisma.order.findMany({
        where: { paymentStatus: { in: ['REQUIRES_ACTION', 'FAILED'] } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          customerName: true,
          email: true,
          total: true,
          paymentStatus: true,
          paymentFailureReason: true,
          paymentIntentId: true,
          createdAt: true,
        },
      }),
    ]);
    res.json({ data: { failedWebhookEvents, stuckOrders } });
  } catch {
    res.status(500).json({ error: 'Error al obtener datos de reconciliación' });
  }
});

// POST /webhook-events/:stripeEventId/retry — re-fetch and re-process a failed event
router.post(
  '/webhook-events/:stripeEventId/retry',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      await retryWebhookEvent(req.params.stripeEventId);
      res.json({ data: { retried: true } });
    } catch (err: unknown) {
      res.status(502).json({ error: getErrorMessage(err, 'Reintento falló') });
    }
  },
);

export default router;
