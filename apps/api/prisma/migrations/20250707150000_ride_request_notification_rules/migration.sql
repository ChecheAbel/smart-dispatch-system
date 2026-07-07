-- CreateEnum
CREATE TYPE "ride_request_notification_event" AS ENUM ('created', 'confirmed', 'rejected', 'assigned', 'started', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "notification_recipient" AS ENUM ('requester', 'driver');

-- CreateTable
CREATE TABLE "ride_request_notification_rules" (
    "id" UUID NOT NULL,
    "event" "ride_request_notification_event" NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "recipient" "notification_recipient" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "subject" VARCHAR(255),
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ride_request_notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ride_request_notification_rules_event_channel_recipient_key" ON "ride_request_notification_rules"("event", "channel", "recipient");
