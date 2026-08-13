ALTER TABLE "vehicle_fuel_logs"
ADD COLUMN "driver_at_refill_id" UUID;

UPDATE "vehicle_fuel_logs" AS fuel
SET "driver_at_refill_id" = vehicle."assigned_driver_user_id"
FROM "vehicles" AS vehicle
WHERE fuel."vehicle_id" = vehicle."id";

CREATE INDEX "vehicle_fuel_logs_driver_at_refill_id_idx"
ON "vehicle_fuel_logs"("driver_at_refill_id");

ALTER TABLE "vehicle_fuel_logs"
ADD CONSTRAINT "vehicle_fuel_logs_driver_at_refill_id_fkey"
FOREIGN KEY ("driver_at_refill_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
