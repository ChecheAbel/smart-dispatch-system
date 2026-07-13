-- CreateEnum
CREATE TYPE "fuel_location_type" AS ENUM ('internal', 'external');

-- AlterTable
ALTER TABLE "vehicle_fuel_logs" ADD COLUMN "location_type" "fuel_location_type" NOT NULL DEFAULT 'external';
