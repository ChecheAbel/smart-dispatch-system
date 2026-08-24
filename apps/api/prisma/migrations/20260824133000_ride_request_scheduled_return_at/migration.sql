-- Ride request return time was added to schema without a migration (8c65070).
ALTER TABLE "ride_requests" ADD COLUMN IF NOT EXISTS "scheduled_return_at" TIMESTAMPTZ;

-- Schema no longer models these unused columns/enums; keep migrations in sync with schema.prisma.
ALTER TABLE "app_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "vehicle_fuel_logs" DROP COLUMN IF EXISTS "location_type";
ALTER TABLE "vehicle_maintenance_logs" DROP COLUMN IF EXISTS "location_type";

DROP TYPE IF EXISTS "fuel_location_type";
DROP TYPE IF EXISTS "maintenance_location_type";
