import { prisma } from "../db/prisma";
import { Prisma } from "../generated/prisma";
import type {
  CustomerPaymentOptions,
  PaymentGatewayField,
  PaymentGatewayKind,
  PaymentGatewayMethod,
} from "@smart-dispatch/types";
import {
  createPaymentGatewayId,
  createPaymentGatewayMethod,
  defaultDescriptionForKind,
  defaultFieldsForKind,
  defaultNameForKind,
  getPaymentGatewayDefaultsFromEnv,
} from "../config/customer-payment-options";

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
  paymentGateway: "payment_gateway",
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

export type PaymentGatewaySettings = CustomerPaymentOptions;

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
let cachedPaymentGateway: PaymentGatewaySettings = getPaymentGatewayDefaultsFromEnv();

export function getDeadlineSettings() {
  return cachedSettings;
}

export function getBrandingSettings() {
  return cachedBranding;
}

export function getVatSettings() {
  return cachedVat;
}

export function getPaymentGatewaySettings() {
  return cachedPaymentGateway;
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

function parseGatewayKind(value: unknown): PaymentGatewayKind {
  if (value === "telebirr" || value === "cbe_birr" || value === "custom") {
    return value;
  }
  return "custom";
}

function parseGatewayFields(value: unknown, kind: PaymentGatewayKind): PaymentGatewayField[] {
  if (!Array.isArray(value)) {
    return defaultFieldsForKind(kind);
  }

  if (value.length === 0) {
    return kind === "custom" ? [] : defaultFieldsForKind(kind);
  }

  const fields = value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }
    const record = item as Record<string, unknown>;
    const key = typeof record.key === "string" ? record.key.trim() : "";
    if (!key) {
      return [];
    }
    const label =
      typeof record.label === "string" && record.label.trim()
        ? record.label.trim()
        : key;
    const fieldValue = typeof record.value === "string" ? record.value : "";
    return [{ key, label, value: fieldValue }];
  });

  if (fields.length > 0) return fields;
  return kind === "custom" ? [] : defaultFieldsForKind(kind);
}

const MAX_PAYMENT_METHOD_LOGO_URL_LENGTH = 512;

function parsePaymentMethodLogoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PAYMENT_METHOD_LOGO_URL_LENGTH) {
    return null;
  }
  if (
    trimmed.startsWith("/uploads/payment-methods/") ||
    trimmed.startsWith("/providers/")
  ) {
    return trimmed;
  }
  return null;
}

function parseGatewayMethod(
  value: unknown,
  index: number,
): PaymentGatewayMethod | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const kind = parseGatewayKind(record.kind);
  const id =
    typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
        : createPaymentGatewayId(kind);
  const name =
    typeof record.name === "string" && record.name.trim()
      ? record.name.trim()
      : defaultNameForKind(kind);
  const description =
    record.description === null
      ? null
      : typeof record.description === "string"
        ? record.description.trim() || null
        : defaultDescriptionForKind(kind);
  const sortOrder =
    typeof record.sort_order === "number" && Number.isFinite(record.sort_order)
      ? Math.trunc(record.sort_order)
      : index;
  const logoUrl = parsePaymentMethodLogoUrl(record.logo_url);

  return {
    id,
    kind,
    name,
    description,
    logo_url: logoUrl,
    enabled: record.enabled === undefined ? true : record.enabled === true,
    sort_order: sortOrder,
    fields: parseGatewayFields(record.fields, kind),
  };
}

function migrateLegacyPaymentGateway(
  record: Record<string, unknown>,
  fallback: PaymentGatewaySettings,
): PaymentGatewaySettings | null {
  if (!("telebirr" in record) && !("cbe_birr" in record)) {
    return null;
  }

  const legacyTelebirr =
    typeof record.telebirr === "object" && record.telebirr !== null && !Array.isArray(record.telebirr)
      ? (record.telebirr as Record<string, unknown>)
      : null;
  const legacyCbe =
    typeof record.cbe_birr === "object" && record.cbe_birr !== null && !Array.isArray(record.cbe_birr)
      ? (record.cbe_birr as Record<string, unknown>)
      : null;

  const methods: PaymentGatewayMethod[] = [];

  if (legacyTelebirr) {
    const defaults = fallback.methods.find((method) => method.kind === "telebirr");
    methods.push(
      createPaymentGatewayMethod("telebirr", {
        id: "telebirr",
        enabled:
          legacyTelebirr.enabled === undefined
            ? (defaults?.enabled ?? true)
            : legacyTelebirr.enabled === true,
        sort_order: 0,
        fields: [
          {
            key: "merchant_name",
            label: "Merchant name",
            value:
              typeof legacyTelebirr.merchant_name === "string"
                ? legacyTelebirr.merchant_name
                : "",
          },
          {
            key: "short_code",
            label: "Short code",
            value:
              typeof legacyTelebirr.short_code === "string" ? legacyTelebirr.short_code : "",
          },
          {
            key: "ussd",
            label: "USSD",
            value:
              typeof legacyTelebirr.ussd === "string" && legacyTelebirr.ussd.trim()
                ? legacyTelebirr.ussd
                : "*127#",
          },
        ],
      }),
    );
  }

  if (legacyCbe) {
    const defaults = fallback.methods.find((method) => method.kind === "cbe_birr");
    methods.push(
      createPaymentGatewayMethod("cbe_birr", {
        id: "cbe_birr",
        enabled:
          legacyCbe.enabled === undefined
            ? (defaults?.enabled ?? true)
            : legacyCbe.enabled === true,
        sort_order: 1,
        fields: [
          {
            key: "account_name",
            label: "Account name",
            value: typeof legacyCbe.account_name === "string" ? legacyCbe.account_name : "",
          },
          {
            key: "account_number",
            label: "Account number",
            value:
              typeof legacyCbe.account_number === "string" ? legacyCbe.account_number : "",
          },
        ],
      }),
    );
  }

  return methods.length > 0 ? { methods } : null;
}

export function parsePaymentGatewayValue(
  value: Prisma.JsonValue | undefined,
  fallback: PaymentGatewaySettings = getPaymentGatewayDefaultsFromEnv(),
): PaymentGatewaySettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return structuredClone(fallback);
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.methods)) {
    const methods = record.methods
      .map((item, index) => parseGatewayMethod(item, index))
      .filter((item): item is PaymentGatewayMethod => Boolean(item))
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((method, index) => ({ ...method, sort_order: index }));

    return { methods };
  }

  const legacy = migrateLegacyPaymentGateway(record, fallback);
  return legacy ?? structuredClone(fallback);
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
  const envPaymentDefaults = getPaymentGatewayDefaultsFromEnv();
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
    paymentGatewayValue,
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
    readJsonSetting(APP_SETTING_KEYS.paymentGateway),
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
  cachedPaymentGateway = parsePaymentGatewayValue(paymentGatewayValue, envPaymentDefaults);

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
    upsertJsonSetting(APP_SETTING_KEYS.paymentGateway, cachedPaymentGateway),
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

export async function updatePaymentGatewaySettings(input: PaymentGatewaySettings) {
  cachedPaymentGateway = parsePaymentGatewayValue(input, getPaymentGatewayDefaultsFromEnv());
  await upsertJsonSetting(APP_SETTING_KEYS.paymentGateway, cachedPaymentGateway);
  return cachedPaymentGateway;
}

export function getRideRequestSettings() {
  return cachedSettings;
}
