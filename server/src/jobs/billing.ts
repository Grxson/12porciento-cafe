import { schedule } from 'node-cron';
import Stripe from 'stripe';
import { prisma } from '../db';
import { getErrorMessage } from '../lib/error-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

export function startBillingScheduler(): void {
  // Runs every day at 3:00 AM
  schedule('0 3 * * *', async () => {
    console.log('[billing-job] Running subscription billing sync...');

    try {
      const dueSubs = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          nextBilling: { lte: new Date() },
          stripeSubscriptionId: { not: null },
        },
      });

      console.log(`[billing-job] ${dueSubs.length} subscriptions due for sync`);

      for (const sub of dueSubs) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId!);
          if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
            // Use Stripe's current_period_end as next billing date
            const periodEnd = stripeSub.items?.data?.[0]?.current_period_end;
            if (!periodEnd) {
              console.warn(`[billing-job] No items/period_end for ${sub.id}, skipping`);
              continue;
            }
            const nextBilling = new Date(periodEnd * 1000);
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { nextBilling },
            });
            console.log(`[billing-job] Synced nextBilling for ${sub.id}: ${nextBilling.toISOString()}`);
          } else {
            console.log(`[billing-job] Skipping ${sub.id}: Stripe status is ${stripeSub.status}`);
          }
        } catch (err: unknown) {
          console.error(`[billing-job] Error syncing ${sub.id}:`, getErrorMessage(err));
        }
      }

      console.log('[billing-job] Done');
    } catch (err) {
      console.error('[billing-job] Fatal error:', err);
    }
  });

  console.log('[billing-job] Scheduler started (daily at 3 AM)');
}
