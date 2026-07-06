-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "vehicle_class_id" UUID;

-- Backfill existing vehicles with the standard class when available.
UPDATE "vehicles"
SET "vehicle_class_id" = COALESCE(
  (SELECT "id" FROM "vehicle_classes" WHERE "slug" = 'standard' LIMIT 1),
  (SELECT "id" FROM "vehicle_classes" ORDER BY "slug" ASC LIMIT 1)
)
WHERE "vehicle_class_id" IS NULL;

ALTER TABLE "vehicles" ALTER COLUMN "vehicle_class_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "vehicles_vehicle_class_id_idx" ON "vehicles"("vehicle_class_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_class_id_fkey" FOREIGN KEY ("vehicle_class_id") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
