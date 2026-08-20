-- CreateEnum
CREATE TYPE "geofence_shape" AS ENUM ('circle', 'polygon');

-- CreateEnum
CREATE TYPE "geofence_kind" AS ENUM ('allowed', 'restricted');

-- CreateTable
CREATE TABLE "vehicle_geofences" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "kind" "geofence_kind" NOT NULL,
    "shape" "geofence_shape" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "center_lat" DECIMAL(10,7),
    "center_lng" DECIMAL(10,7),
    "radius_m" INTEGER,
    "coordinates" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicle_geofences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_geofences_vehicle_id_idx" ON "vehicle_geofences"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_geofences_is_active_idx" ON "vehicle_geofences"("is_active");

-- AddForeignKey
ALTER TABLE "vehicle_geofences" ADD CONSTRAINT "vehicle_geofences_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
