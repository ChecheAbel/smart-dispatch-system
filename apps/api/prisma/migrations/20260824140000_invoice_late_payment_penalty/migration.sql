-- CreateEnum
CREATE TYPE "late_payment_type" AS ENUM ('none', 'flat', 'percent');

-- AlterTable
ALTER TABLE "contracts"
ADD COLUMN "late_payment_type" "late_payment_type" NOT NULL DEFAULT 'none',
ADD COLUMN "late_payment_fee" DECIMAL(12, 2);

-- AlterTable
ALTER TABLE "invoices"
ADD COLUMN "late_payment_type" "late_payment_type" NOT NULL DEFAULT 'none',
ADD COLUMN "late_payment_fee" DECIMAL(12, 2),
ADD COLUMN "penalty_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0;
