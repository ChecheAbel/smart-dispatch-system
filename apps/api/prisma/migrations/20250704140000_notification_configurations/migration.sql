CREATE TYPE "notification_channel" AS ENUM ('email', 'sms');

CREATE TABLE "notification_configurations" (
    "id" UUID NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" VARCHAR(100),
    "from_email" VARCHAR(255),
    "from_name" VARCHAR(255),
    "reply_to" VARCHAR(255),
    "sender_id" VARCHAR(100),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_configurations_channel_key" ON "notification_configurations"("channel");
