-- Deploy all 3 barista migrations at once
-- Usage: railway connect Postgres < deploy-all.sql

BEGIN;

-- ============================================================
-- Migration 1: add_barista_identity
-- ============================================================

ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "bio" VARCHAR(280);
ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;
ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "activeTitleId" TEXT;
ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "flavorProfile" JSONB;

CREATE TABLE IF NOT EXISTS "BaristaTitle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BaristaTitle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BaristaTitle_slug_key" ON "BaristaTitle"("slug");

CREATE TABLE IF NOT EXISTS "BaristaEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "photoUrl" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BaristaEquipment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BaristaEquipment_userId_idx" ON "BaristaEquipment"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BaristaEquipment_userId_fkey'
  ) THEN
    ALTER TABLE "BaristaEquipment" ADD CONSTRAINT "BaristaEquipment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed barista titles (safe: ON CONFLICT DO NOTHING)
INSERT INTO "BaristaTitle" ("id", "slug", "name", "description", "icon", "requirement")
VALUES
  (gen_random_uuid()::text, 'v60_master', 'Maestro V60', '5 brews con V60', '▽', 'v60_5'),
  (gen_random_uuid()::text, 'aeropress_master', 'Maestro AeroPress', '5 brews con AeroPress', '⊕', 'aeropress_5'),
  (gen_random_uuid()::text, 'espresso_master', 'Maestro Espresso', '5 brews con Espresso', '☕', 'espresso_5'),
  (gen_random_uuid()::text, 'early_riser', 'Madrugador', '5 brews antes de las 8am', '🌅', 'early_bird'),
  (gen_random_uuid()::text, 'night_owl_title', 'Búho Nocturno', '5 brews después de las 9pm', '🌙', 'night_owl'),
  (gen_random_uuid()::text, 'weekend_warrior_title', 'Guerrero Fin de Semana', '10 brews en fines de semana', '⚔️', 'weekend_warrior'),
  (gen_random_uuid()::text, 'method_collector_title', 'Coleccionista', '3 métodos con 5+ brews', '🎯', 'method_collector'),
  (gen_random_uuid()::text, 'coffee_connoisseur_title', 'Connoisseur', '50 brews registrados', '🎓', 'coffee_connoisseur'),
  (gen_random_uuid()::text, 'perfect_streak_title', 'Imparable', '30 días seguidos', '🔥', 'perfect_streak_30'),
  (gen_random_uuid()::text, 'brew_perfect_title', 'Perfeccionista', 'Brew 10/10', '⭐', 'perfect_brew')
ON CONFLICT ("slug") DO NOTHING;

-- ============================================================
-- Migration 2: add_brew_log_fields
-- ============================================================

ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "grindSize" TEXT;
ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "waterTemp" INTEGER;
ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "brewTime" INTEGER;
ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "coffeeWeight" INTEGER;
ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "waterVolume" INTEGER;
ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "beanId" TEXT;
ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "equipmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BrewLog" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "BrewLog_beanId_idx" ON "BrewLog"("beanId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BrewLog_beanId_fkey'
  ) THEN
    ALTER TABLE "BrewLog" ADD CONSTRAINT "BrewLog_beanId_fkey"
      FOREIGN KEY ("beanId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- Migration 3: add_rewards
-- ============================================================

CREATE TABLE IF NOT EXISTS "Reward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🎁',
    "xpCost" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 10,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RewardClaim" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Reward_isActive_idx" ON "Reward"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardClaim_code_key" ON "RewardClaim"("code");
CREATE INDEX IF NOT EXISTS "RewardClaim_userId_idx" ON "RewardClaim"("userId");
CREATE INDEX IF NOT EXISTS "RewardClaim_code_idx" ON "RewardClaim"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardClaim_rewardId_userId_key" ON "RewardClaim"("rewardId", "userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RewardClaim_rewardId_fkey'
  ) THEN
    ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_rewardId_fkey"
      FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RewardClaim_userId_fkey'
  ) THEN
    ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
