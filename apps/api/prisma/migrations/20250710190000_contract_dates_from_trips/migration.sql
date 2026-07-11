-- DropIndex
DROP INDEX "contracts_starts_at_ends_at_idx";

-- AlterTable
ALTER TABLE "contracts" DROP COLUMN "starts_at",
DROP COLUMN "ends_at";
