-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
