-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'D2C',
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "rfc" TEXT;

-- CreateTable
CREATE TABLE "B2BPriceTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2BPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "B2BPriceTier_productId_idx" ON "B2BPriceTier"("productId");

-- AddForeignKey
ALTER TABLE "B2BPriceTier" ADD CONSTRAINT "B2BPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
