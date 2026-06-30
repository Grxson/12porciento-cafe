import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import subscriptionsRouter from './routes/subscriptions';
import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import paymentsRouter from './routes/payments';
import bundlesRouter from './routes/bundles';
import reviewsRouter from './routes/reviews';
import usersRouter from './routes/users';
import promoCodesRouter from './routes/promoCodes';
import customersRouter from './routes/customers';
import webhookRouter from './routes/webhook';
import inventoryRouter from './routes/inventory';
import subscriptionPaymentsRouter, {
  webhookRouter as subWebhookRouter,
} from './routes/subscription-payments';
import adminUsersRouter from './routes/admin-users';
import recipesRouter from './routes/recipes';
import uploadsRouter from './routes/uploads';
import baristaRouter from './routes/barista';
import sitemapRouter from './routes/sitemap';
import pushRouter from './routes/push';
import wishlistRouter from './routes/wishlist';
import recipeRatingsRouter from './routes/recipe-ratings';
import giftCardsRouter from './routes/gift-cards';
import abandonedCartRouter from './routes/abandoned-cart';
import adminOrdersRouter from './routes/admin/orders';
import adminLogsRouter from './routes/admin/logs';
import lotesRouter from './routes/lotes';
import caficultoresRouter from './routes/caficultores';
import pricingRouter from './routes/pricing';
import productVersionsRouter from './routes/product-versions';
import { UPLOAD_DIR } from './lib/uploads';
import { startBillingScheduler } from './jobs/billing';
import { initMail } from './lib/mail';
import http from 'http';
import { initSocket } from './socket';
import webpush from 'web-push';

dotenv.config();

// Initialize web-push VAPID for PWA push notifications
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:gael.grxson@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
});

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

// Webhooks must receive raw body — register before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter);
// Subscription invoice webhook — dedicated router with raw body middleware
app.use(
  '/api/subscription-payments/webhook/invoice',
  express.raw({ type: 'application/json' }),
  subWebhookRouter,
);

app.use(express.json({ limit: '50kb' }));

app.use('/api/dashboard', adminLimiter, dashboardRouter);
app.use('/api/customers', adminLimiter, customersRouter);
app.use('/api/inventory', adminLimiter, inventoryRouter);

app.use('/api/products', productsRouter);
app.use('/api/orders', adminLimiter, ordersRouter);
app.use('/api/subscriptions', adminLimiter, subscriptionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/bundles', adminLimiter, bundlesRouter);
app.use('/api/reviews', adminLimiter, reviewsRouter);
app.use('/api/users', adminLimiter, usersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/promo-codes', adminLimiter, promoCodesRouter);
app.use('/api/subscription-payments', subscriptionPaymentsRouter);
app.use('/api/admin-users', adminLimiter, adminUsersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use('/api/uploads', uploadsRouter);
app.use('/api/barista', baristaRouter);
app.use('/api/push', pushRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/recipe-ratings', recipeRatingsRouter);
app.use('/api/gift-cards', giftCardsRouter);
app.use('/api/abandoned-cart', abandonedCartRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/admin/logs', adminLogsRouter);
app.use('/api/lotes', adminLimiter, lotesRouter);
app.use('/api/caficultores', adminLimiter, caficultoresRouter);
app.use('/api/pricing', adminLimiter, pricingRouter);
app.use('/api/product-versions', adminLimiter, productVersionsRouter);
app.use('/api', sitemapRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Café 12% server running on port ${PORT}`);
});

startBillingScheduler();
initMail();
