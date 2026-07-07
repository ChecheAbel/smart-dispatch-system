ALTER TABLE "ride_requests"
ADD COLUMN "assigned_vehicle_id" UUID,
ADD COLUMN "assigned_driver_user_id" UUID,
ADD COLUMN "assigned_at" TIMESTAMPTZ,
ADD COLUMN "started_at" TIMESTAMPTZ,
ADD COLUMN "completed_at" TIMESTAMPTZ;

ALTER TABLE "ride_requests"
ADD CONSTRAINT "ride_requests_assigned_vehicle_id_fkey"
FOREIGN KEY ("assigned_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ride_requests"
ADD CONSTRAINT "ride_requests_assigned_driver_user_id_fkey"
FOREIGN KEY ("assigned_driver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ride_requests_assigned_vehicle_id_idx" ON "ride_requests"("assigned_vehicle_id");
CREATE INDEX "ride_requests_assigned_driver_user_id_idx" ON "ride_requests"("assigned_driver_user_id");
