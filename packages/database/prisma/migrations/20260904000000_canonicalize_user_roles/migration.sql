-- Canonicalize the UserRole enum to the three roles documented in
-- docs/database-schema-design.md: factory_owner, truck_driver, admin.
--
-- History:
--  * `load_owner` -> `factory_owner` and `truck_owner` -> `truck_driver` were
--    already renamed in place by 20260903000000_rename_roles_and_add_rc_whatsapp_subscription_fields.
--  * `driver` was added by 20260903000000_add_driver_role_and_trial_subscription
--    as a separate vehicle-side persona. The product no longer distinguishes it
--    from a truck driver, so existing `driver` rows are migrated to
--    `truck_driver` before the value is dropped.
--
-- Safety notes:
--  * Data is backfilled BEFORE the old enum value disappears, so no row can be
--    orphaned. Postgres has no DROP VALUE, hence the type swap below.
--  * The swap is done inside the implicit migration transaction: create the new
--    type, cast the column through text, drop the old type, rename. Any row that
--    still holds a legacy label is mapped by the CASE expression, which makes
--    this re-runnable against databases that skipped the rename migration.

-- 1. Backfill legacy `driver` rows onto the canonical vehicle-side role.
UPDATE "users" SET "role" = 'truck_driver' WHERE "role"::text = 'driver';

-- 2. Create the canonical enum.
CREATE TYPE "UserRole_new" AS ENUM ('factory_owner', 'truck_driver', 'admin');

-- 3. Move the column across, mapping any remaining legacy label.
ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT USING "role"::text;

UPDATE "users"
SET "role" = CASE "role"
  WHEN 'load_owner' THEN 'factory_owner'
  WHEN 'truck_owner' THEN 'truck_driver'
  WHEN 'driver' THEN 'truck_driver'
  ELSE "role"
END;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRole_new" USING "role"::"UserRole_new";

-- 4. Swap the types.
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
