import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Droplets,
  Gauge,
  History,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import type {
  Vehicle,
  VehicleHistoryEvent,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import { adminInputClass } from "@/lib/admin-theme";
import { formatMessage } from "@/translations";
import { cn } from "@/lib/utils";

export type DetailTab = "overview" | "compliance" | "maintenance" | "history";

export type ComplianceForm = {
  insurance_provider: string;
  insurance_policy_number: string;
  insurance_issued_at: string;
  insurance_expires_at: string;
  insurance_notes: string;
  inspection_center: string;
  inspection_certificate_number: string;
  inspection_performed_at: string;
  inspection_expires_at: string;
  inspection_notes: string;
};

export const emptyComplianceForm: ComplianceForm = {
  insurance_provider: "",
  insurance_policy_number: "",
  insurance_issued_at: "",
  insurance_expires_at: "",
  insurance_notes: "",
  inspection_center: "",
  inspection_certificate_number: "",
  inspection_performed_at: "",
  inspection_expires_at: "",
  inspection_notes: "",
};

export function vehicleToComplianceForm(vehicle: Vehicle): ComplianceForm {
  return {
    insurance_provider: vehicle.insurance_provider ?? "",
    insurance_policy_number: vehicle.insurance_policy_number ?? "",
    insurance_issued_at: vehicle.insurance_issued_at ?? "",
    insurance_expires_at: vehicle.insurance_expires_at ?? "",
    insurance_notes: vehicle.insurance_notes ?? "",
    inspection_center: vehicle.inspection_center ?? "",
    inspection_certificate_number: vehicle.inspection_certificate_number ?? "",
    inspection_performed_at: vehicle.inspection_performed_at ?? "",
    inspection_expires_at: vehicle.inspection_expires_at ?? "",
    inspection_notes: vehicle.inspection_notes ?? "",
  };
}

export function complianceFormToPayload(form: ComplianceForm) {
  return {
    insurance_provider: form.insurance_provider.trim() || null,
    insurance_policy_number: form.insurance_policy_number.trim() || null,
    insurance_issued_at: form.insurance_issued_at || null,
    insurance_expires_at: form.insurance_expires_at || null,
    insurance_notes: form.insurance_notes.trim() || null,
    inspection_center: form.inspection_center.trim() || null,
    inspection_certificate_number: form.inspection_certificate_number.trim() || null,
    inspection_performed_at: form.inspection_performed_at || null,
    inspection_expires_at: form.inspection_expires_at || null,
    inspection_notes: form.inspection_notes.trim() || null,
  };
}

export type ExpiryTone = "ok" | "dueSoon" | "expired" | "notSet";

export const textareaClassName = cn(
  adminInputClass,
  "min-h-[88px] h-auto w-full resize-y py-2.5 leading-relaxed placeholder:text-slate-400 focus-visible:border-[#1C3A34] focus-visible:ring-3 focus-visible:ring-[#1C3A34]/10",
);

export const MAINTENANCE_STATUSES: VehicleMaintenanceStatus[] = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
];

export function parseDateInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatDateInputValue(date: Date | undefined): string {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function maintenanceTypeIcon(slug: string) {
  switch (slug) {
    case "scheduled":
      return CalendarClock;
    case "repair":
      return Wrench;
    case "inspection":
      return ShieldCheck;
    case "tire":
      return Gauge;
    case "oil":
      return Droplets;
    case "accident":
      return AlertTriangle;
    default:
      return ClipboardList;
  }
}

export function parseTab(value: string | null): DetailTab {
  if (value === "compliance" || value === "maintenance" || value === "history") return value;
  return "overview";
}

export function formatComplianceDate(value: string | null | undefined, locale: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

export function vehicleStatusBadgeClass(status: Vehicle["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "maintenance":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "retired":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function maintenanceStatusClass(status: VehicleMaintenanceStatus) {
  switch (status) {
    case "open":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function historyIcon(eventType: VehicleHistoryEvent["event_type"]) {
  switch (eventType) {
    case "maintenance_opened":
    case "maintenance_updated":
    case "maintenance_completed":
    case "maintenance_cancelled":
      return Wrench;
    case "expiry_updated":
      return CalendarClock;
    case "driver_assigned":
    case "driver_unassigned":
      return UserRound;
    case "status_changed":
      return AlertTriangle;
    default:
      return History;
  }
}
