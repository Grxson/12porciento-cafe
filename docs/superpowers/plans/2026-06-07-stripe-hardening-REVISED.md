# Stripe Hardening — REVISED (reality-based)

> Supersedes `2026-06-07-stripe-payments-hardening.md`. The original assumed no webhook / no order creation / no idempotency. Reality: `server/src/routes/webhook.ts` already creates orders with `paymentIntentId` dedup; `POST /orders` is the primary creation path. This plan fixes the ACTUAL bugs.

**Goal:** Eliminate intermittent checkout failures and improve payment observability without adding redundant tables or a duplicate webhook.

## The 6 real bugs

1. 🔴 **Double-order race → false error.** Frontend `POST /orders` and webhook both create orders; dedup only via unique `paymentIntentId`. If webhook wins, frontend create throws P2002 → user sees "pago procesado pero no registramos pedido" though order exists.
2. 🔴 **`POST /orders` not idempotent** — verifies intent succeeded but never checks for an existing order with that `paymentIntentId`.
3. 🔴 **Webhook fallback orders incomplete** — `create-intent` metadata lacks customer/shipping, so webhook orders get `'Cliente'`/empty.
4. 🟡 **No `payment_intent.payment_failed` logging** — zero failure visibility.
5. 🟡 **No idempotency key** on `create-intent` — double-click → duplicate PaymentIntents.
6. 🟡 **Order + stock not atomic** — partial failure leaves inconsistent stock.

## Tasks

### S1 — create-intent: complete metadata + idempotency key (`payments.ts`, `Checkout.tsx`, client `api/index.ts`)
- payments.ts: accept optional `customer` fields (customerName, email, phone, address, city, state, zipCode, notes) + `userId`; store them in PaymentIntent metadata (respect Stripe 500-char/value, 50-key limits). Generate idempotency key with `crypto.randomUUID()` if client doesn't send `Idempotency-Key` header; pass to `stripe.paymentIntents.create(..., { idempotencyKey })`.
- Checkout.tsx: send the shipping/customer `form` fields to `createIntent` so metadata is complete for the webhook fallback.
- client api: extend `createIntent` payload type.

### S2 — `POST /orders` idempotent + atomic (`orders.ts`)
- Before creating: if `paymentIntentId` provided, `findUnique({ paymentIntentId })`; if found, return it (200) instead of creating/erroring.
- Wrap order.create + stock decrement + stockMovement in `prisma.$transaction`.
- On P2002 (race lost), fetch and return the existing order gracefully (200), not 500.

### S3 — webhook: atomic + payment_failed logging (`webhook.ts`)
- Wrap fallback order.create + stock decrement in `prisma.$transaction`.
- Add `payment_intent.payment_failed` handler: log id, amount, `last_payment_error.code/message`. (No new table — structured console.error is enough for now.)
- Keep existing succeeded path + P2002 handling.

### S4 — client resilience (`StripePaymentForm.tsx`, `paymentRetry.ts`, Checkout idempotency header)
- Add `paymentRetry.ts` with exponential backoff for transient errors only (api_connection_error, processing_error, rate_limit).
- Map Stripe error codes → friendly Spanish messages.
- Send a stable `Idempotency-Key` header from Checkout for the create-intent call (reuse across retries of the same checkout attempt).

### S5 — tests + verification
- Set up Vitest for server (mirror client setup).
- Unit-test the pure bits: idempotency-key fallback, metadata builder, error-code→message map, retry predicate.
- Mock Prisma + Stripe for an `/orders` idempotency test (existing order short-circuits).
- `pnpm run build` (client + server) green; manual checkout smoke if possible.

## Out of scope (intentionally dropped from original)
- `PaymentIntent` / `PaymentEvent` tables — redundant with `order.paymentIntentId`.
- New `/webhooks/stripe` route — already exists at `/api/webhooks/stripe`.
- Full payment service rewrite.
