import type { DriverAttendanceStatus } from "@smart-dispatch/types";
import { adminBadgeGoldClass, adminBadgeSuccessClass } from "@/lib/admin-theme";

export const ATTENDANCE_STATUSES: DriverAttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "on_leave",
  "off_duty",
];

export const ATTENDANCE_STATUS_FILTERS = ["all", "unmarked", ...ATTENDANCE_STATUSES] as const;

export type AttendanceStatusFilter = (typeof ATTENDANCE_STATUS_FILTERS)[number];

export function addisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

export function formatAssignedVehicle(
  vehicle: { plate_number: string; make: string | null; model: string | null } | null,
) {
  if (!vehicle) return null;
  const model = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return model ? `${vehicle.plate_number} · ${model}` : vehicle.plate_number;
}

export function formatAttendanceTime(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Addis_Ababa",
  }).format(new Date(value));
}

export function attendanceStatusClass(status: DriverAttendanceStatus | "unmarked") {
  if (status === "present") return adminBadgeSuccessClass;
  if (status === "late") {
    return "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50 dark:border-amber-400/35 dark:bg-amber-400/14 dark:text-amber-200";
  }
  if (status === "absent") {
    return "border-red-200 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-400/35 dark:bg-red-400/14 dark:text-red-200";
  }
  if (status === "on_leave") return adminBadgeGoldClass;
  if (status === "off_duty") {
    return "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50 dark:border-border dark:bg-muted dark:text-muted-foreground";
  }
  return "border-dashed border-slate-200 bg-transparent text-slate-500 hover:bg-transparent dark:border-border";
}

export function attendanceStatusDotClass(status: AttendanceStatusFilter) {
  if (status === "present") return "bg-emerald-500";
  if (status === "late") return "bg-amber-500";
  if (status === "absent") return "bg-red-500";
  if (status === "on_leave") return "bg-[#c4a35a]";
  if (status === "off_duty") return "bg-slate-400";
  if (status === "unmarked") return "bg-white ring-1 ring-slate-300 dark:bg-transparent dark:ring-border";
  return "bg-slate-300";
}
