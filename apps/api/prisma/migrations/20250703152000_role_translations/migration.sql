-- CreateTable
CREATE TABLE "role_translations" (
    "role_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "role_translations_pkey" PRIMARY KEY ("role_id","locale")
);

-- Migrate existing English labels from roles
INSERT INTO "role_translations" ("role_id", "locale", "name", "description")
SELECT "id", 'en', "name", "description" FROM "roles";

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "name",
DROP COLUMN "description";

-- CreateIndex
CREATE INDEX "role_translations_locale_idx" ON "role_translations"("locale");

-- AddForeignKey
ALTER TABLE "role_translations" ADD CONSTRAINT "role_translations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
