-- Separate payment state from fulfillment state on Order, and add a
-- Stripe webhook event log for idempotency/audit (see Fase 1 of the
-- billing hardening plan).

ALTER TABLE "Order"
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "paymentFailureReason" TEXT,
ADD COLUMN "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'mxn';

-- Backfill: every existing Order row was created only after Stripe confirmed
-- payment_intent.succeeded (see orders.ts), so it was PAID at creation time —
-- except rows the refund webhook had previously flagged by overloading
-- `status = 'REFUNDED'` (that column was never a valid fulfillment state).
UPDATE "Order" SET "paymentStatus" = 'REFUNDED', "status" = 'CANCELLED' WHERE "status" = 'REFUNDED';
UPDATE "Order" SET "paymentStatus" = 'PAID', "paidAt" = "createdAt" WHERE "paymentStatus" = 'PENDING';

CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "errorMessage" TEXT,
    "payloadHash" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");
CREATE INDEX "StripeWebhookEvent_eventType_idx" ON "StripeWebhookEvent"("eventType");
CREATE INDEX "StripeWebhookEvent_status_idx" ON "StripeWebhookEvent"("status");
