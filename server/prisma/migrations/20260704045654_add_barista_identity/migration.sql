-- AlterTable
ALTER TABLE "BaristaProfile" ADD COLUMN "bio" VARCHAR(280);
ALTER TABLE "BaristaProfile" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "BaristaProfile" ADD COLUMN "activeTitleId" TEXT;
ALTER TABLE "BaristaProfile" ADD COLUMN "flavorProfile" JSONB;

-- CreateTable
CREATE TABLE "BaristaTitle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BaristaTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaristaTitle_slug_key" ON "BaristaTitle"("slug");

-- CreateTable
CREATE TABLE "BaristaEquipment" (
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

-- CreateIndex
CREATE INDEX "BaristaEquipment_userId_idx" ON "BaristaEquipment"("userId");

-- AddForeignKey
ALTER TABLE "BaristaEquipment" ADD CONSTRAINT "BaristaEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
