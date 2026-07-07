-- AlterTable
ALTER TABLE "locations"
ADD COLUMN "can_pickup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "can_dropoff" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ride_requests"
ADD COLUMN "pickup_location_id" UUID,
ADD COLUMN "dropoff_location_id" UUID;

-- CreateIndex
CREATE INDEX "locations_can_pickup_idx" ON "locations"("can_pickup");

-- CreateIndex
CREATE INDEX "locations_can_dropoff_idx" ON "locations"("can_dropoff");

-- CreateIndex
CREATE INDEX "ride_requests_pickup_location_id_idx" ON "ride_requests"("pickup_location_id");

-- CreateIndex
CREATE INDEX "ride_requests_dropoff_location_id_idx" ON "ride_requests"("dropoff_location_id");

-- AddForeignKey
ALTER TABLE "ride_requests"
ADD CONSTRAINT "ride_requests_pickup_location_id_fkey"
FOREIGN KEY ("pickup_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests"
ADD CONSTRAINT "ride_requests_dropoff_location_id_fkey"
FOREIGN KEY ("dropoff_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
