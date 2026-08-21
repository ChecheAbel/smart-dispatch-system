import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma";

export const APP_SETTING_KEYS = {
  rideRequestCancelGraceMinutes: "ride_request_cancel_grace_minutes",
  rideRequestEditGraceMinutes: "ride_request_edit_grace_minutes",
  rideRequestReminderHours: "ride_request_reminder_hours",
  dispatchEscalateDispatcherMinutes: "dispatch_escalate_dispatcher_minutes",
  dispatchEscalateSupervisorMinutes: "dispatch_escalate_supervisor_minutes",
  invoiceDueSoonDays: "invoice_due_soon_days",
  insuranceDueSoonDays: "insurance_due_soon_days",
  inspectionDueSoonDays: "inspection_due_soon_days",
  branding: "branding",
  invoiceVat: "invoice_vat",
} as const;

type DeadlineSettingKey =
  | typeof APP_SETTING_KEYS.rideRequestCancelGraceMinutes
  | typeof APP_SETTING_KEYS.rideRequestEditGraceMinutes
  | typeof APP_SETTING_KEYS.rideRequestReminderHours
  | typeof APP_SETTING_KEYS.dispatchEscalateDispatcherMinutes
  | typeof APP_SETTING_KEYS.dispatchEscalateSupervisorMinutes
  | typeof APP_SETTING_KEYS.invoiceDueSoonDays
  | typeof APP_SETTING_KEYS.insuranceDueSoonDays
  | typeof APP_SETTING_KEYS.inspectionDueSoonDays;

export type DeadlineSettings = {
  ride_request_cancel_grace_minutes: number;
  ride_request_edit_grace_minutes: number;
  ride_request_reminder_hours: number;
  dispatch_escalate_dispatcher_minutes: number;
  dispatch_escalate_supervisor_minutes: number;
  invoice_due_soon_days: number;
  insurance_due_soon_days: number;
  inspection_due_soon_days: number;
};

export type VatSettings = {
  enabled: boolean;
  rate_percent: number;
};

export type BrandingSettings = {
  company_name: string;
  product_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  support_email: string | null;
  support_phone: string | null;
  website_url: string | null;
};

const DEFAULT_DEADLINE_SETTINGS: DeadlineSettings = {
  ride_request_cancel_grace_minutes: 15,
  ride_request_edit_grace_minutes: 15,
  ride_request_reminder_hours: 2,
  dispatch_escalate_dispatcher_minutes: 15,
  dispatch_escalate_supervisor_minutes: 30,
  invoice_due_soon_days: 3,
  insurance_due_soon_days: 30,
  inspection_due_soon_days: 30,
};

export const DEFAULT_VAT_SETTINGS: VatSettings = {
  enabled: false,
  rate_percent: 15,
};

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  company_name: "Ethiopian Investment Holdings",
  product_name: "Smart Dispatch",
  logo_url: null,
  primary_color: "#1C3A34",
  accent_color: "#C9B87A",
  support_email: null,
  support_phone: null,
  website_url: null,
};

let cachedSettings: DeadlineSettings = { ...DEFAULT_DEADLINE_SETTINGS };
let cachedBranding: BrandingSettings = { ...DEFAULT_BRANDING_SETTINGS };
let cachedVat: VatSettings = { ...DEFAULT_VAT_SETTINGS };

export function getDeadlineSettings() {
  return cachedSettings;
}

export function getBrandingSettings() {
  return cachedBranding;
}

export function getVatSettings() {
  return cachedVat;
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
    const hours = (value as Record<string, unknown>).hours;
    if (typeof hours === "number" && Number.isFinite(hours) && hours > 0) {
      return Math.trunc(hours);
    }
    const days = (value as Record<string, unknown>).days;
    if (typeof days === "number" && Number.isFinite(days) && days > 0) {
      return Math.trunc(days);
    }
  }

  return fallback;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function toOptionalTrimmedString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseBrandingValue(value: Prisma.JsonValue | undefined): BrandingSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_BRANDING_SETTINGS };
  }

  const record = value as Record<string, unknown>;

  return {
    company_name:
      typeof record.company_name === "string" && record.company_name.trim()
        ? record.company_name.trim()
        : DEFAULT_BRANDING_SETTINGS.company_name,
    product_name:
      typeof record.product_name === "string" && record.product_name.trim()
        ? record.product_name.trim()
        : DEFAULT_BRANDING_SETTINGS.product_name,
    logo_url:
      typeof record.logo_url === "string" && record.logo_url.trim()
        ? record.logo_url.trim()
        : null,
    primary_color: isHexColor(record.primary_color)
      ? record.primary_color.trim()
      : DEFAULT_BRANDING_SETTINGS.primary_color,
    accent_color: isHexColor(record.accent_color)
      ? record.accent_color.trim()
      : DEFAULT_BRANDING_SETTINGS.accent_color,
    support_email: toOptionalTrimmedString(record.support_email),
    support_phone: toOptionalTrimmedString(record.support_phone),
    website_url: toOptionalTrimmedString(record.website_url),
  };
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

async function readJsonSetting(key: string) {
  const setting = await prisma.$queryRaw<Array<{ value: Prisma.JsonValue }>>`
    SELECT "value"
    FROM "app_settings"
    WHERE "key" = ${key}
    LIMIT 1
  `;

  return setting[0]?.value;
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

function parseVatValue(value: Prisma.JsonValue | undefined): VatSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_VAT_SETTINGS };
  }

  const record = value as Record<string, unknown>;
  const rateRaw =
    typeof record.rate_percent === "number"
      ? record.rate_percent
      : typeof record.rate_percent === "string"
        ? Number(record.rate_percent)
        : DEFAULT_VAT_SETTINGS.rate_percent;
  const rate = Number.isFinite(rateRaw)
    ? Math.round(rateRaw * 100) / 100
    : DEFAULT_VAT_SETTINGS.rate_percent;

  return {
    enabled: record.enabled === true,
    rate_percent: Math.min(100, Math.max(0, rate)),
  };
}

