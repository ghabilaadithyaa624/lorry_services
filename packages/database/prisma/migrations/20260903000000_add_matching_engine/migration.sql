-- Additive migration: Matching Engine — Need Load ↔ Need Vehicle pairing
--
-- Safety notes:
--  * Creates one NEW enum and one NEW table only. No existing table/column/enum/index is altered.
--  * Backward compatible: existing loads/trucks/bookings continue to work without matches.
--  * Provides GiST-friendly proximity (≤50km) matching via PostGIS geography already present on loads/trucks.

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('Pending', 'Booked', 'Completed', 'Cancelled');

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "load_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "load_owner_id" TEXT NOT NULL,
    "truck_owner_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'Pending',
    "distance_km" DECIMAL(10,2),
    "match_score" INTEGER,
    "tonnage_compatible" BOOLEAN NOT NULL DEFAULT false,
    "route_compatible" BOOLEAN NOT NULL DEFAULT false,
    "budget_compatible" BOOLEAN NOT NULL DEFAULT false,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_load_id_truck_id_key" ON "matches"("load_id", "truck_id");

-- CreateIndex
CREATE INDEX "matches_load_id_idx" ON "matches"("load_id");
CREATE INDEX "matches_truck_id_idx" ON "matches"("truck_id");
CREATE INDEX "matches_load_owner_id_idx" ON "matches"("load_owner_id");
CREATE INDEX "matches_truck_owner_id_idx" ON "matches"("truck_owner_id");
CREATE INDEX "matches_status_idx" ON "matches"("status");
CREATE INDEX "matches_created_at_idx" ON "matches"("created_at");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
