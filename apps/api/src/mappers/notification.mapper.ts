import type { NotificationConfiguration } from "@smart-dispatch/types";
import type { NotificationConfiguration as DbNotificationConfiguration, Prisma } from "../generated/prisma";
import {
  sanitizeNotificationSettings,
  settingsHaveCredentials,
} from "../models/notification.model";

function parseSettings(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function toPublicNotificationConfiguration(
  config: DbNotificationConfiguration,
): NotificationConfiguration {
  const settings = parseSettings(config.settings);

  return {
    id: config.id,
    channel: config.channel,
    is_enabled: config.isEnabled,
    provider: config.provider,
    from_email: config.fromEmail,
    from_name: config.fromName,
    reply_to: config.replyTo,
    sender_id: config.senderId,
    settings: sanitizeNotificationSettings(settings),
    has_credentials: settingsHaveCredentials(settings),
    created_at: config.createdAt.toISOString(),
    updated_at: config.updatedAt.toISOString(),
  };
}
