-- AlterTable
ALTER TABLE "contract_enrollments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "maintenance_work_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "menus" ALTER COLUMN "translations" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notification_configurations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "translations" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "photo_url" VARCHAR(500);
