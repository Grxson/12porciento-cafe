import { schedule } from 'node-cron';
import { prisma } from '../db';
import { sendReminderEmail } from '../lib/abandoned-cart-reminder';

const REMINDER_DELAY_MS = 2 * 60 * 60 * 1000; // wait 2h after abandonment before nagging
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // give up after a week — coupon/stock likely stale
const MAX_REMINDERS = 1;

export function startAbandonedCartScheduler(): void {
  // Runs every 6 hours
  schedule('0 */6 * * *', async () => {
    console.log('[abandoned-cart-job] Scanning for carts to remind...');
    const now = Date.now();

    try {
      const candidates = await prisma.abandonedCart.findMany({
        where: {
          recovered: false,
          reminderCount: { lt: MAX_REMINDERS },
          createdAt: {
            lte: new Date(now - REMINDER_DELAY_MS),
            gte: new Date(now - MAX_AGE_MS),
          },
        },
      });

      console.log(`[abandoned-cart-job] ${candidates.length} carts due for a reminder`);

      for (const cart of candidates) {
        try {
          const sent = await sendReminderEmail(cart);
          if (!sent) {
            console.warn(`[abandoned-cart-job] Reminder not sent for cart ${cart.id}`);
          }
        } catch (err) {
          console.error(`[abandoned-cart-job] Error sending reminder for cart ${cart.id}:`, err);
        }
      }

      console.log('[abandoned-cart-job] Done');
    } catch (err) {
      console.error('[abandoned-cart-job] Fatal error:', err);
    }
  });

  console.log('[abandoned-cart-job] Scheduler started (every 6 hours)');
}
