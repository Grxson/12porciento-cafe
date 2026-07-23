-- CreateNotification: user-to-user activity notifications (follow, like, achievement)
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateNotification indexes
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- Add FK to User (table is "User" in Prisma)
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- CreateUserNotificationPreference: per-user notification opt-out
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateUserNotificationPreference indexes and constraints
CREATE UNIQUE INDEX "user_notification_preferences_userId_type_idx" ON "user_notification_preferences"("userId", "type");
CREATE INDEX "user_notification_preferences_userId_idx" ON "user_notification_preferences"("userId");

-- Add FK to User (table is "User" in Prisma)
ALTER TABLE "user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"
    ON DELETE CASCADE
    ON UPDATE CASCADE;
