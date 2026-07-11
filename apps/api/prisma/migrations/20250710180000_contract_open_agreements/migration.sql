-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_requester_user_id_fkey";

-- DropIndex
DROP INDEX "contracts_requester_user_id_idx";

-- AlterTable
ALTER TABLE "contracts" DROP COLUMN "requester_user_id";
