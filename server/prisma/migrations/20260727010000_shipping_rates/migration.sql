-- Per-state shipping rate table (Fase 3 of billing hardening plan).
-- 'DEFAULT' row is the fallback rate used when checkout's state input
-- doesn't match a configured state. Cost is a placeholder — admin must
-- review/edit real per-state rates before going live.

CREATE TABLE "ShippingRate" (
    "id"            TEXT NOT NULL,
    "state"         TEXT NOT NULL,
    "cost"          DOUBLE PRECISION NOT NULL,
    "estimatedDays" TEXT NOT NULL DEFAULT '3-5 días hábiles',
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShippingRate_state_key" ON "ShippingRate"("state");

-- Placeholder fallback rate — REVIEW BEFORE PRODUCTION.
INSERT INTO "ShippingRate" ("id", "state", "cost", "estimatedDays", "isActive", "updatedAt")
VALUES ('shprate_default_seed', 'DEFAULT', 99, '3-5 días hábiles', true, CURRENT_TIMESTAMP);
