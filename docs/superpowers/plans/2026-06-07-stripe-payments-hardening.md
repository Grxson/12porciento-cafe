# Stripe: Reforzamiento de Sistema de Pagos

> **Para agentes:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development para ejecutar tareas por fase. Planificación → Codificación → Pruebas.

**Objetivo:** Reforzar sistema de pagos Stripe que falla en múltiples puntos. Agregar resiliencia, idempotencia, webhooks, logging, reintentos, manejo de 3D Secure.

**Arquitectura:**
- Backend: añadir idempotency keys, payment intent storage, webhook handler, error logging detallado
- Frontend: manejo de 3D Secure, reintentos clientside, mejor feedback visual
- Database: tabla para tracking payment intents y eventos webhook
- Error Handling: específico por tipo de error (rate limit, card declined, network, etc.)

**Tech Stack:** Stripe API, Prisma, Express, React + Stripe.js

---

## FASE 1: PLANNING

### Task 1: Diagnóstico de fallos actuales

**Archivos a revisar:**
- `server/src/routes/payments.ts` — lógica de pagos
- `client/src/components/StripePaymentForm.tsx` — cliente de pagos
- `server/prisma/schema.prisma` — modelos DB

- [ ] **Step 1: Analizar problemas actuales**

Documenta problemas encontrados:

1. **No hay idempotency keys** → Mismo request → múltiples PaymentIntents
   - Solución: Usar `idempotencyKey` en Stripe (único por cliente/monto/items)

2. **Payment intent no se almacena en BD** → No hay tracking
   - Solución: Crear tabla `PaymentIntent` para registrar cada intento

3. **No hay webhook handler** → No se confirma éxito/fracaso
   - Solución: Implementar `/webhooks/stripe` para actualizar estado

4. **Error genérico en cliente** → Usuario no sabe qué falló
   - Solución: Mapear errores Stripe a mensajes claros

5. **No hay reintentos automáticos** → Si falla, usuario hace manual retry
   - Solución: Exponential backoff clientside (max 3 intentos)

6. **No hay 3D Secure handling** → Pagos declinados si requieren 3DS
   - Solución: Usar `stripe.confirmCardPayment()` con redirect si es needed

7. **No hay logging detallado** → Imposible debuggear fallos en producción
   - Solución: Logger con contexto (items, monto, error details, user ID)

- [ ] **Step 2: Diseñar schema DB para payment tracking**

```
model PaymentIntent {
  id                String   @id (same as Stripe's pi_xxx)
  stripeId          String   @unique
  status            String   // created, processing, succeeded, failed, canceled
  
  userId            String?
  user              User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  amount            Int      (centavos)
  currency          String   @default("mxn")
  
  items             Json     (original items array)
  promoCode         String?
  
  stripeCustomerId  String?
  paymentMethodId   String?
  
  errorCode         String?
  errorMessage      String?
  
  metadata          Json     (additional context)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([stripeId])
  @@index([createdAt])
}

model PaymentEvent {
  id        String   @id @default(cuid())
  eventId   String   @unique  (from Stripe webhook)
  type      String   // payment_intent.succeeded, payment_intent.payment_failed, etc
  data      Json
  processed Boolean  @default(false)
  
  createdAt DateTime @default(now())
  
  @@index([eventId])
  @@index([type])
  @@index([processed])
}
```

- [ ] **Step 3: Definir error mapping**

```typescript
// Stripe error codes → user messages
const ERROR_MESSAGES: Record<string, string> = {
  'card_declined': 'Tu tarjeta fue declinada. Intenta con otro método.',
  'expired_card': 'Tu tarjeta expiró.',
  'incorrect_cvc': 'El CVC es incorrecto.',
  'processing_error': 'Error procesando el pago. Intenta de nuevo.',
  'rate_limit': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  'api_connection_error': 'Error de conexión. Intenta de nuevo.',
  'api_error': 'Error del servidor. Intenta de nuevo.',
  'authentication_error': 'Error de autenticación.',
  'invalid_request_error': 'Solicitud inválida.',
  'authentication_required': 'Se requiere autenticación adicional. Por favor, sigue las instrucciones.',
};
```

