-- Additive migration: user preferences + notification read receipts.
--
-- Safety notes:
--  * Creates two NEW tables only. No existing table, column, enum, index or
--    constraint is altered or dropped, so this is backward compatible with the
--    currently deployed API.
--  * No backfill required: a missing user_preferences row means "all defaults",
--    and a missing notification_receipts row means "unread".
--  * Both tables cascade on user deletion, matching the existing convention.

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "distance_unit" TEXT NOT NULL DEFAULT 'km',
    "notify_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "notify_sms" BOOLEAN NOT NULL DEFAULT true,
    "notify_push" BOOLEAN NOT NULL DEFAULT true,
    "notify_checkpoints" BOOLEAN NOT NULL DEFAULT true,
    "default_radius_km" INTEGER NOT NULL DEFAULT 50,
    "preferred_body_type" TEXT,
    "auto_detect_location" BOOLEAN NOT NULL DEFAULT true,
    "profile_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_receipts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_key" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_receipts_user_id_idx" ON "notification_receipts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_receipts_user_id_notification_key_key" ON "notification_receipts"("user_id", "notification_key");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_receipts" ADD CONSTRAINT "notification_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
