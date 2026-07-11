-- Customer-driven contract terms: enrollments replace admin-set contract dates
CREATE TABLE "contract_enrollments" (
  "id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "requester_user_id" UUID NOT NULL,
  "starts_at" DATE NOT NULL,
  "ends_at" DATE NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contract_enrollments_contract_id_idx" ON "contract_enrollments"("contract_id");
CREATE INDEX "contract_enrollments_requester_user_id_idx" ON "contract_enrollments"("requester_user_id");
CREATE INDEX "contract_enrollments_starts_at_idx" ON "contract_enrollments"("starts_at");
CREATE INDEX "contract_enrollments_ends_at_idx" ON "contract_enrollments"("ends_at");

ALTER TABLE "contract_enrollments"
ADD CONSTRAINT "contract_enrollments_contract_id_fkey"
FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_enrollments"
ADD CONSTRAINT "contract_enrollments_requester_user_id_fkey"
FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "contracts_starts_at_idx";
DROP INDEX IF EXISTS "contracts_ends_at_idx";

ALTER TABLE "contracts" DROP COLUMN IF EXISTS "starts_at";
ALTER TABLE "contracts" DROP COLUMN IF EXISTS "ends_at";
