import type { AccountStatus, AssignedVehicleSummary, User } from "@smart-dispatch/types";

export type DriverAssignmentFilter = "all" | "assigned" | "unassigned";
export type DriverStatusFilter = "all" | AccountStatus;

export const DRIVER_STATUS_CONFIG: Record<
  AccountStatus,
  {
    dotClass: string;
    badgeClass: string;
    pulse?: boolean;
  }
> = {
  active: {
    dotClass: "bg-emerald-500",
    badgeClass:
      "border-emerald-200/90 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  suspended: {
    dotClass: "bg-amber-500",
    badgeClass:
      "border-amber-200/90 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  },
  deactivated: {
    dotClass: "bg-red-500",
    badgeClass:
      "border-red-200/90 bg-red-50/80 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    pulse: true,
  },
};

export function formatDriverName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

export function getDriverInitials(user: User): string {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? user.middle_name?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "DR";
}

export function formatAssignedVehicle(vehicle: AssignedVehicleSummary | null | undefined) {
  if (!vehicle) {
    return null;
  }

  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name ? `${vehicle.plate_number} · ${name}` : vehicle.plate_number;
}

export function formatPercent(rate: number | null | undefined) {
  if (rate == null || Number.isNaN(rate)) {
    return null;
  }

  return `${Math.round(rate * 100)}%`;
}

export function statusBadgeClass(status: AccountStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "suspended":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "deactivated":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "";
  }
}
