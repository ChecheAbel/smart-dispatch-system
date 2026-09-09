-- CreateTable
CREATE TABLE "ride_request_legs" (
    "id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "pickup_address" VARCHAR(500) NOT NULL,
    "pickup_latitude" DECIMAL(10,7),
    "pickup_longitude" DECIMAL(10,7),
    "dropoff_address" VARCHAR(500) NOT NULL,
    "dropoff_latitude" DECIMAL(10,7),
    "dropoff_longitude" DECIMAL(10,7),
    "scheduled_at" TIMESTAMPTZ,
    "estimated_distance_km" DECIMAL(10,3),
    "actual_distance_km" DECIMAL(10,3),
    "planned_wait_minutes" INTEGER NOT NULL DEFAULT 0,
    "actual_wait_minutes" INTEGER NOT NULL DEFAULT 0,
    "stop_purpose" VARCHAR(255),
    "status" "ride_request_status" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ride_request_legs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ride_request_legs_ride_request_id_sequence_order_idx" ON "ride_request_legs"("ride_request_id", "sequence_order");

-- AddForeignKey
ALTER TABLE "ride_request_legs" ADD CONSTRAINT "ride_request_legs_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
