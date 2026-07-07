CREATE TYPE "ride_request_status" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

CREATE TABLE "ride_requests" (
    "id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "vehicle_type_id" UUID,
    "region_id" UUID,
    "pickup_address" VARCHAR(500) NOT NULL,
    "pickup_latitude" DECIMAL(10,7),
    "pickup_longitude" DECIMAL(10,7),
    "dropoff_address" VARCHAR(500) NOT NULL,
    "dropoff_latitude" DECIMAL(10,7),
    "dropoff_longitude" DECIMAL(10,7),
    "scheduled_at" TIMESTAMPTZ,
    "passenger_count" INTEGER NOT NULL DEFAULT 1,
    "notes" VARCHAR(1000),
    "status" "ride_request_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ride_requests_requester_user_id_idx" ON "ride_requests"("requester_user_id");
CREATE INDEX "ride_requests_status_idx" ON "ride_requests"("status");
CREATE INDEX "ride_requests_created_at_idx" ON "ride_requests"("created_at" DESC);
