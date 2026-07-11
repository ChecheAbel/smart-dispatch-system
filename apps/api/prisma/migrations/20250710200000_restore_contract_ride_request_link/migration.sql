ALTER TABLE "ride_requests" ADD COLUMN "contract_id" UUID;

CREATE INDEX "ride_requests_contract_id_idx" ON "ride_requests"("contract_id");

ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
