-- Migration: add_barista_identity
-- Deploy manually via: railway connect Postgres < deploy.sql
-- Or: railway run -- psql $DATABASE_URL -f deploy.sql

BEGIN;

-- AlterTable: BaristaProfile
ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "bio" VARCHAR(280);
ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;
ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "activeTitleId" TEXT;
ALTER TABLE "BaristaProfile" ADD COLUMN IF NOT EXISTS "flavorProfile" JSONB;

-- CreateTable: BaristaTitle
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

-- CreateTable: BaristaEquipment
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

-- AddForeignKey: BaristaEquipment -> User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BaristaEquipment_userId_fkey'
  ) THEN
    ALTER TABLE "BaristaEquipment" ADD CONSTRAINT "BaristaEquipment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Seed barista titles (10)
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

COMMIT;
