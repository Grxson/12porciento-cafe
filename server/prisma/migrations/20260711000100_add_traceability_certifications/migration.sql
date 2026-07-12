-- Stable keys for idempotent catalog imports.
ALTER TABLE "Ubicacion" ADD COLUMN "slug" TEXT;
ALTER TABLE "Caficultor" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Ubicacion_slug_key" ON "Ubicacion"("slug");
CREATE UNIQUE INDEX "Caficultor_slug_key" ON "Caficultor"("slug");

-- Coffee is sold exclusively as whole bean. Normalize historical preferences
-- and enforce the policy for writes outside the application.
UPDATE "Subscription" SET "grindPreference" = 'GRANO'
WHERE "grindPreference" <> 'GRANO';
ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_grindPreference_whole_bean_check"
CHECK ("grindPreference" = 'GRANO');

-- Existing unresolvable lote references cannot satisfy the new foreign key.
UPDATE "ProductVersion"
SET "loteId" = NULL
WHERE "loteId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Lote" WHERE "Lote"."id" = "ProductVersion"."loteId");

CREATE INDEX "ProductVersion_loteId_idx" ON "ProductVersion"("loteId");
ALTER TABLE "ProductVersion"
ADD CONSTRAINT "ProductVersion_loteId_fkey"
FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TraceabilityEvent" (
  "id" TEXT NOT NULL,
  "loteId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "source" TEXT,
  "isDemo" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TraceabilityEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TraceabilityEvent_loteId_eventType_occurredAt_key"
ON "TraceabilityEvent"("loteId", "eventType", "occurredAt");
CREATE INDEX "TraceabilityEvent_loteId_sortOrder_idx" ON "TraceabilityEvent"("loteId", "sortOrder");
CREATE INDEX "TraceabilityEvent_occurredAt_idx" ON "TraceabilityEvent"("occurredAt");
ALTER TABLE "TraceabilityEvent"
ADD CONSTRAINT "TraceabilityEvent_loteId_fkey"
FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Certification" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "description" TEXT,
  "websiteUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Certification_slug_key" ON "Certification"("slug");

CREATE TABLE "ProductCertification" (
  "productId" TEXT NOT NULL,
  "certificationId" TEXT NOT NULL,
  "certificateId" TEXT,
  "evidenceUrl" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCertification_pkey" PRIMARY KEY ("productId", "certificationId")
);

CREATE INDEX "ProductCertification_certificationId_idx" ON "ProductCertification"("certificationId");
CREATE INDEX "ProductCertification_isVerified_idx" ON "ProductCertification"("isVerified");
ALTER TABLE "ProductCertification"
ADD CONSTRAINT "ProductCertification_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCertification"
ADD CONSTRAINT "ProductCertification_certificationId_fkey"
FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