- [ ] **Step 4: Definir pasos retry**

```typescript
// Exponential backoff
const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [1000, 3000, 5000],  // ms
  retryableErrors: [
    'api_connection_error',
    'api_error',
    'rate_limit',
    'processing_error',
    'timeout',
  ],
};
```

- [ ] **Step 5: Commit planning**

```bash
git add docs/superpowers/plans/2026-06-07-stripe-payments-hardening.md
git commit -m "plan: diagnose and design Stripe payment hardening

- Identify 7 critical failure points in current implementation
- Design PaymentIntent and PaymentEvent schema for tracking
- Define error message mapping for user feedback
- Define exponential backoff retry strategy"
```

---

## FASE 2: CODIFICACIÓN

### Task 2: Actualizar Prisma schema

**Archivos:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/[timestamp]_add_payment_tracking.ts`

- [ ] **Step 1: Agregar modelos a schema**

Append a `server/prisma/schema.prisma`:

```prisma
model PaymentIntent {
  id                String   @id @default(cuid())
  stripeId          String   @unique
  status            String   @default("created") // created | processing | succeeded | failed | canceled
  
  userId            String?
  user              User?    @relation("paymentIntents", fields: [userId], references: [id], onDelete: SetNull)
  
  amount            Int      // centavos
  currency          String   @default("mxn")
  
  items             String   // JSON stringified
  promoCode         String?
  
  stripeCustomerId  String?
  paymentMethodId   String?
  
  errorCode         String?
  errorMessage      String?
  
  metadata          String?  // JSON stringified
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([stripeId])
  @@index([createdAt])
}

model PaymentEvent {
  id        String   @id @default(cuid())
  eventId   String   @unique
  type      String
  data      String   // JSON stringified
  processed Boolean  @default(false)
  
  createdAt DateTime @default(now())
  
  @@index([eventId])
  @@index([type])
  @@index([processed])
}
```

Also update User model:
```prisma
model User {
  // ... existing fields ...
  paymentIntents PaymentIntent[] @relation("paymentIntents")
}
```

- [ ] **Step 2: Crear migration**

```bash
cd server
pnpm exec prisma migrate dev --name add_payment_tracking
```

Expected: Migration created successfully

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "database: add PaymentIntent and PaymentEvent models for tracking"
```

---

### Task 3: Crear payment service con resiliencia

**Archivos:**
- Create: `server/src/services/paymentService.ts`
- Create: `server/src/utils/paymentLogger.ts`

- [ ] **Step 1: Crear payment logger**

```typescript
// server/src/utils/paymentLogger.ts
export interface PaymentLogContext {
  userId?: string;
  items?: any[];
  amount?: number;
  stripeCustomerId?: string;
  paymentIntentId?: string;
  error?: any;
}

export function logPayment(action: string, context: PaymentLogContext) {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    action,
    userId: context.userId || 'anonymous',
    itemCount: context.items?.length || 0,
    amount: context.amount ? `${context.amount} centavos` : null,
    stripeCustomerId: context.stripeCustomerId,
    paymentIntentId: context.paymentIntentId,
    error: context.error ? {
      code: context.error.code,
      message: context.error.message,
      param: context.error.param,
    } : null,
  };
  
  if (context.error) {
    console.error(`[PAYMENT ERROR] ${action}:`, JSON.stringify(log, null, 2));
  } else {
    console.log(`[PAYMENT] ${action}:`, JSON.stringify(log, null, 2));
  }
  
  return log;
}
```

- [ ] **Step 2: Crear payment service**

