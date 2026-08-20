-- Keep the oldest geofence per vehicle when duplicates exist
DELETE FROM "vehicle_geofences" AS duplicate
WHERE EXISTS (
  SELECT 1
  FROM "vehicle_geofences" AS keeper
  WHERE keeper."vehicle_id" = duplicate."vehicle_id"
    AND (
      keeper."created_at" < duplicate."created_at"
      OR (
        keeper."created_at" = duplicate."created_at"
        AND keeper."id"::text < duplicate."id"::text
      )
    )
);

-- Drop non-unique index if present, then enforce one geofence per vehicle
DROP INDEX IF EXISTS "vehicle_geofences_vehicle_id_idx";

CREATE UNIQUE INDEX "vehicle_geofences_vehicle_id_key" ON "vehicle_geofences"("vehicle_id");
