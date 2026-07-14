import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma";

export const APP_SETTING_KEYS = {
  rideRequestCancelGraceMinutes: "ride_request_cancel_grace_minutes",
  rideRequestEditGraceMinutes: "ride_request_edit_grace_minutes",
  invoiceDueSoonDays: "invoice_due_soon_days",
  insuranceDueSoonDays: "insurance_due_soon_days",
  inspectionDueSoonDays: "inspection_due_soon_days",
} as const;

type DeadlineSettingKey =
  (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

export type DeadlineSettings = {
  ride_request_cancel_grace_minutes: number;
  ride_request_edit_grace_minutes: number;
  invoice_due_soon_days: number;
  insurance_due_soon_days: number;
  inspection_due_soon_days: number;
};

const DEFAULT_DEADLINE_SETTINGS: DeadlineSettings = {
  ride_request_cancel_grace_minutes: 15,
  ride_request_edit_grace_minutes: 15,
  invoice_due_soon_days: 3,
  insurance_due_soon_days: 30,
  inspection_due_soon_days: 30,
};

let cachedSettings: DeadlineSettings = { ...DEFAULT_DEADLINE_SETTINGS };

export function getDeadlineSettings() {
  return cachedSettings;
}

function toPositiveInteger(
  value: Prisma.JsonValue | undefined,
  fallback: number,
) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const minutes = (value as Record<string, unknown>).minutes;
    if (
      typeof minutes === "number" &&
      Number.isFinite(minutes) &&
      minutes > 0
    ) {
      return Math.trunc(minutes);
    }
    const days = (value as Record<string, unknown>).days;
    if (typeof days === "number" && Number.isFinite(days) && days > 0) {
      return Math.trunc(days);
    }
  }

  return fallback;
}

async function readSetting(key: DeadlineSettingKey, fallback: number) {
  const setting = await prisma.$queryRaw<Array<{ value: Prisma.JsonValue }>>`
    SELECT "value"
    FROM "app_settings"
    WHERE "key" = ${key}
    LIMIT 1
  `;

  return toPositiveInteger(setting[0]?.value, fallback);
}

async function upsertSetting(
  key: DeadlineSettingKey,
  value: Record<string, number>,
) {
  return prisma.$executeRaw`
    INSERT INTO "app_settings" ("key", "value", "created_at", "updated_at")
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW(), NOW())
    ON CONFLICT ("key")
    DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = NOW()
  `;
}

export async function loadAppSettings() {
  const [
    rideRequestCancelGraceMinutes,
    rideRequestEditGraceMinutes,
    invoiceDueSoonDays,
    insuranceDueSoonDays,
    inspectionDueSoonDays,
  ] = await Promise.all([
    readSetting(
      APP_SETTING_KEYS.rideRequestCancelGraceMinutes,
      DEFAULT_DEADLINE_SETTINGS.ride_request_cancel_grace_minutes,
    ),
    readSetting(
      APP_SETTING_KEYS.rideRequestEditGraceMinutes,
      DEFAULT_DEADLINE_SETTINGS.ride_request_edit_grace_minutes,
    ),
    readSetting(
      APP_SETTING_KEYS.invoiceDueSoonDays,
      DEFAULT_DEADLINE_SETTINGS.invoice_due_soon_days,
    ),
    readSetting(
      APP_SETTING_KEYS.insuranceDueSoonDays,
      DEFAULT_DEADLINE_SETTINGS.insurance_due_soon_days,
    ),
    readSetting(
      APP_SETTING_KEYS.inspectionDueSoonDays,
      DEFAULT_DEADLINE_SETTINGS.inspection_due_soon_days,
    ),
  ]);

  cachedSettings = {
    ride_request_cancel_grace_minutes: rideRequestCancelGraceMinutes,
    ride_request_edit_grace_minutes: rideRequestEditGraceMinutes,
    invoice_due_soon_days: invoiceDueSoonDays,
    insurance_due_soon_days: insuranceDueSoonDays,
    inspection_due_soon_days: inspectionDueSoonDays,
  };

  await Promise.all([
    upsertSetting(APP_SETTING_KEYS.rideRequestCancelGraceMinutes, {
      minutes: rideRequestCancelGraceMinutes,
    }),
    upsertSetting(APP_SETTING_KEYS.rideRequestEditGraceMinutes, {
      minutes: rideRequestEditGraceMinutes,
    }),
    upsertSetting(APP_SETTING_KEYS.invoiceDueSoonDays, {
      days: invoiceDueSoonDays,
    }),
    upsertSetting(APP_SETTING_KEYS.insuranceDueSoonDays, {
      days: insuranceDueSoonDays,
    }),
    upsertSetting(APP_SETTING_KEYS.inspectionDueSoonDays, {
      days: inspectionDueSoonDays,
    }),
  ]);

  return cachedSettings;
}

export async function updateDeadlineSettings(input: DeadlineSettings) {
  cachedSettings = input;
  await Promise.all([
    upsertSetting(APP_SETTING_KEYS.rideRequestCancelGraceMinutes, {
      minutes: input.ride_request_cancel_grace_minutes,
    }),
    upsertSetting(APP_SETTING_KEYS.rideRequestEditGraceMinutes, {
      minutes: input.ride_request_edit_grace_minutes,
    }),
    upsertSetting(APP_SETTING_KEYS.invoiceDueSoonDays, {
      days: input.invoice_due_soon_days,
    }),
    upsertSetting(APP_SETTING_KEYS.insuranceDueSoonDays, {
      days: input.insurance_due_soon_days,
    }),
    upsertSetting(APP_SETTING_KEYS.inspectionDueSoonDays, {
      days: input.inspection_due_soon_days,
    }),
  ]);
}

export function getRideRequestSettings() {
  return cachedSettings;
}
