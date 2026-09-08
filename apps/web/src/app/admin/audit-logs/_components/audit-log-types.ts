import { format } from "date-fns";
import type { AuditAction, AuditLog } from "@smart-dispatch/types";
import { formatEthiopianDate, formatEthiopianTime } from "@/lib/ethiopian-calendar";
import type { AdminAuditLogsMessages } from "@/translations";

export const MODULE_OPTIONS = [
  "users",
  "roles",
  "menus",
  "notifications",
  "auth",
  "audit_logs",
  "vehicle_types",
  "vehicle_classes",
  "vehicles",
  "maintenance_work_types",
  "regions",
  "locations",
  "ride_requests",
  "contracts",
  "invoices",
  "fare_plans",
  "booking_policies",
  "driver_shifts",
  "driver_attendance",
  "complaints",
] as const;

export type AuditModule = (typeof MODULE_OPTIONS)[number];

export const ACTION_OPTIONS: AuditAction[] = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "assign",
  "revoke",
  "test",
];

export function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (locale === "am") {
    return `${formatEthiopianDate(date, "am")} (${formatEthiopianTime(date, "am")})`;
  }
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toStartOfDayIso(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}

export function toEndOfDayIso(date: string) {
  const value = new Date(`${date}T23:59:59.999`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function actionBadgeConfig(action: AuditAction) {
  switch (action) {
    case "create":
    case "login":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/12 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "delete":
    case "revoke":
      return {
        badge: "border-red-200 bg-red-50 text-red-800 dark:border-red-400/35 dark:bg-red-500/12 dark:text-red-300",
        dot: "bg-red-500",
      };
    case "update":
    case "assign":
      return {
        badge: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/12 dark:text-sky-300",
        dot: "bg-sky-500",
      };
    case "test":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/12 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    default:
      return {
        badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-border dark:bg-muted dark:text-muted-foreground",
        dot: "bg-slate-400",
      };
  }
}

export function formatAuditSummary(log: AuditLog, copy: AdminAuditLogsMessages) {
  if (log.summary?.trim()) {
    return log.summary;
  }

  if (log.request_path?.includes("/roles") && log.module === "users") {
    const target = log.entity_label ? ` (${log.entity_label})` : "";
    if (log.action === "delete") {
      return `Removed role from user${target}`;
    }
    if (log.action === "create") {
      return `Assigned role to user${target}`;
    }
    return `Updated user roles${target}`;
  }

  const moduleLabel = copy.moduleLabels[log.module as keyof typeof copy.moduleLabels] ?? log.module;
  const actionLabel = copy.actionLabels[log.action];
  const target = log.entity_label ? ` (${log.entity_label})` : "";

  return `${actionLabel} — ${moduleLabel}${target}`;
}
