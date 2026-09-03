-- Role-based onboarding adds a driver persona while retaining the established
-- load_owner and truck_owner roles for existing factory and transporter accounts.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'driver';

-- The free trial is represented by a regular active subscription with plan
-- `free_trial`; no table shape change is needed. This keeps every entitlement
-- check and its expiry handling in the single subscriptions pipeline.
