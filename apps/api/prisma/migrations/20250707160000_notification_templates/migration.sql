-- CreateEnum
CREATE TYPE "notification_module" AS ENUM ('ride_requests', 'user_registrations');

-- CreateEnum
CREATE TYPE "notification_template_recipient" AS ENUM ('requester', 'driver', 'applicant');

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "module" "notification_module" NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "recipient" "notification_template_recipient" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "subject" VARCHAR(255),
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_module_event_channel_recipient_key" ON "notification_templates"("module", "event", "channel", "recipient");

-- Migrate existing ride request rules when present
INSERT INTO "notification_templates" ("id", "module", "event", "channel", "recipient", "is_enabled", "subject", "body", "created_at", "updated_at")
SELECT
    "id",
    'ride_requests'::"notification_module",
    "event"::text,
    "channel",
    "recipient"::text::"notification_template_recipient",
    "is_enabled",
    "subject",
    "body",
    "created_at",
    "updated_at"
FROM "ride_request_notification_rules"
WHERE EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ride_request_notification_rules'
);

-- DropTable
DROP TABLE IF EXISTS "ride_request_notification_rules";

-- DropEnum
DROP TYPE IF EXISTS "ride_request_notification_event";
DROP TYPE IF EXISTS "notification_recipient";
