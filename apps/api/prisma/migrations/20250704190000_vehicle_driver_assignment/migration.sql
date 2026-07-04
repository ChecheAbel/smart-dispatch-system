-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "assigned_driver_user_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_assigned_driver_user_id_key" ON "vehicles"("assigned_driver_user_id");

-- CreateIndex
CREATE INDEX "vehicles_assigned_driver_user_id_idx" ON "vehicles"("assigned_driver_user_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_assigned_driver_user_id_fkey" FOREIGN KEY ("assigned_driver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
