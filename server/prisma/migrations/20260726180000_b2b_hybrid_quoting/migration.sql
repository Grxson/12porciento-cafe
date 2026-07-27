-- Product-level B2B publication controls. Existing products with configured
-- tiers remain visible after deployment; all other products stay opt-in.
ALTER TABLE "Product"
ADD COLUMN "isB2BEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "b2bPriority" INTEGER NOT NULL DEFAULT 0;

UPDATE "Product"
SET "isB2BEnabled" = true
WHERE EXISTS (
  SELECT 1
  FROM "B2BPriceTier"
  WHERE "B2BPriceTier"."productId" = "Product"."id"
);

-- Companies are promoted from won inquiries, never created by public input.
CREATE TABLE "B2BCompany" (
  "id" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "tradeName" TEXT,
  "rfc" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "paymentTerms" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "B2BCompany_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "B2BCompany_rfc_key" ON "B2BCompany"("rfc");
CREATE INDEX "B2BCompany_businessName_idx" ON "B2BCompany"("businessName");
CREATE INDEX "B2BCompany_contactEmail_idx" ON "B2BCompany"("contactEmail");

-- Turn the legacy lead record into a commercial pipeline.
ALTER TABLE "B2BInquiry"
ADD COLUMN "folio" TEXT,
ADD COLUMN "requestId" TEXT,
ADD COLUMN "businessType" TEXT,
ADD COLUMN "frequency" TEXT,
ADD COLUMN "estimatedSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MXN',
ADD COLUMN "assignedAdminId" TEXT,
ADD COLUMN "nextAction" TEXT,
ADD COLUMN "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN "lostReason" TEXT,
ADD COLUMN "companyId" TEXT,
ADD COLUMN "orderId" TEXT;

UPDATE "B2BInquiry"
SET
  "folio" = CONCAT('B2B-LEGACY-', UPPER(SUBSTRING("id", 1, 8))),
  "status" = CASE
    WHEN "status" = 'CONTACTED' THEN 'REVIEWING'
    WHEN "status" = 'RESOLVED' THEN 'WON'
    ELSE 'NEW'
  END
WHERE "folio" IS NULL;

ALTER TABLE "B2BInquiry" ALTER COLUMN "folio" SET NOT NULL;

CREATE UNIQUE INDEX "B2BInquiry_folio_key" ON "B2BInquiry"("folio");
CREATE UNIQUE INDEX "B2BInquiry_requestId_key" ON "B2BInquiry"("requestId");
CREATE UNIQUE INDEX "B2BInquiry_orderId_key" ON "B2BInquiry"("orderId");
CREATE INDEX "B2BInquiry_assignedAdminId_idx" ON "B2BInquiry"("assignedAdminId");
CREATE INDEX "B2BInquiry_companyId_idx" ON "B2BInquiry"("companyId");
CREATE INDEX "B2BInquiry_createdAt_idx" ON "B2BInquiry"("createdAt");

ALTER TABLE "B2BInquiry"
ADD CONSTRAINT "B2BInquiry_assignedAdminId_fkey"
FOREIGN KEY ("assignedAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2BInquiry"
ADD CONSTRAINT "B2BInquiry_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "B2BCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2BInquiry"
ADD CONSTRAINT "B2BInquiry_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Immutable product snapshots submitted by the buyer.
CREATE TABLE "B2BInquiryItem" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL,
  "frequency" TEXT NOT NULL,
  "tierId" TEXT,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "B2BInquiryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "B2BInquiryItem_inquiryId_idx" ON "B2BInquiryItem"("inquiryId");
CREATE INDEX "B2BInquiryItem_productId_idx" ON "B2BInquiryItem"("productId");
ALTER TABLE "B2BInquiryItem"
ADD CONSTRAINT "B2BInquiryItem_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "B2BInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BInquiryItem"
ADD CONSTRAINT "B2BInquiryItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only commercial timeline.
CREATE TABLE "B2BActivity" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "adminId" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "B2BActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "B2BActivity_inquiryId_createdAt_idx" ON "B2BActivity"("inquiryId", "createdAt");
CREATE INDEX "B2BActivity_adminId_idx" ON "B2BActivity"("adminId");
ALTER TABLE "B2BActivity"
ADD CONSTRAINT "B2BActivity_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "B2BInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BActivity"
ADD CONSTRAINT "B2BActivity_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Versioned commercial quotes.
CREATE TABLE "B2BQuote" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "subtotal" DOUBLE PRECISION NOT NULL,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "validUntil" TIMESTAMP(3) NOT NULL,
  "paymentTerms" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "B2BQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "B2BQuote_inquiryId_version_key" ON "B2BQuote"("inquiryId", "version");
CREATE INDEX "B2BQuote_inquiryId_status_idx" ON "B2BQuote"("inquiryId", "status");
CREATE INDEX "B2BQuote_createdById_idx" ON "B2BQuote"("createdById");
ALTER TABLE "B2BQuote"
ADD CONSTRAINT "B2BQuote_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "B2BInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BQuote"
ADD CONSTRAINT "B2BQuote_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "B2BQuoteItem" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "B2BQuoteItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "B2BQuoteItem_quoteId_idx" ON "B2BQuoteItem"("quoteId");
CREATE INDEX "B2BQuoteItem_productId_idx" ON "B2BQuoteItem"("productId");
ALTER TABLE "B2BQuoteItem"
ADD CONSTRAINT "B2BQuoteItem_quoteId_fkey"
FOREIGN KEY ("quoteId") REFERENCES "B2BQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BQuoteItem"
ADD CONSTRAINT "B2BQuoteItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link negotiated quotes and promoted companies to real B2B orders.
ALTER TABLE "Order"
ADD COLUMN "b2bCompanyId" TEXT,
ADD COLUMN "sourceQuoteId" TEXT;

CREATE UNIQUE INDEX "Order_sourceQuoteId_key" ON "Order"("sourceQuoteId");
CREATE INDEX "Order_b2bCompanyId_idx" ON "Order"("b2bCompanyId");
CREATE INDEX "Order_orderType_idx" ON "Order"("orderType");
ALTER TABLE "Order"
ADD CONSTRAINT "Order_b2bCompanyId_fkey"
FOREIGN KEY ("b2bCompanyId") REFERENCES "B2BCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order"
ADD CONSTRAINT "Order_sourceQuoteId_fkey"
FOREIGN KEY ("sourceQuoteId") REFERENCES "B2BQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
