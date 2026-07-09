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

export type DetailTab = "overview" | "compliance" | "maintenance" | "history";

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
  if (value === "compliance" || value === "maintenance" || value === "history") return value;
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