```typescript
// server/src/services/paymentService.ts
import Stripe from 'stripe';
import { prisma } from '../db';
import { logPayment } from '../utils/paymentLogger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

const ERROR_MESSAGES: Record<string, string> = {
  'card_declined': 'Tu tarjeta fue declinada. Intenta con otro método.',
  'expired_card': 'Tu tarjeta expiró.',
  'incorrect_cvc': 'El CVC es incorrecto.',
  'processing_error': 'Error procesando el pago. Intenta de nuevo.',
  'rate_limit': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  'api_connection_error': 'Error de conexión. Intenta de nuevo.',
  'api_error': 'Error del servidor. Intenta de nuevo.',
  'authentication_error': 'Error de autenticación.',
  'invalid_request_error': 'Solicitud inválida.',
  'authentication_required': 'Se requiere autenticación adicional. Sigue los pasos en pantalla.',
};

interface CreatePaymentIntentInput {
  items: Array<{ productId: string; quantity: number }>;
  promoCode?: string;
  stripeCustomerId?: string;
  paymentMethodId?: string;
  userId?: string;
  idempotencyKey: string;
}

interface PaymentIntentResult {
  clientSecret: string | null;
  paymentIntentId: string;
  amount: number;
  subtotal: number;
  discountAmount: number;
  error?: string;
}

export async function createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
  const { items, promoCode, stripeCustomerId, paymentMethodId, userId, idempotencyKey } = input;

  logPayment('CREATE_INTENT_START', { userId, items, stripeCustomerId });

  try {
    // Verify items and calculate amount
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { price: true, stock: true, isActive: true, name: true },
      });
      
      if (!product || !product.isActive) {
        throw new Error(`Producto ${item.productId} no disponible`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para "${product.name}"`);
      }
      totalAmount += product.price * item.quantity;
    }

    // Apply promo
    const { finalAmount, discountAmount } = await applyPromo(totalAmount, promoCode);
    const amountCentavos = Math.round(finalAmount * 100);

    if (amountCentavos < 1000) {
      throw new Error('El monto mínimo es $10 MXN');
    }

    if (paymentMethodId && !stripeCustomerId) {
      throw new Error('Tu método de pago guardado requiere información de cliente. Intenta actualizar tu perfil o usar un método de pago nuevo.');
    }

    // Create Stripe PaymentIntent with idempotency key
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountCentavos,
          currency: 'mxn',
          ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
          ...(paymentMethodId
            ? { payment_method: paymentMethodId, confirmation_method: 'manual' }
            : { automatic_payment_methods: { enabled: true } }),
          metadata: {
            items: JSON.stringify(items),
            ...(promoCode ? { promoCode } : {}),
            userId: userId || 'anonymous',
          },
        },
        { idempotencyKey } // Key for Stripe idempotency
      );
    } catch (stripeError: any) {
      // Handle specific Stripe errors
      const errorCode = stripeError.code || 'unknown_error';
      const errorMsg = ERROR_MESSAGES[errorCode] || stripeError.message || 'Error al crear intento de pago';
      
      logPayment('STRIPE_ERROR', { userId, items, error: stripeError });
      
      // Store failed attempt
      await prisma.paymentIntent.create({
        data: {
          stripeId: `failed_${idempotencyKey}`,
          status: 'failed',
          amount: amountCentavos,
          items: JSON.stringify(items),
          promoCode: promoCode || null,
          userId: userId || null,
          stripeCustomerId: stripeCustomerId || null,
          paymentMethodId: paymentMethodId || null,
          errorCode,
          errorMessage: errorMsg,
          metadata: JSON.stringify({ idempotencyKey }),
        },
      });
      
      throw new Error(errorMsg);
    }

    // Store payment intent in DB
    await prisma.paymentIntent.create({
      data: {
        stripeId: paymentIntent.id,
        status: paymentIntent.status,
        amount: amountCentavos,
        items: JSON.stringify(items),
        promoCode: promoCode || null,
        userId: userId || null,
        stripeCustomerId: stripeCustomerId || null,
        paymentMethodId: paymentMethodId || null,
        metadata: JSON.stringify({ idempotencyKey }),
      },
    });

    logPayment('CREATE_INTENT_SUCCESS', { userId, amount: amountCentavos, paymentIntentId: paymentIntent.id });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: finalAmount,
      subtotal: totalAmount,
      discountAmount,
    };
  } catch (error: any) {
    logPayment('CREATE_INTENT_ERROR', { userId, items, error });
    return {
      clientSecret: null,
      paymentIntentId: 'error',
      amount: 0,
      subtotal: 0,
      discountAmount: 0,
      error: error.message || 'Error al crear intento de pago',
    };
  }
}

