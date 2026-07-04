-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "chassis_number" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_chassis_number_key" ON "vehicles"("chassis_number");
