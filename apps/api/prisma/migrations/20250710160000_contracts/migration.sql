-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('draft', 'active', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "reference_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT 'draft',
    "starts_at" DATE NOT NULL,
    "ends_at" DATE NOT NULL,
    "fare_plan_id" UUID,
    "notes" TEXT,
    "region_ids" JSONB NOT NULL DEFAULT '[]',
    "vehicle_type_ids" JSONB NOT NULL DEFAULT '[]',
    "vehicle_class_ids" JSONB NOT NULL DEFAULT '[]',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ride_requests" ADD COLUMN "contract_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "contracts_reference_number_key" ON "contracts"("reference_number");

-- CreateIndex
CREATE INDEX "contracts_requester_user_id_idx" ON "contracts"("requester_user_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_starts_at_ends_at_idx" ON "contracts"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "ride_requests_contract_id_idx" ON "ride_requests"("contract_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_fare_plan_id_fkey" FOREIGN KEY ("fare_plan_id") REFERENCES "fare_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
