-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "ubicacionId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "caficultorId" TEXT;

-- CreateTable
CREATE TABLE "TipoCata" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoCata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ubicacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "estado" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CaficultorTiposCata" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoCata_nombre_key" ON "TipoCata"("nombre");

-- CreateIndex
CREATE INDEX "TipoCata_nombre_idx" ON "TipoCata"("nombre");

-- CreateIndex
CREATE INDEX "TipoCata_categoria_idx" ON "TipoCata"("categoria");

-- CreateIndex
CREATE INDEX "Ubicacion_nombre_idx" ON "Ubicacion"("nombre");

-- CreateIndex
CREATE INDEX "Ubicacion_pais_estado_idx" ON "Ubicacion"("pais", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "_CaficultorTiposCata_AB_unique" ON "_CaficultorTiposCata"("A", "B");

-- CreateIndex
CREATE INDEX "_CaficultorTiposCata_B_index" ON "_CaficultorTiposCata"("B");

-- CreateIndex
CREATE INDEX "Lote_caficultorId_idx" ON "Lote"("caficultorId");

-- CreateIndex
CREATE INDEX "Lote_supplier_idx" ON "Lote"("supplier");

-- CreateIndex
CREATE INDEX "Lote_ubicacionId_idx" ON "Lote"("ubicacionId");

-- CreateIndex
CREATE INDEX "Product_caficultorId_idx" ON "Product"("caficultorId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_caficultorId_fkey" FOREIGN KEY ("caficultorId") REFERENCES "Caficultor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CaficultorTiposCata" ADD CONSTRAINT "_CaficultorTiposCata_A_fkey" FOREIGN KEY ("A") REFERENCES "Caficultor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CaficultorTiposCata" ADD CONSTRAINT "_CaficultorTiposCata_B_fkey" FOREIGN KEY ("B") REFERENCES "TipoCata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
