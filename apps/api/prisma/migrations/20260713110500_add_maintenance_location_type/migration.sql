-- CreateEnum
CREATE TYPE "maintenance_location_type" AS ENUM ('internal', 'external');

-- AlterTable
ALTER TABLE "vehicle_maintenance_logs" ADD COLUMN "location_type" "maintenance_location_type" NOT NULL DEFAULT 'external';
