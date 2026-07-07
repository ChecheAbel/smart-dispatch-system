import type { RideRequestLocationOption, RideRequestStatus, VehicleType } from "@smart-dispatch/types";
import type { TimeValue } from "@/components/shared/admin-time-picker";
import { roundUpToMinuteInterval } from "@/components/shared/admin-time-picker";
import { startOfDay } from "date-fns";
import type { getCustomerRequestsMessages } from "@/translations";
import { formatMessage } from "@/translations";

export type RideRequestFormState = {
  pickupAddress: string;
  dropoffAddress: string;
  vehicleTypeId: string;
  vehicleClassId: string;
  regionId: string;
  passengerCount: string;
  notes: string;
};

export type RideRequestFieldErrors = Partial<
  Record<
    | keyof RideRequestFormState
    | "pickupCoordinates"
    | "dropoffCoordinates"
    | "scheduledAt"
    | "pickupSavedLocation"
    | "dropoffSavedLocation",
    string
  >
>;

export type CoordinateState = {
  latitude?: number;
  longitude?: number;
};

export const emptyRideRequestForm: RideRequestFormState = {
  pickupAddress: "",
  dropoffAddress: "",
  vehicleTypeId: "",
  vehicleClassId: "",
  regionId: "",
  passengerCount: "1",
  notes: "",
};

export function statusBadgeClass(status: RideRequestStatus) {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "confirmed":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "in_progress":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "";
  }
}

export function formatScheduledAt(value: string | null, locale: string) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

export function formatSubmittedAt(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

export function buildVehicleTypeLabel(
  vehicleType: VehicleType,
  copy: ReturnType<typeof getCustomerRequestsMessages>,
) {
  if (vehicleType.passenger_capacity) {
    return formatMessage(copy.vehicleTypeOption, {
      name: vehicleType.name,
      capacity: vehicleType.passenger_capacity,
    });
  }

  return formatMessage(copy.vehicleTypeOptionNoCapacity, { name: vehicleType.name });
}

export function combineScheduledDateTime(date?: Date, time?: TimeValue): Date | null {
  if (!date || !time) {
    return null;
  }

  const combined = new Date(date);
  combined.setHours(time.hour, time.minute, 0, 0);
  return combined;
}

export function splitScheduledDateTime(value: string | null | undefined) {
  if (!value) {
    return { date: undefined, time: undefined };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: undefined, time: undefined };
  }

  return {
    date: new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
    time: { hour: parsed.getHours(), minute: parsed.getMinutes() },
  };
}

export function getMinTimeForDate(date?: Date): TimeValue | undefined {
  if (!date || startOfDay(date).getTime() !== startOfDay(new Date()).getTime()) {
    return undefined;
  }

  return roundUpToMinuteInterval(new Date());
}

export function isTimeBeforeMin(time: TimeValue, minTime: TimeValue) {
  return time.hour < minTime.hour || (time.hour === minTime.hour && time.minute < minTime.minute);
}

export function buildLocationAddress(location: RideRequestLocationOption) {
  return location.address ? `${location.name}, ${location.address}` : location.name;
}

export function filterLocationsByRegion(
  locations: RideRequestLocationOption[],
  regionId: string,
) {
  if (!regionId) {
    return locations;
  }

  return locations.filter((location) => location.region_id === regionId);
}
