-- Migration: add_email_verification_fields
-- Added to User model in email verification sprint but no migration was created.

BEGIN;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpires" TIMESTAMP(3);

COMMIT;
