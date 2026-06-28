-- AlterTable
ALTER TABLE "Product" ADD COLUMN "producer" TEXT;
ALTER TABLE "Product" ADD COLUMN "farmName" TEXT;
ALTER TABLE "Product" ADD COLUMN "harvestYear" INTEGER;
ALTER TABLE "Product" ADD COLUMN "certifications" TEXT;
ALTER TABLE "Product" ADD COLUMN "body" TEXT;
ALTER TABLE "Product" ADD COLUMN "acidity" TEXT;
ALTER TABLE "Product" ADD COLUMN "processingDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "recommendedBrewMethod" TEXT;
ALTER TABLE "Product" ADD COLUMN "brewTemperature" INTEGER;
ALTER TABLE "Product" ADD COLUMN "brewRatio" TEXT;
ALTER TABLE "Product" ADD COLUMN "grindSize" TEXT;
ALTER TABLE "Product" ADD COLUMN "tastingNotes" TEXT;
ALTER TABLE "Product" ADD COLUMN "pairingSuggestions" TEXT;
ALTER TABLE "Product" ADD COLUMN "isMemberExclusive" BOOLEAN NOT NULL DEFAULT false;
