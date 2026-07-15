import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Droplets,
  Fuel,
  Gauge,
  History,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import type {
  Vehicle,
  VehicleFuelType,
  VehicleHistoryEvent,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import {
  expiryToneClass,
  formatComplianceDate,
  formatExpiryCountdown,
  getExpiryTone,
  type ExpiryTone,
} from "@/lib/vehicle-compliance";
import {
  type ComplianceForm,
  complianceFormToPayload,
  complianceTextareaClassName,
  emptyComplianceForm,
  formatDateInputValue,
  parseDateInputValue,
  vehicleToComplianceForm,
} from "@/lib/vehicle-compliance-form";
import { cn } from "@/lib/utils";

export type { ExpiryTone, ComplianceForm };
export {
  expiryToneClass,
  formatComplianceDate,
  formatExpiryCountdown,
  getExpiryTone,
  complianceFormToPayload,
  emptyComplianceForm,
  vehicleToComplianceForm,
  formatDateInputValue,
  parseDateInputValue,
};

export const textareaClassName = complianceTextareaClassName;

export type DetailTab = "overview" | "compliance" | "maintenance" | "fuel" | "history" | "tracking";

export const FUEL_TYPES: VehicleFuelType[] = ["diesel", "petrol", "other"];

export const MAINTENANCE_STATUSES: VehicleMaintenanceStatus[] = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
];

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
  if (value === "compliance" || value === "maintenance" || value === "fuel" || value === "history" || value === "tracking") {
    return value;
  }
  return "overview";
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

export function formatMaintenanceDate(value: string | null, locale?: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMaintenanceDateTime(value: string, locale?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFuelDateTime(value: string, locale?: string) {
  return formatMaintenanceDateTime(value, locale);
}

export function formatFuelQuantity(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} L`;
}

export function fuelTypeIcon(type: VehicleFuelType) {
  switch (type) {
    case "petrol":
      return Fuel;
    case "diesel":
      return Droplets;
    default:
      return Fuel;
  }
}

export function fuelEfficiencyClass(value: number | null) {
  if (value === null) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function formatFuelEfficiency(
  value: number | null,
  copy: { efficiencyValue: string; notSet: string; efficiencyUnavailable: string },
) {
  if (value === null) {
    return copy.efficiencyUnavailable;
  }

  return copy.efficiencyValue.replace("{value}", String(value));
}

export function historyIcon(eventType: VehicleHistoryEvent["event_type"]) {
  switch (eventType) {
    case "fuel_logged":
    case "fuel_updated":
      return Fuel;
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
