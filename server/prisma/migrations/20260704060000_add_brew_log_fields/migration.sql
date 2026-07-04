-- AlterTable
ALTER TABLE "BrewLog" ADD COLUMN     "beanId" TEXT,
ADD COLUMN     "brewTime" INTEGER,
ADD COLUMN     "coffeeWeight" INTEGER,
ADD COLUMN     "equipmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "grindSize" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "waterTemp" INTEGER,
ADD COLUMN     "waterVolume" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BrewLog_beanId_idx" ON "BrewLog"("beanId");

-- AddForeignKey
ALTER TABLE "BrewLog" ADD CONSTRAINT "BrewLog_beanId_fkey" FOREIGN KEY ("beanId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
