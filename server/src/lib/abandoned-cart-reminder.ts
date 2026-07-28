import { prisma } from '../db';
import { sendMail } from './mail';

interface CartItem {
  productId: string;
  name?: string;
  quantity: number;
  price?: number;
}

// Sends the reminder email for a cart and, on success, stamps reminderSentAt /
// bumps reminderCount. Shared by the on-demand admin route and the automatic
// scheduler so both stay in sync on what "a reminder was sent" means.
export async function sendReminderEmail(cart: {
  id: string;
  email: string;
  items: string;
  couponCode: string | null;
}): Promise<boolean> {
  const items = JSON.parse(cart.items) as CartItem[];
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🛒 ¡Tu carrito te espera!</h2>
      <p>Notamos que dejaste algunos productos en tu carrito:</p>
      <ul>${items.map((i) => `<li>${i.name || 'Producto'} x${i.quantity}${i.price ? ` — $${i.price}` : ''}</li>`).join('')}</ul>
      ${cart.couponCode ? `<p>🔑 Tu código <strong>${cart.couponCode}</strong> sigue activo.</p>` : ''}
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/checkout"
         style="display: inline-block; padding: 12px 24px; background: #B8860B; color: white; text-decoration: none; border-radius: 8px;">
        Completar mi compra
      </a>
    </div>
  `;

  const sent = await sendMail({
    to: cart.email,
    subject: '🛒 ¡Tu carrito de 12% Café te espera!',
    html: emailHtml,
  });
  if (sent) {
    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { reminderSentAt: new Date(), reminderCount: { increment: 1 } },
    });
  }
  return sent;
}
