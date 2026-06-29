import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../db';
import { logAdminAction } from '../../lib/adminLog';
import { sendMail } from '../../lib/mail';

const router = Router();

// GET /api/admin/orders/logistics — logistics dashboard
router.get('/logistics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 30;

    const where: Prisma.OrderWhereInput = {};
    if (statusFilter) where.status = statusFilter;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { NOT: { status: 'CANCELLED' }, ...where },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where: { NOT: { status: 'CANCELLED' }, ...where } }),
    ]);

    // Group by status for counts
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json({
      data: orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {} as Record<string, number>),
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// PATCH /api/admin/orders/:id/status — update order status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } }, items: true },
    });
    logAdminAction({ adminId: req.admin?.id, action: 'STATUS_CHANGE', entity: 'Order', entityId: req.params.id, metadata: { status } });
    res.json({ data: order });
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// PATCH /api/admin/orders/:id/tracking — set tracking number, carrier, estimated delivery
router.patch('/:id/tracking', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { trackingNumber, carrier, estimatedDelivery } = req.body;

    if (trackingNumber !== undefined && (typeof trackingNumber !== 'string' || trackingNumber.length > 100)) {
      return res.status(400).json({ error: 'Número de guía inválido (máx 100 caracteres)' });
    }
    if (carrier !== undefined && (typeof carrier !== 'string' || carrier.length > 80)) {
      return res.status(400).json({ error: 'Transportista inválido (máx 80 caracteres)' });
    }
    if (estimatedDelivery !== undefined && estimatedDelivery !== null) {
      const d = new Date(estimatedDelivery);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Fecha de entrega inválida' });
    }

    const data: Prisma.OrderUpdateInput = {};
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber?.trim() || null;
    if (carrier !== undefined) data.carrier = carrier?.trim() || null;
    if (estimatedDelivery !== undefined) data.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data,
      select: { id: true, trackingNumber: true, carrier: true, estimatedDelivery: true, status: true, email: true, customerName: true },
    });

    logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'Order',
      entityId: req.params.id,
      metadata: { trackingNumber: data.trackingNumber, carrier: data.carrier },
    });

    // Fire-and-forget tracking email — only when trackingNumber is being set
    if (order.trackingNumber && order.email) {
      const estDate = order.estimatedDelivery
        ? new Date(order.estimatedDelivery).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
      sendMail({
        to: order.email,
        subject: `Tu pedido #${order.id.slice(-6).toUpperCase()} está en camino 🚚`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a0a00">
            <h2 style="color:#4a2c0a">¡Tu pedido está en camino, ${order.customerName}!</h2>
            <p>Hemos enviado tu pedido <strong>#${order.id.slice(-6).toUpperCase()}</strong>.</p>
            <table style="border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:6px 12px 6px 0;color:#6b4226;font-size:13px">Número de guía</td>
                  <td style="padding:6px 0;font-weight:bold">${order.trackingNumber}</td></tr>
              ${order.carrier ? `<tr><td style="padding:6px 12px 6px 0;color:#6b4226;font-size:13px">Transportista</td>
                  <td style="padding:6px 0">${order.carrier}</td></tr>` : ''}
              ${estDate ? `<tr><td style="padding:6px 12px 6px 0;color:#6b4226;font-size:13px">Entrega estimada</td>
                  <td style="padding:6px 0">${estDate}</td></tr>` : ''}
            </table>
            <p style="color:#6b4226;font-size:13px">Puedes rastrear tu paquete con el número de guía en el sitio del transportista.</p>
            <hr style="border:none;border-top:1px solid #e8d5b0;margin:24px 0"/>
            <p style="color:#9b6a3a;font-size:12px">12% Café · gael.grxson@gmail.com</p>
          </div>`,
      }).catch((err) => console.error('[tracking-mail] Failed:', err?.message));
    }

    res.json({ data: order });
  } catch {
    res.status(500).json({ error: 'Error al actualizar tracking' });
  }
});

export default router;
