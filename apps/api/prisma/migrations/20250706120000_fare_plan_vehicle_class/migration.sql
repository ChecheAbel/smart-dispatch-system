-- AlterTable
ALTER TABLE "fare_plans" ADD COLUMN "vehicle_class_id" UUID;

-- CreateIndex
CREATE INDEX "fare_plans_vehicle_class_id_idx" ON "fare_plans"("vehicle_class_id");

-- AddForeignKey
ALTER TABLE "fare_plans" ADD CONSTRAINT "fare_plans_vehicle_class_id_fkey" FOREIGN KEY ("vehicle_class_id") REFERENCES "vehicle_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
