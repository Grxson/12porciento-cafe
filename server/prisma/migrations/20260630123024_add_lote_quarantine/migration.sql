-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPerKg" DOUBLE PRECISION,
    "unitCost" DOUBLE PRECISION,
    "supplier" TEXT,
    "origin" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CUARENTENA',
    "notes" TEXT,
    "humedad" DOUBLE PRECISION,
    "defectos" INTEGER,
    "scoreAroma" DOUBLE PRECISION,
    "scoreSabor" DOUBLE PRECISION,
    "scoreAcidez" DOUBLE PRECISION,
    "scoreBody" DOUBLE PRECISION,
    "scoreFinal" DOUBLE PRECISION,
    "evaluadoPor" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lote_batchNumber_key" ON "Lote"("batchNumber");

-- CreateIndex
CREATE INDEX "Lote_productId_idx" ON "Lote"("productId");

-- CreateIndex
CREATE INDEX "Lote_status_idx" ON "Lote"("status");

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
