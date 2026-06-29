-- Migration: add_order_tracking_fields
-- Added trackingNumber, carrier, estimatedDelivery to Order model
-- These fields were added to schema.prisma but no migration was created

BEGIN;

ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "carrier" TEXT;
ALTER TABLE "Order" ADD COLUMN "estimatedDelivery" TIMESTAMP(3);

COMMIT;