async function applyPromo(subtotal: number, promoCode?: string): Promise<{ finalAmount: number; discountAmount: number }> {
  if (!promoCode) return { finalAmount: subtotal, discountAmount: 0 };
  
  const promo = await prisma.promoCode.findUnique({ where: { code: promoCode.toUpperCase() } });
  if (!promo || !promo.isActive) return { finalAmount: subtotal, discountAmount: 0 };
  if (promo.expiresAt && new Date() > promo.expiresAt) return { finalAmount: subtotal, discountAmount: 0 };
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return { finalAmount: subtotal, discountAmount: 0 };
  
  const discount = promo.type === 'PERCENTAGE'
    ? subtotal * (promo.discount / 100)
    : Math.min(promo.discount, subtotal);
  
  return { finalAmount: Math.max(subtotal - discount, 0), discountAmount: discount };
}

export function getUserFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || 'Error al procesar el pago. Por favor intenta de nuevo.';
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/paymentService.ts server/src/utils/paymentLogger.ts
git commit -m "feat: create payment service with logging and error handling

- PaymentService with idempotency and error recovery
- Detailed payment logging with context
- User-friendly error messages
- DB tracking of all payment attempts"
```

---

### Task 4: Refactorizar payments endpoint

**Archivos:**
- Modify: `server/src/routes/payments.ts`

- [ ] **Step 1: Reescribir endpoint /create-intent**

```typescript
// server/src/routes/payments.ts
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { createPaymentIntent, getUserFriendlyErrorMessage } from '../services/paymentService';

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/create-intent', paymentLimiter, async (req: Request, res: Response) => {
  const { items, promoCode, stripeCustomerId, paymentMethodId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items requeridos' });
  }

  const userId = (req as any).user?.id; // If using auth
  const idempotencyKey = req.headers['idempotency-key'] as string || `${userId || 'guest'}_${Date.now()}_${uuidv4()}`;

  const result = await createPaymentIntent({
    items,
    promoCode,
    stripeCustomerId,
    paymentMethodId,
    userId,
    idempotencyKey,
  });

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    clientSecret: result.clientSecret,
    paymentIntentId: result.paymentIntentId,
    amount: result.amount,
    subtotal: result.subtotal,
    discountAmount: result.discountAmount,
  });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/payments.ts
git commit -m "refactor: use PaymentService in create-intent endpoint

- Use createPaymentIntent service with full error handling
- Generate idempotency keys to prevent duplicates
- Return more context in response
- Proper error status codes and messages"
```

---

### Task 5: Implementar webhook handler

**Archivos:**
- Create: `server/src/routes/webhooks.ts`
- Create: `server/src/services/webhookService.ts`

- [ ] **Step 1: Crear webhook service**

```typescript
// server/src/services/webhookService.ts
import Stripe from 'stripe';
import { prisma } from '../db';
import { logPayment } from '../utils/paymentLogger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logPayment('WEBHOOK_PAYMENT_SUCCEEDED', { paymentIntentId: paymentIntent.id, amount: paymentIntent.amount });

  // Update PaymentIntent status
  await prisma.paymentIntent.update({
    where: { stripeId: paymentIntent.id },
    data: { status: 'succeeded' },
  });

  // Here you'd:
  // 1. Create Order record
  // 2. Deduct stock
  // 3. Send confirmation email
  // 4. Increment promo usage
}

