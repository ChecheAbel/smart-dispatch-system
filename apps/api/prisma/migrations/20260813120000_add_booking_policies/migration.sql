-- CreateEnum
CREATE TYPE "late_cancellation_type" AS ENUM ('none', 'charge_fee', 'bill_as_trip');

-- CreateTable
CREATE TABLE "booking_policies" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "translations" JSONB NOT NULL,
    "min_advance_booking_hours" INTEGER NOT NULL DEFAULT 0,
    "free_cancellation_hours" INTEGER NOT NULL DEFAULT 0,
    "late_cancellation_type" "late_cancellation_type" NOT NULL DEFAULT 'none',
    "late_cancellation_fee" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "booking_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_policies_slug_key" ON "booking_policies"("slug");

-- CreateIndex
CREATE INDEX "booking_policies_is_active_idx" ON "booking_policies"("is_active");

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN "booking_policy_id" UUID;

-- CreateIndex
CREATE INDEX "contracts_booking_policy_id_idx" ON "contracts"("booking_policy_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_policy_id_fkey" FOREIGN KEY ("booking_policy_id") REFERENCES "booking_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
