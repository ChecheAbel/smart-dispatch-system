-- CreateEnum
CREATE TYPE "notification_delivery_status" AS ENUM ('sent', 'skipped', 'failed');

-- CreateTable
CREATE TABLE "notification_delivery_logs" (
    "id" UUID NOT NULL,
    "status" "notification_delivery_status" NOT NULL,
    "module" "notification_module" NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "recipient" "notification_template_recipient" NOT NULL,
    "template_id" UUID,
    "entity_type" VARCHAR(50),
    "entity_id" VARCHAR(255),
    "recipient_contact" VARCHAR(255),
    "subject" VARCHAR(255),
    "body_preview" VARCHAR(500),
    "error_message" VARCHAR(500),
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_delivery_logs_created_at_idx" ON "notification_delivery_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notification_delivery_logs_status_idx" ON "notification_delivery_logs"("status");

-- CreateIndex
CREATE INDEX "notification_delivery_logs_module_event_idx" ON "notification_delivery_logs"("module", "event");

-- AddForeignKey
ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