export async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const error = paymentIntent.last_payment_error;
  const errorCode = error?.code || 'unknown';
  const errorMsg = error?.message || 'Payment failed';

  logPayment('WEBHOOK_PAYMENT_FAILED', { paymentIntentId: paymentIntent.id, error: { code: errorCode, message: errorMsg } });

  // Update PaymentIntent status
  await prisma.paymentIntent.update({
    where: { stripeId: paymentIntent.id },
    data: {
      status: 'failed',
      errorCode,
      errorMessage: errorMsg,
    },
  });
}

export async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  // If user exists in your system and wants to save payment method
  logPayment('WEBHOOK_PAYMENT_METHOD_ATTACHED', { paymentMethodId: paymentMethod.id });
}

export async function processWebhookEvent(event: Stripe.Event) {
  const eventId = event.id;
  const eventType = event.type;

  logPayment('WEBHOOK_RECEIVED', { eventId, type: eventType });

  try {
    // Check if already processed
    const existing = await prisma.paymentEvent.findUnique({ where: { eventId } });
    if (existing?.processed) {
      logPayment('WEBHOOK_ALREADY_PROCESSED', { eventId });
      return;
    }

    // Create event record
    const paymentEvent = await prisma.paymentEvent.create({
      data: {
        eventId,
        type: eventType,
        data: JSON.stringify(event.data),
      },
    });

    // Handle specific events
    switch (eventType) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;
    }

    // Mark as processed
    await prisma.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: { processed: true },
    });

    logPayment('WEBHOOK_PROCESSED', { eventId, type: eventType });
  } catch (error: any) {
    logPayment('WEBHOOK_ERROR', { eventId, type: eventType, error });
    throw error;
  }
}
```

- [ ] **Step 2: Crear webhook endpoint**

```typescript
// server/src/routes/webhooks.ts
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { processWebhookEvent } from '../services/webhookService';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig || !webhookSecret) {
    return res.status(400).send('Missing signature or webhook secret');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      webhookSecret
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    await processWebhookEvent(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
```

- [ ] **Step 3: Integrar webhook en main server**

En `server/src/index.ts` o donde esté la configuración de Express:

```typescript
import webhooksRouter from './routes/webhooks';

app.use('/webhooks', webhooksRouter);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/webhooks.ts server/src/services/webhookService.ts
git commit -m "feat: implement Stripe webhook handler

- Webhook endpoint for payment_intent events
- Event deduplication with DB tracking
- Handlers for succeeded, failed, payment method attached
- Detailed webhook logging
- Transaction-safe event processing"
```

---

### Task 6: Mejorar cliente Stripe con reintentos

**Archivos:**
- Create: `client/src/services/paymentRetry.ts`
- Modify: `client/src/components/StripePaymentForm.tsx`

- [ ] **Step 1: Crear retry service**

```typescript
// client/src/services/paymentRetry.ts
const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [1000, 3000, 5000], // ms
  retryableErrors: [
    'api_connection_error',
    'api_error',
    'rate_limit',
    'processing_error',
    'timeout',
  ],
};

export interface RetryableError extends Error {
  code?: string;
  retryable?: boolean;
}

function isRetryable(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.type;
  return RETRY_CONFIG.retryableErrors.includes(code);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (!isRetryable(error)) {
        throw error; // Don't retry non-retryable errors
      }

      if (attempt < maxRetries - 1) {
        const delay = RETRY_CONFIG.delays[attempt];
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export function getRetryableErrorMessage(error: any): string {
  if (!isRetryable(error)) {
    return error.message || 'Error al procesar el pago';
  }
  return `Error temporal. Reintentando... (${error.code || 'sin detalles'})`;
}
```

- [ ] **Step 2: Actualizar StripePaymentForm**

```typescript
// client/src/components/StripePaymentForm.tsx
import { useState } from 'react';
import {
  loadStripe,
  type StripeElementsOptions,
} from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';
import { retryWithBackoff, getRetryableErrorMessage } from '../services/paymentRetry';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Props {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PaymentFormInner({ amount, onSuccess, onError }: Omit<Props, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setRetryCount(0);

    try {
      await retryWithBackoff(async () => {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
        });

        if (error) {
          setRetryCount(prev => prev + 1);
          throw error;
        }

        // Handle cases requiring additional actions (3DS, etc)
        if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'requires_client_action') {
          // Stripe.js will handle redirect automatically with redirect: 'if_required'
          throw new Error('Se requiere autenticación adicional. Por favor, sigue los pasos en pantalla.');
        }

        if (paymentIntent?.status === 'succeeded') {
          onSuccess();
        }
      });
    } catch (error: any) {
      const errorMsg = getRetryableErrorMessage(error);
      console.error('Payment error:', error, `(attempt ${retryCount})`);
      onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-coffee-200 p-4 rounded-sm">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <div className="flex items-center gap-2 text-coffee-400 text-xs">
        <Lock className="w-3.5 h-3.5 text-gold-500 shrink-0" />
        Pago seguro procesado por Stripe. No almacenamos datos de tarjeta.
      </div>

      {retryCount > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-400 text-xs p-2">
          Reintentando... Intento {retryCount}/3
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? 'Procesando...' : `Pagar $${amount.toLocaleString('es-MX')} MXN`}
      </button>
    </form>
  );
}

export default function StripePaymentForm({ clientSecret, amount, onSuccess, onError }: Props) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'flat',
      variables: {
        colorPrimary: '#c9a96e',
        colorBackground: '#ffffff',
        colorText: '#1a0f0a',
        colorDanger: '#ef4444',
        fontFamily: 'Karla, system-ui, sans-serif',
        borderRadius: '0px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/services/paymentRetry.ts client/src/components/StripePaymentForm.tsx
git commit -m "feat: add automatic retry logic and improved error handling

- Exponential backoff retry service for transient errors
- User-friendly error messages
- Retry counter display during payment
- 3D Secure support with confirmPayment redirect
- Better logging for debugging"
```

---

### Task 7: Agregar idempotency key en cliente

**Archivos:**
- Modify: Componente que llama a `/create-intent`

- [ ] **Step 1: Crear hook para generar idempotency key**

```typescript
// client/src/hooks/useIdempotencyKey.ts
import { useCallback, useRef } from 'react';

export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null);

  const generate = useCallback((): string => {
    if (!keyRef.current) {
      const userId = localStorage.getItem('userId') || 'guest';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      keyRef.current = `${userId}_${timestamp}_${random}`;
    }
    return keyRef.current;
  }, []);

  const reset = useCallback(() => {
    keyRef.current = null;
  }, []);

  return { generate, reset };
}
```

- [ ] **Step 2: Usar en CartDrawer o checkout**

En el componente que llama a `POST /payments/create-intent`:

```typescript
const { generate: getIdempotencyKey, reset } = useIdempotencyKey();

