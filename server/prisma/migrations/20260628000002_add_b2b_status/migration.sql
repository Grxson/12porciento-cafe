-- AlterTable
ALTER TABLE "B2BInquiry" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "B2BInquiry_status_idx" ON "B2BInquiry"("status");
