-- Contract term dates and billing cycle
CREATE TYPE "contract_billing_interval" AS ENUM ('per_trip', 'monthly', 'quarterly', 'annually');

ALTER TABLE "contracts"
ADD COLUMN "starts_at" DATE,
ADD COLUMN "ends_at" DATE,
ADD COLUMN "billing_interval" "contract_billing_interval" NOT NULL DEFAULT 'per_trip',
ADD COLUMN "payment_terms_days" INTEGER;

CREATE INDEX "contracts_starts_at_idx" ON "contracts"("starts_at");
CREATE INDEX "contracts_ends_at_idx" ON "contracts"("ends_at");
