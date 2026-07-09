-- Create maintenance work types lookup table
CREATE TABLE "maintenance_work_types" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "translations" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_work_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "maintenance_work_types_slug_key" ON "maintenance_work_types"("slug");

-- Seed default work types (matches former enum values)
INSERT INTO "maintenance_work_types" ("id", "slug", "translations", "is_active", "sort_order", "created_at", "updated_at") VALUES
  (gen_random_uuid(), 'scheduled', '{"en":{"name":"Scheduled","description":null},"am":{"name":"ታቅዶ","description":null}}', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'repair', '{"en":{"name":"Repair","description":null},"am":{"name":"ጥገና","description":null}}', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inspection', '{"en":{"name":"Inspection","description":null},"am":{"name":"ምርመራ","description":null}}', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'tire', '{"en":{"name":"Tire","description":null},"am":{"name":"ጎማ","description":null}}', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'oil', '{"en":{"name":"Oil","description":null},"am":{"name":"ዘይት","description":null}}', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'accident', '{"en":{"name":"Accident","description":null},"am":{"name":"አደጋ","description":null}}', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'other', '{"en":{"name":"Other","description":null},"am":{"name":"ሌላ","description":null}}', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add FK column and backfill from enum
ALTER TABLE "vehicle_maintenance_logs" ADD COLUMN "work_type_id" UUID;

UPDATE "vehicle_maintenance_logs" AS log
SET "work_type_id" = work_type."id"
FROM "maintenance_work_types" AS work_type
WHERE work_type."slug" = log."type"::text;

UPDATE "vehicle_maintenance_logs"
SET "work_type_id" = (SELECT "id" FROM "maintenance_work_types" WHERE "slug" = 'other' LIMIT 1)
WHERE "work_type_id" IS NULL;

ALTER TABLE "vehicle_maintenance_logs" ALTER COLUMN "work_type_id" SET NOT NULL;

ALTER TABLE "vehicle_maintenance_logs" DROP COLUMN "type";

DROP TYPE "vehicle_maintenance_type";

CREATE INDEX "vehicle_maintenance_logs_work_type_id_idx" ON "vehicle_maintenance_logs"("work_type_id");

ALTER TABLE "vehicle_maintenance_logs" ADD CONSTRAINT "vehicle_maintenance_logs_work_type_id_fkey"
  FOREIGN KEY ("work_type_id") REFERENCES "maintenance_work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
