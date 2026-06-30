-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "roastingCostPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "packagingCostPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overheadFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginRetailPct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "marginB2bPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "minAlertMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_productId_key" ON "PricingConfig"("productId");

-- AddForeignKey
ALTER TABLE "PricingConfig" ADD CONSTRAINT "PricingConfig_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
