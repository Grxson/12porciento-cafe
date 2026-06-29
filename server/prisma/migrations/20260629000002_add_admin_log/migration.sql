-- Migration: add_admin_log
-- AdminLog model: audit trail for admin actions

BEGIN;

CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_logs_adminId_idx" ON "admin_logs"("adminId");
CREATE INDEX "admin_logs_entity_idx" ON "admin_logs"("entity");
CREATE INDEX "admin_logs_action_idx" ON "admin_logs"("action");
CREATE INDEX "admin_logs_createdAt_idx" ON "admin_logs"("createdAt");

COMMIT;
