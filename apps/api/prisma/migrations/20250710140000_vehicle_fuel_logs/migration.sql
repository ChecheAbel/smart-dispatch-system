-- CreateEnum
CREATE TYPE "vehicle_fuel_type" AS ENUM ('diesel', 'petrol', 'other');

-- CreateEnum
CREATE TYPE "vehicle_fuel_log_source" AS ENUM ('manual', 'driver_app', 'import');

-- AlterEnum
ALTER TYPE "vehicle_history_event_type" ADD VALUE IF NOT EXISTS 'fuel_logged';
ALTER TYPE "vehicle_history_event_type" ADD VALUE IF NOT EXISTS 'fuel_updated';

-- CreateTable
CREATE TABLE "vehicle_fuel_logs" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "logged_at" TIMESTAMPTZ NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "quantity_liters" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(12,2),
    "fuel_type" "vehicle_fuel_type" NOT NULL DEFAULT 'diesel',
    "station_name" VARCHAR(200),
    "receipt_reference" VARCHAR(100),
    "source" "vehicle_fuel_log_source" NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicle_fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_fuel_logs_vehicle_id_logged_at_idx" ON "vehicle_fuel_logs"("vehicle_id", "logged_at");

-- CreateIndex
CREATE INDEX "vehicle_fuel_logs_created_by_id_idx" ON "vehicle_fuel_logs"("created_by_id");

-- AddForeignKey
ALTER TABLE "vehicle_fuel_logs" ADD CONSTRAINT "vehicle_fuel_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fuel_logs" ADD CONSTRAINT "vehicle_fuel_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
