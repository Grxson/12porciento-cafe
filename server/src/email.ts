import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

interface OrderEmailData {
  to: string;
  customerName: string;
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
}

function orderConfirmationHtml(data: OrderEmailData): string {
  const itemRows = data.items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #2a1a0e;color:#d4b896;font-size:14px;">${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a1a0e;color:#8c6a4a;font-size:14px;text-align:center;">×${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #2a1a0e;color:#c9a227;font-size:14px;text-align:right;">$${(item.price * item.quantity).toLocaleString('es-MX')}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pedido confirmado</title></head>
<body style="margin:0;padding:0;background:#0d0704;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0704;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#1a0e07;border:1px solid #2a1a0e;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a1a0e;text-align:center;">
            <div style="display:inline-block;width:40px;height:2px;background:#c9a227;margin-bottom:16px;"></div><br>
            <span style="font-size:28px;font-weight:bold;color:#f5ede3;letter-spacing:-0.5px;">12%</span><br>
            <span style="font-size:10px;letter-spacing:4px;color:#c9a227;text-transform:uppercase;">doce por ciento</span>
          </td>
        </tr>

        <!-- Confirmation -->
        <tr>
          <td style="padding:32px 40px 24px;text-align:center;">
            <div style="width:48px;height:48px;border:2px solid #c9a227;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#c9a227;font-size:22px;">✓</span>
            </div>
            <h1 style="margin:0 0 8px;color:#f5ede3;font-size:22px;font-weight:normal;">¡Pedido confirmado!</h1>
            <p style="margin:0;color:#8c6a4a;font-size:13px;letter-spacing:1px;">PEDIDO #${data.orderId.slice(-8).toUpperCase()}</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:0 40px 24px;">
            <p style="margin:0;color:#d4b896;font-size:15px;line-height:1.7;">Hola ${data.customerName},</p>
            <p style="margin:12px 0 0;color:#8c6a4a;font-size:14px;line-height:1.7;">
              Recibimos tu pedido. Tostamos a pedido para garantizar frescura máxima —
              recibirás tu café dentro de los próximos <strong style="color:#d4b896;">3-5 días hábiles</strong>.
            </p>
          </td>
        </tr>

        <!-- Order items -->
        <tr>
          <td style="padding:0 40px 24px;">
            <p style="margin:0 0 12px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c9a227;">Tu pedido</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td colspan="2" style="padding:16px 0 4px;color:#d4b896;font-size:14px;font-weight:bold;">Total</td>
                <td style="padding:16px 0 4px;color:#c9a227;font-size:18px;font-weight:bold;text-align:right;">$${data.total.toLocaleString('es-MX')}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost'}/perfil/pedidos"
               style="display:inline-block;background:#c9a227;color:#0d0704;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;text-decoration:none;">
              Ver mis pedidos
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a1a0e;text-align:center;">
            <p style="margin:0;color:#4a3020;font-size:12px;line-height:1.6;">
              12% Café · Especialidad desde México<br>
              <span style="color:#2a1a0e;">Si tienes dudas, responde a este correo.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    console.warn('[email] SMTP_HOST or SMTP_FROM not set — skipping order confirmation email');
    return;
  }

  try {
    await transport.sendMail({
      from: `"12% Café" <${process.env.SMTP_FROM}>`,
      to: data.to,
      subject: `Pedido confirmado #${data.orderId.slice(-8).toUpperCase()} — 12% Café`,
      html: orderConfirmationHtml(data),
    });
    console.log(`[email] Order confirmation sent to ${data.to}`);
  } catch (err) {
    console.error('[email] Failed to send order confirmation:', err);
  }
}

// ── Order status update ──────────────────────────────────────────────────────

interface StatusEmailData {
  to: string;
  customerName: string;
  orderId: string;
  status: string;
}

