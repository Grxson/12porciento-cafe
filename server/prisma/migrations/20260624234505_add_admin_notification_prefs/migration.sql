-- CreateTable
CREATE TABLE "admin_notification_preferences" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_notification_preferences_adminId_eventType_key" ON "admin_notification_preferences"("adminId", "eventType");
