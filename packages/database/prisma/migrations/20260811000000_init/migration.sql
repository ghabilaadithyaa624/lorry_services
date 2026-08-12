CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('load_owner', 'truck_owner', 'admin');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "TruckType" AS ENUM ('Open', 'Container', 'Open body');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('Open', 'Matched', 'In-transit', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('Pending', 'Verified', 'Rejected');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RC', 'Insurance');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('Pending', 'Confirmed', 'In-transit', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('subscription', 'booking_advance', 'booking_balance');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Success', 'Failed', 'Refunded');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('whatsapp', 'sms', 'push');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('Pending', 'Sent', 'Delivered', 'Failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tonnage_required" DECIMAL(10,2) NOT NULL,
    "loading_address" TEXT NOT NULL,
    "loading_pin" TEXT NOT NULL,
    "loading_lat" DECIMAL(10,8),
    "loading_lng" DECIMAL(11,8),
    "loading_point" geography(Point, 4326),
    "unloading_address" TEXT NOT NULL,
    "unloading_pin" TEXT NOT NULL,
    "unloading_lat" DECIMAL(10,8),
    "unloading_lng" DECIMAL(11,8),
    "unloading_point" geography(Point, 4326),
    "truck_type" "TruckType" NOT NULL,
    "min_length_ft" INTEGER,
    "min_height_ft" INTEGER,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "max_price" DECIMAL(12,2),
    "expected_delivery_at" TIMESTAMP(3),
    "advance_payable" DECIMAL(12,2),
    "status" "LoadStatus" NOT NULL DEFAULT 'Open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "body_type" "TruckType" NOT NULL,
    "length_ft" INTEGER NOT NULL,
    "height_ft" INTEGER NOT NULL,
    "tonnage_capacity" DECIMAL(10,2) NOT NULL,
    "current_lat" DECIMAL(10,8),
    "current_lng" DECIMAL(11,8),
    "current_location" geography(Point, 4326),
    "serviceable_radius_km" INTEGER NOT NULL DEFAULT 50,
    "preferred_destinations" JSONB,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'Pending',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "doc_number" TEXT,
    "s3_url" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "original_filename" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'Pending',
    "verified_by" TEXT,
    "verification_notes" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "load_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "load_owner_id" TEXT NOT NULL,
    "truck_owner_id" TEXT NOT NULL,
    "agreed_price" DECIMAL(12,2) NOT NULL,
    "advance_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "advance_confirmed_at" TIMESTAMP(3),
    "balance_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "balance_confirmed_at" TIMESTAMP(3),
    "eway_bill_number" TEXT,
    "liability_accepted" BOOLEAN NOT NULL DEFAULT false,
    "liability_accepted_at" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'Pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "location" geography(Point, 4326),
    "radius_m" INTEGER NOT NULL,
    "crossed_at" TIMESTAMP(3),
    "crossed_by" TEXT,
    "eta_minutes" INTEGER,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "purpose" "PaymentPurpose" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "provider" TEXT NOT NULL DEFAULT 'cashfree',
    "provider_order_id" TEXT,
    "provider_txn_id" TEXT,
    "payment_method" TEXT,
    "paid_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB,
    "recipient" TEXT NOT NULL,
    "content" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'Pending',
    "provider" TEXT NOT NULL DEFAULT 'gupshup',
    "provider_msg_id" TEXT,
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "loads_user_id_idx" ON "loads"("user_id");

-- CreateIndex
CREATE INDEX "loads_status_idx" ON "loads"("status");

-- CreateIndex
CREATE INDEX "loads_truck_type_idx" ON "loads"("truck_type");

-- CreateIndex
CREATE INDEX "loads_urgent_idx" ON "loads"("urgent");

-- CreateIndex
CREATE INDEX "loads_created_at_idx" ON "loads"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_registration_number_key" ON "trucks"("registration_number");

-- CreateIndex
CREATE INDEX "trucks_user_id_idx" ON "trucks"("user_id");

-- CreateIndex
CREATE INDEX "trucks_verification_status_idx" ON "trucks"("verification_status");

-- CreateIndex
CREATE INDEX "trucks_body_type_idx" ON "trucks"("body_type");

-- CreateIndex
CREATE INDEX "trucks_tonnage_capacity_idx" ON "trucks"("tonnage_capacity");

-- CreateIndex
CREATE INDEX "documents_truck_id_idx" ON "documents"("truck_id");

-- CreateIndex
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- CreateIndex
CREATE INDEX "documents_verification_status_idx" ON "documents"("verification_status");

-- CreateIndex
CREATE INDEX "bookings_load_id_idx" ON "bookings"("load_id");

-- CreateIndex
CREATE INDEX "bookings_truck_id_idx" ON "bookings"("truck_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_load_owner_id_idx" ON "bookings"("load_owner_id");

-- CreateIndex
CREATE INDEX "bookings_truck_owner_id_idx" ON "bookings"("truck_owner_id");

-- CreateIndex
CREATE INDEX "checkpoints_booking_id_idx" ON "checkpoints"("booking_id");

-- CreateIndex
CREATE INDEX "checkpoints_crossed_at_idx" ON "checkpoints"("crossed_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkpoints_booking_id_seq_key" ON "checkpoints"("booking_id", "seq");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_provider_txn_id_idx" ON "payments"("provider_txn_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_load_owner_id_fkey" FOREIGN KEY ("load_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_truck_owner_id_fkey" FOREIGN KEY ("truck_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