const STATUS_COPY: Record<string, { subject: string; headline: string; body: string; cta: string; color: string }> = {
  PROCESSING: {
    subject: 'Tu pedido está siendo preparado',
    headline: 'Preparando tu café',
    body: 'Estamos seleccionando y tostando tus granos a pedido para garantizar la máxima frescura. Te avisamos cuando esté en camino.',
    cta: 'Ver mi pedido',
    color: '#3b82f6',
  },
  SHIPPED: {
    subject: '¡Tu pedido está en camino! 🚚',
    headline: 'Tu café ya viene',
    body: 'Tu pedido salió de nuestras instalaciones y está en camino hacia ti. Recibirás tu café recién tostado en los próximos días.',
    cta: 'Ver mi pedido',
    color: '#a855f7',
  },
  DELIVERED: {
    subject: 'Tu pedido fue entregado ✓',
    headline: '¡Que lo disfrutes!',
    body: 'Tu pedido fue marcado como entregado. Esperamos que disfrutes cada taza. Si tienes algún problema con tu pedido, no dudes en contactarnos.',
    cta: 'Dejar una reseña',
    color: '#22c55e',
  },
  CANCELLED: {
    subject: 'Tu pedido fue cancelado',
    headline: 'Pedido cancelado',
    body: 'Tu pedido ha sido cancelado. Si tienes preguntas o crees que esto es un error, por favor contáctanos respondiendo este correo.',
    cta: 'Volver a la tienda',
    color: '#ef4444',
  },
};

function statusUpdateHtml(data: StatusEmailData): string {
  const copy = STATUS_COPY[data.status];
  if (!copy) return '';
  const ctaUrl = data.status === 'DELIVERED'
    ? `${process.env.CLIENT_URL || 'http://localhost'}/tienda`
    : `${process.env.CLIENT_URL || 'http://localhost'}/perfil/pedidos`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0704;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0704;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#1a0e07;border:1px solid #2a1a0e;">

        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a1a0e;text-align:center;">
            <span style="font-size:28px;font-weight:bold;color:#f5ede3;letter-spacing:-0.5px;">12%</span><br>
            <span style="font-size:10px;letter-spacing:4px;color:#c9a227;text-transform:uppercase;">doce por ciento</span>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 40px 8px;">
            <div style="display:inline-block;padding:4px 12px;background:${copy.color}20;border:1px solid ${copy.color}40;margin-bottom:16px;">
              <span style="color:${copy.color};font-size:11px;letter-spacing:2px;text-transform:uppercase;">${data.status}</span>
            </div>
            <h1 style="margin:0 0 8px;color:#f5ede3;font-size:22px;font-weight:normal;">${copy.headline}</h1>
            <p style="margin:0 0 4px;color:#8c6a4a;font-size:12px;letter-spacing:1px;">PEDIDO #${data.orderId.slice(-8).toUpperCase()}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 40px 32px;">
            <p style="margin:0 0 12px;color:#8c6a4a;font-size:14px;line-height:1.7;">Hola ${data.customerName},</p>
            <p style="margin:0 0 24px;color:#d4b896;font-size:14px;line-height:1.7;">${copy.body}</p>
            <a href="${ctaUrl}"
               style="display:inline-block;background:#c9a227;color:#0d0704;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:12px 28px;text-decoration:none;">
              ${copy.cta}
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a1a0e;text-align:center;">
            <p style="margin:0;color:#4a3020;font-size:12px;line-height:1.6;">
              12% Café · Especialidad desde México<br>
              <span style="color:#2a1a0e;">¿Dudas? Responde este correo.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderStatusUpdate(data: StatusEmailData): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return;
  const copy = STATUS_COPY[data.status];
  if (!copy) return;

  try {
    await transport.sendMail({
      from: `"12% Café" <${process.env.SMTP_FROM}>`,
      to: data.to,
      subject: `${copy.subject} — Pedido #${data.orderId.slice(-8).toUpperCase()}`,
      html: statusUpdateHtml(data),
    });
    console.log(`[email] Status update (${data.status}) sent to ${data.to}`);
  } catch (err) {
    console.error('[email] Failed to send status update:', err);
  }
}
