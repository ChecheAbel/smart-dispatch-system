ALTER TABLE "ride_requests" DROP CONSTRAINT IF EXISTS "ride_requests_contract_id_fkey";

DROP INDEX IF EXISTS "ride_requests_contract_id_idx";

ALTER TABLE "ride_requests" DROP COLUMN IF EXISTS "contract_id";
