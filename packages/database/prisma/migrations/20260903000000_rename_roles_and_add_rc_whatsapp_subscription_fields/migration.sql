-- Migration: rename user roles to FactoryOwner/TruckDriver terminology, and
-- add explicit RC verification, WhatsApp trigger status, and subscription
-- auto-renew fields.
--
-- Safety notes:
--  * The UserRole enum values are renamed in place (`load_owner` ->
--    `factory_owner`, `truck_owner` -> `truck_driver`) via
--    ALTER TYPE ... RENAME VALUE, which is a metadata-only change — no data
--    rewrite, no downtime, and every existing `users.role` value keeps
--    pointing at the same logical role.
--  * Column names (`load_owner_id` / `truck_owner_id` on `bookings`) are left
--    as-is; only the Prisma model field names changed (factoryOwnerId /
--    truckDriverId), so no column rename or backfill is required there.
--  * All other changes are strictly additive (new nullable/defaulted
--    columns, a new enum, new indexes) — fully backward compatible with the
--    currently deployed API.

-- RenameEnumValue
ALTER TYPE "UserRole" RENAME VALUE 'load_owner' TO 'factory_owner';
ALTER TYPE "UserRole" RENAME VALUE 'truck_owner' TO 'truck_driver';

-- CreateEnum
CREATE TYPE "WhatsappTriggerStatus" AS ENUM ('NotTriggered', 'Queued', 'Sent', 'Delivered', 'Failed');

-- AlterTable: documents — explicit RC/Insurance verification & expiry tracking
ALTER TABLE "documents"
  ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expiry_date" TIMESTAMP(3);

-- Backfill is_verified from the existing verification_status for pre-existing rows
UPDATE "documents" SET "is_verified" = true WHERE "verification_status" = 'Verified';

-- AlterTable: subscriptions — auto-renew flag alongside existing expires_at
ALTER TABLE "subscriptions"
  ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: bookings — denormalized WhatsApp notification trigger status
ALTER TABLE "bookings"
  ADD COLUMN "whatsapp_trigger_status" "WhatsappTriggerStatus" NOT NULL DEFAULT 'NotTriggered',
  ADD COLUMN "whatsapp_triggered_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "documents_expiry_date_idx" ON "documents"("expiry_date");

-- CreateIndex
CREATE INDEX "subscriptions_expires_at_idx" ON "subscriptions"("expires_at");

-- CreateIndex
CREATE INDEX "bookings_whatsapp_trigger_status_idx" ON "bookings"("whatsapp_trigger_status");
