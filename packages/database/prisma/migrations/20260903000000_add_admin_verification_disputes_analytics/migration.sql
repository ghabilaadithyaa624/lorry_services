-- Additive admin operations support: Vahan lookup state and booking dispute resolution.

CREATE TYPE "VahanCheckStatus" AS ENUM ('NotChecked', 'Pending', 'Verified', 'Mismatch', 'Unavailable', 'Error');

ALTER TABLE "trucks"
  ADD COLUMN "vahan_status" "VahanCheckStatus" NOT NULL DEFAULT 'NotChecked',
  ADD COLUMN "vahan_last_checked_at" TIMESTAMP(3),
  ADD COLUMN "vahan_verified_at" TIMESTAMP(3),
  ADD COLUMN "vahan_response" JSONB;

CREATE TYPE "DisputeCategory" AS ENUM ('Payment', 'Cargo_Damage', 'Delay', 'Document', 'Other');
CREATE TYPE "DisputePriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE "DisputeStatus" AS ENUM ('Open', 'Investigating', 'Resolved', 'Rejected');

CREATE TABLE "booking_disputes" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "raised_by_id" TEXT NOT NULL,
  "category" "DisputeCategory" NOT NULL DEFAULT 'Other',
  "priority" "DisputePriority" NOT NULL DEFAULT 'Medium',
  "status" "DisputeStatus" NOT NULL DEFAULT 'Open',
  "description" TEXT NOT NULL,
  "resolution" TEXT,
  "resolved_by_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_disputes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_disputes_booking_id_idx" ON "booking_disputes"("booking_id");
CREATE INDEX "booking_disputes_raised_by_id_idx" ON "booking_disputes"("raised_by_id");
CREATE INDEX "booking_disputes_status_idx" ON "booking_disputes"("status");
CREATE INDEX "booking_disputes_priority_idx" ON "booking_disputes"("priority");

ALTER TABLE "booking_disputes"
  ADD CONSTRAINT "booking_disputes_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_disputes"
  ADD CONSTRAINT "booking_disputes_raised_by_id_fkey"
  FOREIGN KEY ("raised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_disputes"
  ADD CONSTRAINT "booking_disputes_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
