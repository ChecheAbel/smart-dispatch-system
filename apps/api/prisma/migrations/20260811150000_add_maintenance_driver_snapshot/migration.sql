ALTER TABLE "vehicle_maintenance_logs"
ADD COLUMN "driver_at_request_id" UUID;

UPDATE "vehicle_maintenance_logs" AS maintenance
SET "driver_at_request_id" = vehicle."assigned_driver_user_id"
FROM "vehicles" AS vehicle
WHERE maintenance."vehicle_id" = vehicle."id";

CREATE INDEX "vehicle_maintenance_logs_driver_at_request_id_idx"
ON "vehicle_maintenance_logs"("driver_at_request_id");

ALTER TABLE "vehicle_maintenance_logs"
ADD CONSTRAINT "vehicle_maintenance_logs_driver_at_request_id_fkey"
FOREIGN KEY ("driver_at_request_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
