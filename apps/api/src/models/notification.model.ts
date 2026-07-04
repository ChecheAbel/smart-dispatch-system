import type { NotificationChannel, Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

const SENSITIVE_SETTING_KEYS = new Set([
  "smtp_password",
  "api_key",
  "api_secret",
  "auth_token",
  "api_token",
]);

export type UpdateNotificationConfigurationInput = {
  isEnabled?: boolean;
  provider?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  senderId?: string | null;
  settings?: Record<string, unknown>;
};

function parseSettings(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function parseNotificationSettings(value: Prisma.JsonValue) {
  return parseSettings(value);
}

export function settingsHaveCredentials(settings: Record<string, unknown>) {
  return Object.entries(settings).some(([key, value]) => {
    if (!SENSITIVE_SETTING_KEYS.has(key)) {
      return false;
    }

    return typeof value === "string" && value.trim().length > 0;
  });
}

export function sanitizeNotificationSettings(settings: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settings)) {
    if (SENSITIVE_SETTING_KEYS.has(key)) {
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

export async function findNotificationConfigurationByChannel(channel: NotificationChannel) {
  return prisma.notificationConfiguration.findUnique({
    where: { channel },
  });
}

export async function upsertNotificationConfiguration(
  channel: NotificationChannel,
  input: UpdateNotificationConfigurationInput,
) {
  const existing = await findNotificationConfigurationByChannel(channel);
  const currentSettings = parseSettings(existing?.settings ?? {});
  const nextSettings = input.settings
    ? {
        ...currentSettings,
        ...input.settings,
      }
    : currentSettings;

  for (const key of SENSITIVE_SETTING_KEYS) {
    const value = nextSettings[key];
    if (typeof value === "string" && !value.trim()) {
      delete nextSettings[key];
    }
  }

  const data = {
    ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
    ...(input.provider !== undefined ? { provider: input.provider } : {}),
    ...(input.fromEmail !== undefined ? { fromEmail: input.fromEmail } : {}),
    ...(input.fromName !== undefined ? { fromName: input.fromName } : {}),
    ...(input.replyTo !== undefined ? { replyTo: input.replyTo } : {}),
    ...(input.senderId !== undefined ? { senderId: input.senderId } : {}),
    ...(input.settings !== undefined
      ? { settings: nextSettings as Prisma.InputJsonValue }
      : {}),
  };

  if (existing) {
    return prisma.notificationConfiguration.update({
      where: { channel },
      data,
    });
  }

  return prisma.notificationConfiguration.create({
    data: {
      channel,
      isEnabled: input.isEnabled ?? false,
      provider: input.provider ?? null,
      fromEmail: input.fromEmail ?? null,
      fromName: input.fromName ?? null,
      replyTo: input.replyTo ?? null,
      senderId: input.senderId ?? null,
      settings: nextSettings as Prisma.InputJsonValue,
    },
  });
}

export async function ensureNotificationConfigurations() {
  for (const channel of ["email", "sms"] as const) {
    await prisma.notificationConfiguration.upsert({
      where: { channel },
      update: channel === "sms" ? { provider: "afrosms" } : {},
      create: {
        channel,
        isEnabled: false,
        provider: channel === "sms" ? "afrosms" : null,
        settings:
          channel === "sms"
            ? ({ api_url: "https://api.afromessage.com/api/send" } as Prisma.InputJsonValue)
            : {},
      },
    });
  }
}