export function applyVatToInvoiceSubtotal(subtotal: number, settings: VatSettings = cachedVat) {
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const vatRate = settings.enabled ? settings.rate_percent : 0;
  const vatAmount = Math.round(roundedSubtotal * (vatRate / 100) * 100) / 100;

  return {
    subtotal: roundedSubtotal,
    vatRate,
    vatAmount,
    totalAmount: Math.round((roundedSubtotal + vatAmount) * 100) / 100,
  };
}

async function upsertJsonSetting(key: string, value: unknown) {
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
    rideRequestReminderHours,
    dispatchEscalateDispatcherMinutes,
    dispatchEscalateSupervisorMinutes,
    invoiceDueSoonDays,
    insuranceDueSoonDays,
    inspectionDueSoonDays,
    brandingValue,
    vatValue,
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
      APP_SETTING_KEYS.rideRequestReminderHours,
      DEFAULT_DEADLINE_SETTINGS.ride_request_reminder_hours,
    ),
    readSetting(
      APP_SETTING_KEYS.dispatchEscalateDispatcherMinutes,
      DEFAULT_DEADLINE_SETTINGS.dispatch_escalate_dispatcher_minutes,
    ),
    readSetting(
      APP_SETTING_KEYS.dispatchEscalateSupervisorMinutes,
      DEFAULT_DEADLINE_SETTINGS.dispatch_escalate_supervisor_minutes,
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
    readJsonSetting(APP_SETTING_KEYS.branding),
    readJsonSetting(APP_SETTING_KEYS.invoiceVat),
  ]);

  cachedSettings = {
    ride_request_cancel_grace_minutes: rideRequestCancelGraceMinutes,
    ride_request_edit_grace_minutes: rideRequestEditGraceMinutes,
    ride_request_reminder_hours: rideRequestReminderHours,
    dispatch_escalate_dispatcher_minutes: dispatchEscalateDispatcherMinutes,
    dispatch_escalate_supervisor_minutes: Math.max(
      dispatchEscalateSupervisorMinutes,
      dispatchEscalateDispatcherMinutes,
    ),
    invoice_due_soon_days: invoiceDueSoonDays,
    insurance_due_soon_days: insuranceDueSoonDays,
    inspection_due_soon_days: inspectionDueSoonDays,
  };

  cachedBranding = parseBrandingValue(brandingValue);
  cachedVat = parseVatValue(vatValue);

  await Promise.all([
    upsertSetting(APP_SETTING_KEYS.rideRequestCancelGraceMinutes, {
      minutes: rideRequestCancelGraceMinutes,
    }),
    upsertSetting(APP_SETTING_KEYS.rideRequestEditGraceMinutes, {
      minutes: rideRequestEditGraceMinutes,
    }),
    upsertSetting(APP_SETTING_KEYS.rideRequestReminderHours, {
      hours: rideRequestReminderHours,
    }),
    upsertSetting(APP_SETTING_KEYS.dispatchEscalateDispatcherMinutes, {
      minutes: cachedSettings.dispatch_escalate_dispatcher_minutes,
    }),
    upsertSetting(APP_SETTING_KEYS.dispatchEscalateSupervisorMinutes, {
      minutes: cachedSettings.dispatch_escalate_supervisor_minutes,
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
    upsertJsonSetting(APP_SETTING_KEYS.branding, cachedBranding),
    upsertJsonSetting(APP_SETTING_KEYS.invoiceVat, cachedVat),
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
    upsertSetting(APP_SETTING_KEYS.rideRequestReminderHours, {
      hours: input.ride_request_reminder_hours,
    }),
    upsertSetting(APP_SETTING_KEYS.dispatchEscalateDispatcherMinutes, {
      minutes: input.dispatch_escalate_dispatcher_minutes,
    }),
    upsertSetting(APP_SETTING_KEYS.dispatchEscalateSupervisorMinutes, {
      minutes: input.dispatch_escalate_supervisor_minutes,
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

export async function updateBrandingSettings(input: BrandingSettings) {
  cachedBranding = {
    company_name: input.company_name.trim() || DEFAULT_BRANDING_SETTINGS.company_name,
    product_name: input.product_name.trim() || DEFAULT_BRANDING_SETTINGS.product_name,
    logo_url: input.logo_url?.trim() || null,
    primary_color: isHexColor(input.primary_color)
      ? input.primary_color.trim()
      : DEFAULT_BRANDING_SETTINGS.primary_color,
    accent_color: isHexColor(input.accent_color)
      ? input.accent_color.trim()
      : DEFAULT_BRANDING_SETTINGS.accent_color,
    support_email: toOptionalTrimmedString(input.support_email),
    support_phone: toOptionalTrimmedString(input.support_phone),
    website_url: toOptionalTrimmedString(input.website_url),
  };

  await upsertJsonSetting(APP_SETTING_KEYS.branding, cachedBranding);
  return cachedBranding;
}

export async function updateVatSettings(input: VatSettings) {
  cachedVat = parseVatValue(input);
  await upsertJsonSetting(APP_SETTING_KEYS.invoiceVat, cachedVat);
  return cachedVat;
}

export function getRideRequestSettings() {
  return cachedSettings;
}
