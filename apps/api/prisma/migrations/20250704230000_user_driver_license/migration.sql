-- AlterTable
ALTER TABLE "users" ADD COLUMN "driver_license_number" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "users_driver_license_number_key" ON "users"("driver_license_number");
