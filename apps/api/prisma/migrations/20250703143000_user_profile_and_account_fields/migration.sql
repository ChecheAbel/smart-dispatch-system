-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "AccountActivation" AS ENUM ('pending', 'activated');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "first_name" VARCHAR(100),
ADD COLUMN "middle_name" VARCHAR(100),
ADD COLUMN "last_name" VARCHAR(100),
ADD COLUMN "mobile_number" VARCHAR(20),
ADD COLUMN "account_status" "AccountStatus",
ADD COLUMN "account_activation" "AccountActivation";

UPDATE "users"
SET
  "first_name" = split_part("full_name", ' ', 1),
  "last_name" = CASE
    WHEN strpos("full_name", ' ') > 0 THEN substring("full_name" from strpos("full_name", ' ') + 1)
    ELSE split_part("full_name", ' ', 1)
  END,
  "mobile_number" = concat('+seed-', left("id"::text, 8)),
  "account_status" = CASE
    WHEN "is_active" THEN 'active'::"AccountStatus"
    ELSE 'deactivated'::"AccountStatus"
  END,
  "account_activation" = CASE
    WHEN "is_active" THEN 'activated'::"AccountActivation"
    ELSE 'pending'::"AccountActivation"
  END;

ALTER TABLE "users"
DROP COLUMN "full_name",
DROP COLUMN "is_active",
ALTER COLUMN "first_name" SET NOT NULL,
ALTER COLUMN "last_name" SET NOT NULL,
ALTER COLUMN "mobile_number" SET NOT NULL,
ALTER COLUMN "account_status" SET NOT NULL,
ALTER COLUMN "account_status" SET DEFAULT 'active',
ALTER COLUMN "account_activation" SET NOT NULL,
ALTER COLUMN "account_activation" SET DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_number_key" ON "users"("mobile_number");

-- CreateIndex
CREATE INDEX "users_mobile_number_idx" ON "users"("mobile_number");
