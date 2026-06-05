-- AlterTable
ALTER TABLE "Product" ADD COLUMN "costPrice" REAL;
ALTER TABLE "Product" ADD COLUMN "minOrderQty" INTEGER DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;
ALTER TABLE "Product" ADD COLUMN "supplier" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "batchNumber" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "expiryDate" DATETIME;
ALTER TABLE "StockMovement" ADD COLUMN "supplier" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "unitCost" REAL;

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "method" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIA',
    "prepTime" INTEGER,
    "yield" TEXT,
    "temp" TEXT,
    "grind" TEXT,
    "ratio" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "duration" INTEGER,
    CONSTRAINT "RecipeStep_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");

-- CreateIndex
CREATE INDEX "Recipe_productId_idx" ON "Recipe"("productId");

-- CreateIndex
CREATE INDEX "Recipe_method_idx" ON "Recipe"("method");

-- CreateIndex
CREATE INDEX "Recipe_isPremium_idx" ON "Recipe"("isPremium");

-- CreateIndex
CREATE INDEX "RecipeStep_recipeId_idx" ON "RecipeStep"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeStep_recipeId_order_key" ON "RecipeStep"("recipeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

