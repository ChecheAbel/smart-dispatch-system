-- AlterTable
ALTER TABLE "vehicles"
ADD COLUMN "insurance_expires_at" DATE,
ADD COLUMN "inspection_expires_at" DATE,
ADD COLUMN "registration_expires_at" DATE;

-- CreateIndex
CREATE INDEX "vehicles_insurance_expires_at_idx" ON "vehicles"("insurance_expires_at");
CREATE INDEX "vehicles_inspection_expires_at_idx" ON "vehicles"("inspection_expires_at");
CREATE INDEX "vehicles_registration_expires_at_idx" ON "vehicles"("registration_expires_at");

-- CreateEnum
CREATE TYPE "vehicle_maintenance_type" AS ENUM ('scheduled', 'repair', 'inspection', 'tire', 'oil', 'accident', 'other');
CREATE TYPE "vehicle_maintenance_status" AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "vehicle_history_event_type" AS ENUM (
  'created',
  'status_changed',
  'driver_assigned',
  'driver_unassigned',
  'maintenance_opened',
  'maintenance_updated',
  'maintenance_completed',
  'maintenance_cancelled',
  'expiry_updated'
);

-- CreateTable
CREATE TABLE "vehicle_maintenance_logs" (
  "id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "type" "vehicle_maintenance_type" NOT NULL,
  "status" "vehicle_maintenance_status" NOT NULL DEFAULT 'open',
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "vendor" VARCHAR(200),
  "cost_amount" DECIMAL(12,2),
  "odometer_km" INTEGER,
  "started_at" DATE,
  "completed_at" DATE,
  "next_due_at" DATE,
  "next_due_km" INTEGER,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "vehicle_maintenance_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vehicle_history_events" (
  "id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "event_type" "vehicle_history_event_type" NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "actor_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vehicle_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_maintenance_logs_vehicle_id_created_at_idx" ON "vehicle_maintenance_logs"("vehicle_id", "created_at");
CREATE INDEX "vehicle_maintenance_logs_status_idx" ON "vehicle_maintenance_logs"("status");
CREATE INDEX "vehicle_maintenance_logs_type_idx" ON "vehicle_maintenance_logs"("type");
CREATE INDEX "vehicle_history_events_vehicle_id_created_at_idx" ON "vehicle_history_events"("vehicle_id", "created_at");
CREATE INDEX "vehicle_history_events_event_type_idx" ON "vehicle_history_events"("event_type");

-- AddForeignKey
ALTER TABLE "vehicle_maintenance_logs"
ADD CONSTRAINT "vehicle_maintenance_logs_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_maintenance_logs"
ADD CONSTRAINT "vehicle_maintenance_logs_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_history_events"
ADD CONSTRAINT "vehicle_history_events_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_history_events"
ADD CONSTRAINT "vehicle_history_events_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