const createPaymentIntent = async () => {
  try {
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': getIdempotencyKey(),
      },
      body: JSON.stringify({
        items: cartItems.map(item => ({ productId: item.product.id, quantity: item.quantity })),
        promoCode: promoCode,
        stripeCustomerId,
        paymentMethodId,
      }),
    });

    if (!response.ok) throw new Error('Failed to create payment intent');
    const data = await response.json();
    // ... rest of logic
  } catch (error) {
    // on retry, key is reused automatically
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useIdempotencyKey.ts
git commit -m "feat: add idempotency key generation for payment requests

- useIdempotencyKey hook for generating unique request IDs
- Send Idempotency-Key header with payment intents
- Prevents duplicate payment creation on network retry"
```

---

## FASE 3: PRUEBAS

### Task 8: Tests unitarios y de integración

**Archivos:**
- Create: `server/src/services/__tests__/paymentService.test.ts`
- Create: `client/src/services/__tests__/paymentRetry.test.ts`

- [ ] **Step 1: Test paymentService**

```typescript
// server/src/services/__tests__/paymentService.test.ts
import { createPaymentIntent } from '../paymentService';

describe('PaymentService', () => {
  it('crea payment intent exitosamente', async () => {
    const result = await createPaymentIntent({
      items: [{ productId: 'prod-1', quantity: 1 }],
      idempotencyKey: 'test-key-1',
    });

    expect(result.clientSecret).toBeDefined();
    expect(result.paymentIntentId).toBeDefined();
    expect(result.amount).toBeGreaterThan(0);
  });

  it('rechaza items vacíos', async () => {
    // Request sin items
    // Expect: error "Items requeridos"
  });

  it('rechaza stock insuficiente', async () => {
    // Request con producto con stock = 0
    // Expect: error "Stock insuficiente"
  });

  it('maneja errores de Stripe', async () => {
    // Mock Stripe error
    // Expect: user-friendly error message
  });

  it('almacena attempt en BD', async () => {
    // After createPaymentIntent
    // Check PaymentIntent table has record
  });
});
```

- [ ] **Step 2: Test retry service**

```typescript
// client/src/services/__tests__/paymentRetry.test.ts
import { retryWithBackoff, isRetryable } from '../paymentRetry';

describe('PaymentRetry', () => {
  it('reintenta errores retryables', async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 2) throw new Error('api_error');
      return 'success';
    });

    const result = await retryWithBackoff(fn, 3);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('no reintenta errores no-retryables', async () => {
    const fn = jest.fn(async () => {
      throw new Error('card_declined');
    });

    await expect(retryWithBackoff(fn, 3)).rejects.toThrow('card_declined');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respeta max retries', async () => {
    const fn = jest.fn(async () => {
      throw new Error('api_error');
    });

    await expect(retryWithBackoff(fn, 2)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Correr tests**

```bash
cd server
pnpm test paymentService.test.ts

cd ../client
pnpm test paymentRetry.test.ts
```

Expected: PASS all tests

- [ ] **Step 4: Commit tests**

```bash
git add server/src/services/__tests__/ client/src/services/__tests__/
git commit -m "test: add comprehensive payment service tests

- PaymentService creation and error handling
- Retry logic with exponential backoff
- Idempotency validation
- Edge cases: empty items, insufficient stock, network errors"
```

---

### Task 9: Manual testing y staging validation

**Documentación:**
- Create: `docs/PAYMENT_TESTING.md`

- [ ] **Step 1: Test stripe webhook locally**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded

# Check logs for successful processing
```

- [ ] **Step 2: Test payment flows**

```
HAPPY PATH:
✓ Create cart, checkout
✓ Create payment intent (check DB)
✓ Fill card form
✓ Submit payment
✓ Receive success
✓ Check PaymentIntent status = succeeded
✓ Webhook processed event
✓ Order created

ERROR PATHS:
✓ Insufficient stock → error message
✓ Card declined → specific error
✓ 3D Secure required → redirect → success
✓ Network timeout → auto retry → success
✓ Duplicate request (same idempotency key) → same PaymentIntent
✓ Rate limit → error message

EDGE CASES:
✓ Submit form twice quickly → only one payment
✓ Promo code applied correctly
✓ Minimum amount validation ($10 MXN)
✓ Multiple payment attempts with same key return same result
```

- [ ] **Step 3: Test webhook resiliency**

```bash
# Stop webhook processing midway
# Restart server
# Check that PaymentEvent.processed = false records get reprocessed
```

- [ ] **Step 4: Documentar testing guide**

Create `docs/PAYMENT_TESTING.md`:

```markdown
# Payment System Testing Guide

## Local Setup

1. Install Stripe CLI
2. Run: stripe listen --forward-to localhost:3000/webhooks/stripe
3. Run: stripe trigger payment_intent.succeeded
4. Check server logs for processing

## Test Cards

- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0025 0000 3155
- Insufficient funds: 4000 0000 0000 9995

## Database Checks

```sql
-- Check payment intents
SELECT id, stripeId, status, amount, createdAt FROM PaymentIntent LIMIT 10;

-- Check unprocessed webhooks
SELECT eventId, type, processed FROM PaymentEvent WHERE processed = false;

-- Check failures
SELECT * FROM PaymentIntent WHERE status = 'failed';
```

## Monitoring

Monitor `/logs` or cloud logs for patterns:
- `[PAYMENT ERROR]` — payment failures
- `[WEBHOOK ERROR]` — webhook processing failures
- `RATE_LIMIT` — too many requests
```

- [ ] **Step 5: Commit**

```bash
git add docs/PAYMENT_TESTING.md
git commit -m "docs: add payment system testing guide

- Stripe webhook local testing setup
- Test card numbers for different scenarios
- SQL queries for verification
- Monitoring and debugging tips"
```

---

### Task 10: Monitoring y observabilidad

**Archivos:**
- Create: `server/src/middleware/paymentMetrics.ts`

- [ ] **Step 1: Crear metrics middleware**

```typescript
// server/src/middleware/paymentMetrics.ts
interface PaymentMetrics {
  totalAttempts: number;
  successfulPayments: number;
  failedPayments: number;
  retryCount: number;
  averageResponseTime: number;
  errorsByCode: Record<string, number>;
}

let metrics: PaymentMetrics = {
  totalAttempts: 0,
  successfulPayments: 0,
  failedPayments: 0,
  retryCount: 0,
  averageResponseTime: 0,
  errorsByCode: {},
};

export function trackPaymentAttempt(status: 'succeeded' | 'failed', errorCode?: string, responseTime?: number) {
  metrics.totalAttempts++;

  if (status === 'succeeded') {
    metrics.successfulPayments++;
  } else {
    metrics.failedPayments++;
    if (errorCode) {
      metrics.errorsByCode[errorCode] = (metrics.errorsByCode[errorCode] || 0) + 1;
    }
  }

  if (responseTime) {
    metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;
  }
}

export function getMetrics() {
  return metrics;
}

export function getMetricsHandler(req: any, res: any) {
  const successRate = metrics.totalAttempts > 0 
    ? (metrics.successfulPayments / metrics.totalAttempts * 100).toFixed(2) 
    : 'N/A';

  res.json({
    metrics,
    successRate: `${successRate}%`,
    failureRate: `${(100 - parseFloat(successRate as string)).toFixed(2)}%`,
  });
}
```

- [ ] **Step 2: Integrar metrics en payment service**

```typescript
// En server/src/services/paymentService.ts
import { trackPaymentAttempt } from '../middleware/paymentMetrics';

// Después de procesar payment:
trackPaymentAttempt(result.error ? 'failed' : 'succeeded', result.errorCode, responseTime);
```

- [ ] **Step 3: Agregar endpoint para metrics**

En `server/src/routes/payments.ts`:

```typescript
router.get('/metrics', getMetricsHandler);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/paymentMetrics.ts
git commit -m "feat: add payment metrics and monitoring

- Track payment attempts, successes, failures
- Error breakdown by error code
- Response time tracking
- Metrics endpoint for monitoring"
```

---

## Success Criteria

- [ ] PaymentIntent se almacena en BD para cada intento
- [ ] Idempotency keys previenen duplicados en Stripe
- [ ] Webhook handler procesa payment_intent eventos
- [ ] PaymentEvent se almacena y marca como processed
- [ ] Reintentos automáticos funcionan en cliente
- [ ] Mensajes de error son user-friendly
- [ ] Logging detallado para debugging
- [ ] 3D Secure redirect maneja correctamente
- [ ] Tests pasan (unit + integration)
- [ ] Rate limiting funciona
- [ ] Stripe test cards funcionan en staging
- [ ] Métricas se capturan y reportan
- [ ] No hay pagos duplicados
- [ ] Transacciones son atómicas

**Plan complete and saved to `docs/superpowers/plans/2026-06-07-stripe-payments-hardening.md`.**
