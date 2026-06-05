import { schedule } from 'node-cron';
import Stripe from 'stripe';
import { prisma } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia' as any,
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
            const monthsToAdd = sub.frequency === 'bimonthly' ? 2 : 1;
            const nextBilling = new Date();
            nextBilling.setMonth(nextBilling.getMonth() + monthsToAdd);
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { nextBilling },
            });
            console.log(`[billing-job] Synced nextBilling for ${sub.id}: ${nextBilling.toISOString()}`);
          } else {
            console.log(`[billing-job] Skipping ${sub.id}: Stripe status is ${stripeSub.status}`);
          }
        } catch (err: any) {
          console.error(`[billing-job] Error syncing ${sub.id}:`, err.message);
        }
      }

      console.log('[billing-job] Done');
    } catch (err) {
      console.error('[billing-job] Fatal error:', err);
    }
  });

  console.log('[billing-job] Scheduler started (daily at 3 AM)');
}
