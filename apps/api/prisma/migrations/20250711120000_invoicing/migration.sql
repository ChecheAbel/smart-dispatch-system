-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'issued', 'paid', 'void');

-- AlterTable
ALTER TABLE "ride_requests" ADD COLUMN "fare_plan_id" UUID,
ADD COLUMN "distance_km" DECIMAL(10,3),
ADD COLUMN "duration_minutes" INTEGER,
ADD COLUMN "billable_amount" DECIMAL(14,2),
ADD COLUMN "billable_currency" VARCHAR(3);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "reference_number" VARCHAR(50) NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "contract_id" UUID NOT NULL,
    "contract_enrollment_id" UUID,
    "requester_user_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "payment_terms_days" INTEGER,
    "issued_at" TIMESTAMPTZ,
    "due_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "voided_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,
    "fare_plan_id" UUID,
    "distance_km" DECIMAL(10,3),
    "duration_minutes" INTEGER,
    "pricing_snapshot" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_reference_number_key" ON "invoices"("reference_number");

-- CreateIndex
CREATE INDEX "invoices_contract_id_idx" ON "invoices"("contract_id");

-- CreateIndex
CREATE INDEX "invoices_contract_enrollment_id_idx" ON "invoices"("contract_enrollment_id");

-- CreateIndex
CREATE INDEX "invoices_requester_user_id_idx" ON "invoices"("requester_user_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_items_ride_request_id_key" ON "invoice_line_items"("ride_request_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_fare_plan_id_fkey" FOREIGN KEY ("fare_plan_id") REFERENCES "fare_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_enrollment_id_fkey" FOREIGN KEY ("contract_enrollment_id") REFERENCES "contract_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_fare_plan_id_fkey" FOREIGN KEY ("fare_plan_id") REFERENCES "fare_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
