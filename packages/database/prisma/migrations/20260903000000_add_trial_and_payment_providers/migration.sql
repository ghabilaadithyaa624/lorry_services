-- Feature 13: Subscription & Trial Flow
-- 1) Per-user 3-month free trial fields (one trial per account, lazily granted)
-- 2) Payment provider attribution on subscriptions (cashfree / razorpay / stripe)

ALTER TABLE "users" ADD COLUMN "trial_started_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "trial_converted_at" TIMESTAMP(3);

CREATE INDEX "users_trial_ends_at_idx" ON "users"("trial_ends_at");

ALTER TABLE "subscriptions" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'cashfree';
ALTER TABLE "subscriptions" ADD COLUMN "provider_order_id" TEXT;

CREATE INDEX "subscriptions_provider_order_id_idx" ON "subscriptions"("provider_order_id");
