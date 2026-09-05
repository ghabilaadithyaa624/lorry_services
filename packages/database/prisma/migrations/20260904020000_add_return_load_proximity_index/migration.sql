-- Supports the exact pickup expression used by return-load discovery, including
-- records whose numeric coordinates have not been materialized into a point.
-- The partial predicates match the service's Open/valid-coordinate predicates.
-- PostgreSQL migrations are not transaction-wrapped by Prisma; CONCURRENTLY
-- avoids blocking load-board writes while building this production index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "loads_return_load_pickup_gist"
ON "loads" USING GIST (
  (COALESCE(
    "loading_point",
    ST_SetSRID(ST_MakePoint("loading_lng", "loading_lat"), 4326)::geography
  ))
)
WHERE "status" = 'Open'
  AND "loading_lat" BETWEEN -90 AND 90
  AND "loading_lng" BETWEEN -180 AND 180;
