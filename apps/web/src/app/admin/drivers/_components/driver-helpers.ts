import type { AccountStatus, AssignedVehicleSummary, User } from "@smart-dispatch/types";

export type DriverAssignmentFilter = "all" | "assigned" | "unassigned";
export type DriverStatusFilter = "all" | AccountStatus;

export function formatDriverName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

export function formatAssignedVehicle(vehicle: AssignedVehicleSummary | null | undefined) {
  if (!vehicle) {
    return null;
  }

  const name = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name ? `${vehicle.plate_number} · ${name}` : vehicle.plate_number;
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
