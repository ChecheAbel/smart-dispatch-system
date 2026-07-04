-- CreateTable
CREATE TABLE "menu_permissions" (
    "menu_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "menu_permissions_pkey" PRIMARY KEY ("menu_id","permission_id")
);

-- Migrate existing single permission links
INSERT INTO "menu_permissions" ("menu_id", "permission_id")
SELECT "id", "permission_id"
FROM "menus"
WHERE "permission_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "menus" DROP CONSTRAINT "menus_permission_id_fkey";

-- DropIndex
DROP INDEX "menus_permission_id_idx";

-- AlterTable
ALTER TABLE "menus" DROP COLUMN "permission_id";

-- CreateIndex
CREATE INDEX "menu_permissions_permission_id_idx" ON "menu_permissions"("permission_id");

-- AddForeignKey
ALTER TABLE "menu_permissions" ADD CONSTRAINT "menu_permissions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_permissions" ADD CONSTRAINT "menu_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
