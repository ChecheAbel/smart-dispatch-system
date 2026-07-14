import type { VehicleStatus } from "@smart-dispatch/types";

/** Placeholder availability for non-active vehicles shown in the book catalog. */
const BUSY_AVAILABLE_HOUR = 8;
const BUSY_AVAILABLE_MINUTE = 30;

export function isVehicleAvailableNow(status: VehicleStatus) {
  return status === "active";
}

/**
 * Earliest datetime a vehicle can be booked.
 * Active vehicles: now. In-service vehicles: next calendar day at 08:30
 * (matches the catalog "In Service - Available:" label).
 */
export function getVehicleAvailableFrom(status: VehicleStatus, now = new Date()) {
  if (isVehicleAvailableNow(status)) {
    return new Date(now);
  }

  const available = new Date(now);
  available.setDate(available.getDate() + 1);
  available.setHours(BUSY_AVAILABLE_HOUR, BUSY_AVAILABLE_MINUTE, 0, 0);
  return available;
}

/** Latest (strictest) available-from among selected vehicles — booking must be on/after this. */
export function getEarliestBookableAt(
  vehicles: Array<{ status: VehicleStatus }>,
  now = new Date(),
) {
  if (vehicles.length === 0) {
    return new Date(now);
  }

  let latest = new Date(now);
  for (const vehicle of vehicles) {
    const availableFrom = getVehicleAvailableFrom(vehicle.status, now);
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
