-- Additive migration: Vahan RC verification + trip compliance tracking.
--
-- Safety notes:
--  * Only NEW columns, NEW enum types and NEW indexes. No existing column,
--    table or constraint is altered or dropped, so this is backward
--    compatible with the currently deployed API.
--  * New columns on `trucks` are nullable or carry constant defaults, so the
--    existing rows keep working without a backfill:
--      - `vahan_details` / `vahan_validated_at` NULL  -> "not yet validated"
--      - `fastag_status`   DEFAULT 'Unknown'          -> "not yet reported"
--  * New columns on `bookings` mirror the pre-existing `eway_bill_number`:
--      - `eway_bill_status` DEFAULT 'Pending'         -> "no bill attached yet"
--
-- CreateTable enums
CREATE TYPE "FastagStatus" AS ENUM ('Unknown', 'Active', 'LowBalance', 'Inactive');
CREATE TYPE "EwayBillStatus" AS ENUM ('Pending', 'Active', 'Expired', 'Invalid');

-- AlterTable: Vahan RC verification snapshot on trucks
ALTER TABLE "trucks" ADD COLUMN "vahan_details" JSONB;
ALTER TABLE "trucks" ADD COLUMN "vahan_validated_at" TIMESTAMP(3);
ALTER TABLE "trucks" ADD COLUMN "fastag_status" "FastagStatus" NOT NULL DEFAULT 'Unknown';
ALTER TABLE "trucks" ADD COLUMN "fastag_updated_at" TIMESTAMP(3);

-- AlterTable: E-Way Bill lifecycle on bookings
ALTER TABLE "bookings" ADD COLUMN "eway_bill_status" "EwayBillStatus" NOT NULL DEFAULT 'Pending';
ALTER TABLE "bookings" ADD COLUMN "eway_bill_valid_upto" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "eway_bill_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "trucks_vahan_validated_at_idx" ON "trucks"("vahan_validated_at");

-- CreateIndex
CREATE INDEX "trucks_fastag_status_idx" ON "trucks"("fastag_status");

-- CreateIndex
CREATE INDEX "bookings_eway_bill_status_idx" ON "bookings"("eway_bill_status");

-- Backfill: bookings that already carry an E-Way Bill number are treated as
-- Active (exact expiry was not captured historically).
UPDATE "bookings" SET "eway_bill_status" = 'Active' WHERE "eway_bill_number" IS NOT NULL;
