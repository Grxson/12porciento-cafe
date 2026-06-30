-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "caficultorId" TEXT;

-- CreateTable
CREATE TABLE "Caficultor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "altitud" INTEGER,
    "variedad" TEXT,
    "foto" TEXT,
    "contacto" TEXT,
    "bio" TEXT,
    "acuerdoPrecioKg" DOUBLE PRECISION,
    "modalidad" TEXT NOT NULL DEFAULT 'DIRECTO',
    "fairTrade" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caficultor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_caficultorId_fkey" FOREIGN KEY ("caficultorId") REFERENCES "Caficultor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
