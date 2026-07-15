import type { VehicleComplianceStatus } from "@smart-dispatch/types";
import { formatMessage } from "@/translations";
import { formatEthiopianDate } from "./ethiopian-calendar";

export type ExpiryTone = "ok" | "dueSoon" | "expired" | "notSet";

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${value}T00:00:00`);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryTone(value: string | null | undefined): ExpiryTone {
  const diff = daysUntil(value);
  if (diff == null) return "notSet";
  if (diff < 0) return "expired";
  if (diff <= 30) return "dueSoon";
  return "ok";
}

export function expiryToneToComplianceStatus(tone: ExpiryTone): VehicleComplianceStatus {
  switch (tone) {
    case "dueSoon":
      return "due_soon";
    case "notSet":
      return "not_set";
    default:
      return tone;
  }
}

export function complianceStatusToExpiryTone(status: VehicleComplianceStatus): ExpiryTone {
  switch (status) {
    case "due_soon":
      return "dueSoon";
    case "not_set":
      return "notSet";
    default:
      return status;
  }
}

export function expiryToneClass(tone: ExpiryTone) {
  switch (tone) {
    case "expired":
      return "border-red-200 bg-red-50 text-red-800";
    case "dueSoon":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "notSet":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function formatComplianceDate(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (locale === "am") {
    return formatEthiopianDate(date, "am");
  }
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatExpiryCountdown(
  value: string | null | undefined,
  messages: {
    expiresToday: string;
    expiresInDays: string;
    expiredDaysAgo: string;
  },
) {
  const diff = daysUntil(value);
  if (diff == null) return null;
  if (diff < 0) {
    return formatMessage(messages.expiredDaysAgo, { count: String(Math.abs(diff)) });
  }
  if (diff === 0) return messages.expiresToday;
  return formatMessage(messages.expiresInDays, { count: String(diff) });
}
