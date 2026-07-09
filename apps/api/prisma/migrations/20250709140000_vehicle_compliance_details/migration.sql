-- AlterTable
ALTER TABLE "vehicles"
ADD COLUMN "insurance_provider" VARCHAR(150),
ADD COLUMN "insurance_policy_number" VARCHAR(80),
ADD COLUMN "insurance_issued_at" DATE,
ADD COLUMN "insurance_notes" TEXT,
ADD COLUMN "inspection_center" VARCHAR(150),
ADD COLUMN "inspection_certificate_number" VARCHAR(80),
ADD COLUMN "inspection_performed_at" DATE,
ADD COLUMN "inspection_notes" TEXT;
