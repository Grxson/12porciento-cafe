import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import subscriptionPaymentsRouter from './routes/subscription-payments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Webhook must receive raw body — register before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter);
app.use('/api/subscription-payments/webhook', express.raw({ type: 'application/json' }), subscriptionPaymentsRouter);

app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/bundles', bundlesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/promo-codes', promoCodesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/subscription-payments', subscriptionPaymentsRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Café 12% server running on port ${PORT}`);
});
