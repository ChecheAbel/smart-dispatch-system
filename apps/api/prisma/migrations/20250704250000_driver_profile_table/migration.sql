-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "license_photo_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- Migrate existing driver data from users
INSERT INTO "drivers" ("id", "user_id", "license_number", "license_photo_url", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "driver_license_number", "driver_license_photo_url", NOW(), NOW()
FROM "users"
WHERE "driver_license_number" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

CREATE INDEX "drivers_license_number_idx" ON "drivers"("license_number");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn
DROP INDEX IF EXISTS "users_driver_license_number_key";

ALTER TABLE "users" DROP COLUMN "driver_license_number",
DROP COLUMN "driver_license_photo_url";
