-- 12% Brew — domain additions.
-- Adds BrewMethod, BrewSession, BrewSessionFavorite, WaterProfile tables,
-- plus structured fields on Recipe / RecipeStep. All new fields are nullable
-- or have safe defaults so existing rows remain valid.

-- ─── Enums ──────────────────────────────────────────────────────────────
CREATE TYPE "BrewMethodCategory" AS ENUM ('POUR_OVER', 'IMMERSION', 'PRESSURE', 'STOVETOP', 'COLD', 'TRADITIONAL', 'EVALUATION');
CREATE TYPE "BrewRecipeProfile" AS ENUM ('BALANCED', 'SWEET', 'BRIGHT', 'FRUITY', 'FLORAL', 'FULL_BODY', 'CLEAN', 'INTENSE', 'REFRESHING', 'EXPERIMENTAL');
CREATE TYPE "BrewRecipeType" AS ENUM ('OFFICIAL_12_PERCENT', 'CREATOR', 'BARISTA', 'COMPETITION', 'COMMUNITY', 'PERSONAL');
CREATE TYPE "BrewStepType" AS ENUM ('PREPARE', 'RINSE', 'ADD_COFFEE', 'BLOOM', 'POUR', 'WAIT', 'STIR', 'SWIRL', 'PRESS', 'REMOVE_HEAT', 'COOL', 'SERVE', 'CUSTOM');
CREATE TYPE "BrewStepAction" AS ENUM ('ADD', 'POUR', 'WAIT', 'STIR', 'SWIRL', 'TAP', 'PRESS', 'BREATHE', 'CUSTOM');
CREATE TYPE "PourPattern" AS ENUM ('CENTER', 'CIRCULAR', 'SPIRAL_OUT', 'SPIRAL_IN', 'CENTER_TO_OUT', 'OUT_TO_CENTER', 'PULSE', 'CUSTOM');
CREATE TYPE "BrewSessionStatus" AS ENUM ('IDLE', 'PREPARING', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BrewSessionResult" AS ENUM ('SOUR', 'BITTER', 'WATERY', 'STRONG', 'ASTRINGENT', 'UNDEREXTRACTED', 'OVEREXTRACTED', 'BALANCED', 'GOOD', 'EXCELLENT');

-- ─── New tables ─────────────────────────────────────────────────────────
CREATE TABLE "brew_methods" (
    "id"                    TEXT NOT NULL,
    "slug"                  TEXT NOT NULL,
    "name"                  TEXT NOT NULL,
    "description"           TEXT,
    "shortDescription"      TEXT,
    "category"              "BrewMethodCategory" NOT NULL,
    "icon"                  TEXT,
    "image"                 TEXT,
    "difficulty"            TEXT NOT NULL DEFAULT 'MEDIA',
    "defaultRatioMin"       DOUBLE PRECISION NOT NULL DEFAULT 13,
    "defaultRatioMax"       DOUBLE PRECISION NOT NULL DEFAULT 18,
    "defaultTemperatureMin" INTEGER NOT NULL DEFAULT 88,
    "defaultTemperatureMax" INTEGER NOT NULL DEFAULT 96,
    "defaultGrindMin"       INTEGER,
    "defaultGrindMax"       INTEGER,
    "active"                BOOLEAN NOT NULL DEFAULT true,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brew_methods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brew_methods_slug_key" ON "brew_methods"("slug");
CREATE INDEX "brew_methods_category_idx" ON "brew_methods"("category");
CREATE INDEX "brew_methods_active_idx" ON "brew_methods"("active");

CREATE TABLE "brew_sessions" (
    "id"                 TEXT NOT NULL,
    "userId"             TEXT NOT NULL,
    "coffeeId"           TEXT,
    "recipeId"           TEXT,
    "brewMethodId"       TEXT,
    "recipeSnapshot"     JSONB,
    "coffeeDoseGrams"    DOUBLE PRECISION,
    "waterGrams"         DOUBLE PRECISION,
    "ratio"              DOUBLE PRECISION,
    "temperatureCelsius" INTEGER,
    "grindSetting"       TEXT,
    "grindMicrons"       INTEGER,
    "brewTimeSeconds"    INTEGER,
    "equipmentSnapshot"  JSONB,
    "rating"             INTEGER,
    "notes"              TEXT,
    "sweetnessRating"    INTEGER,
    "acidityRating"      INTEGER,
    "bodyRating"         INTEGER,
    "clarityRating"      INTEGER,
    "result"             "BrewSessionResult",
    "status"             "BrewSessionStatus" NOT NULL DEFAULT 'IDLE',
    "startedAt"          TIMESTAMP(3),
    "completedAt"        TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brew_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "brew_sessions_userId_createdAt_idx" ON "brew_sessions"("userId", "createdAt");
CREATE INDEX "brew_sessions_recipeId_idx" ON "brew_sessions"("recipeId");
CREATE INDEX "brew_sessions_coffeeId_idx" ON "brew_sessions"("coffeeId");
CREATE INDEX "brew_sessions_brewMethodId_idx" ON "brew_sessions"("brewMethodId");
CREATE INDEX "brew_sessions_status_idx" ON "brew_sessions"("status");

CREATE TABLE "brew_session_favorites" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brew_session_favorites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brew_session_favorites_userId_sessionId_key" ON "brew_session_favorites"("userId", "sessionId");
CREATE INDEX "brew_session_favorites_userId_idx" ON "brew_session_favorites"("userId");
CREATE INDEX "brew_session_favorites_sessionId_idx" ON "brew_session_favorites"("sessionId");

CREATE TABLE "water_profiles" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT,
    "name"        TEXT NOT NULL,
    "tds"         DOUBLE PRECISION,
    "gh"          DOUBLE PRECISION,
    "kh"          DOUBLE PRECISION,
    "calcium"     DOUBLE PRECISION,
    "magnesium"   DOUBLE PRECISION,
    "sodium"      DOUBLE PRECISION,
    "description" TEXT,
    "official"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "water_profiles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "water_profiles_userId_idx" ON "water_profiles"("userId");
CREATE INDEX "water_profiles_official_idx" ON "water_profiles"("official");

-- ─── Recipe: structured brew fields ────────────────────────────────────
ALTER TABLE "Recipe"
    ADD COLUMN "brewMethodId"             TEXT,
    ADD COLUMN "coffeeDoseGrams"          DOUBLE PRECISION,
    ADD COLUMN "waterGrams"               DOUBLE PRECISION,
    ADD COLUMN "waterTemperatureCelsius"  INTEGER,
    ADD COLUMN "grindTargetMicrons"       INTEGER,
    ADD COLUMN "profile"                  "BrewRecipeProfile",
    ADD COLUMN "recipeType"               "BrewRecipeType" NOT NULL DEFAULT 'OFFICIAL_12_PERCENT',
    ADD COLUMN "featured"                 BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "official"                 BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "parentRecipeId"           TEXT;
CREATE INDEX "Recipe_brewMethodId_idx"    ON "Recipe"("brewMethodId");
CREATE INDEX "Recipe_profile_idx"         ON "Recipe"("profile");
CREATE INDEX "Recipe_recipeType_idx"      ON "Recipe"("recipeType");
CREATE INDEX "Recipe_official_idx"        ON "Recipe"("official");
CREATE INDEX "Recipe_featured_idx"        ON "Recipe"("featured");
CREATE INDEX "Recipe_parentRecipeId_idx"  ON "Recipe"("parentRecipeId");

-- ─── RecipeStep: structured step fields ─────────────────────────────────
ALTER TABLE "RecipeStep"
    ADD COLUMN "type"                     "BrewStepType" NOT NULL DEFAULT 'CUSTOM',
    ADD COLUMN "startTimeSeconds"         INTEGER,
    ADD COLUMN "waterAmountGrams"         DOUBLE PRECISION,
    ADD COLUMN "targetTotalWaterGrams"    DOUBLE PRECISION,
    ADD COLUMN "action"                   "BrewStepAction",
    ADD COLUMN "pourPattern"              "PourPattern",
    ADD COLUMN "flowRateGramsPerSecond"   DOUBLE PRECISION,
    ADD COLUMN "temperatureCelsius"       INTEGER,
    ADD COLUMN "instruction"              TEXT,
    ADD COLUMN "optional"                 BOOLEAN NOT NULL DEFAULT false;

-- ─── Foreign keys ───────────────────────────────────────────────────────
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_brewMethodId_fkey"
    FOREIGN KEY ("brewMethodId") REFERENCES "brew_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_parentRecipeId_fkey"
    FOREIGN KEY ("parentRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "brew_sessions" ADD CONSTRAINT "brew_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brew_sessions" ADD CONSTRAINT "brew_sessions_coffeeId_fkey"
    FOREIGN KEY ("coffeeId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "brew_sessions" ADD CONSTRAINT "brew_sessions_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "brew_sessions" ADD CONSTRAINT "brew_sessions_brewMethodId_fkey"
    FOREIGN KEY ("brewMethodId") REFERENCES "brew_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "brew_session_favorites" ADD CONSTRAINT "brew_session_favorites_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brew_session_favorites" ADD CONSTRAINT "brew_session_favorites_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "brew_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "water_profiles" ADD CONSTRAINT "water_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
