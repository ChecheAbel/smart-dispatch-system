-- CreateTable
CREATE TABLE "vehicle_location_snapshots" (
    "vehicle_id" UUID NOT NULL,
    "driver_user_id" UUID,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "heading" DECIMAL(6,2),
    "speed_kmh" DECIMAL(6,2),
    "accuracy_m" DECIMAL(8,2),
    "recorded_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicle_location_snapshots_pkey" PRIMARY KEY ("vehicle_id")
);

-- CreateIndex
CREATE INDEX "vehicle_location_snapshots_driver_user_id_idx" ON "vehicle_location_snapshots"("driver_user_id");

-- CreateIndex
CREATE INDEX "vehicle_location_snapshots_recorded_at_idx" ON "vehicle_location_snapshots"("recorded_at");

-- AddForeignKey
ALTER TABLE "vehicle_location_snapshots" ADD CONSTRAINT "vehicle_location_snapshots_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_location_snapshots" ADD CONSTRAINT "vehicle_location_snapshots_driver_user_id_fkey" FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
