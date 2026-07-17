import type { Vehicle, VehicleStatus } from "@smart-dispatch/types";

/** Fallback when a busy vehicle has no scheduled return/start time. */
const BUSY_AVAILABLE_HOUR = 8;
const BUSY_AVAILABLE_MINUTE = 30;

type VehicleAvailabilitySource = Pick<Vehicle, "status"> &
  Partial<Pick<Vehicle, "is_available_now" | "available_from">>;

export function isVehicleAvailableNow(vehicle: VehicleAvailabilitySource | VehicleStatus) {
  if (typeof vehicle === "string") {
    return vehicle === "active";
  }

  if (typeof vehicle.is_available_now === "boolean") {
    return vehicle.is_available_now;
  }

  return vehicle.status === "active";
}

/**
 * Earliest datetime a vehicle can be booked.
 * Available vehicles: now.
 * Busy vehicles: active ride `scheduled_return_at` (or `scheduled_at`), else next day 08:30.
 */
export function getVehicleAvailableFrom(
  vehicle: VehicleAvailabilitySource | VehicleStatus,
  now = new Date(),
) {
  if (isVehicleAvailableNow(vehicle)) {
    return new Date(now);
  }

  if (typeof vehicle !== "string" && vehicle.available_from) {
    const fromAssignment = new Date(vehicle.available_from);
    if (!Number.isNaN(fromAssignment.getTime())) {
      return fromAssignment;
    }
  }

  const available = new Date(now);
  available.setDate(available.getDate() + 1);
  available.setHours(BUSY_AVAILABLE_HOUR, BUSY_AVAILABLE_MINUTE, 0, 0);
  return available;
}

/** Latest (strictest) available-from among selected vehicles — booking must be on/after this. */
export function getEarliestBookableAt(
  vehicles: VehicleAvailabilitySource[],
  now = new Date(),
) {
  if (vehicles.length === 0) {
    return new Date(now);
  }

  let latest = new Date(now);
  for (const vehicle of vehicles) {
    const availableFrom = getVehicleAvailableFrom(vehicle, now);
    if (availableFrom.getTime() > latest.getTime()) {
      latest = availableFrom;
    }
  }
  return latest;
}

export function formatVehicleAvailableFrom(date: Date, locale: string) {
  return date.toLocaleString(locale === "am" ? "am-ET" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toScheduleTimeValue(date: Date) {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

export function isScheduleBeforeAvailableFrom(
  scheduledDate: Date,
  scheduledTime: { hour: number; minute: number },
  availableFrom: Date,
) {
  const scheduled = new Date(scheduledDate);
  scheduled.setHours(scheduledTime.hour, scheduledTime.minute, 0, 0);
  return scheduled.getTime() < availableFrom.getTime();
}
