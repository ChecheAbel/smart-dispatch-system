-- CreateEnum
CREATE TYPE "pricing_model" AS ENUM ('flat', 'distance', 'time', 'distance_time', 'hourly');

-- CreateTable
CREATE TABLE "fare_plans" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "translations" JSONB NOT NULL,
    "vehicle_type_id" UUID,
    "region_id" UUID,
    "pricing_model" "pricing_model" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "base_fare" DECIMAL(12,2) NOT NULL,
    "per_km_rate" DECIMAL(12,2),
    "per_minute_rate" DECIMAL(12,2),
    "minimum_fare" DECIMAL(12,2),
    "booking_fee" DECIMAL(12,2),
    "free_waiting_minutes" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fare_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fare_plans_slug_key" ON "fare_plans"("slug");

-- CreateIndex
CREATE INDEX "fare_plans_vehicle_type_id_idx" ON "fare_plans"("vehicle_type_id");

-- CreateIndex
CREATE INDEX "fare_plans_region_id_idx" ON "fare_plans"("region_id");

-- CreateIndex
CREATE INDEX "fare_plans_pricing_model_idx" ON "fare_plans"("pricing_model");

-- CreateIndex
CREATE INDEX "fare_plans_is_active_idx" ON "fare_plans"("is_active");

-- AddForeignKey
ALTER TABLE "fare_plans" ADD CONSTRAINT "fare_plans_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_plans" ADD CONSTRAINT "fare_plans_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
