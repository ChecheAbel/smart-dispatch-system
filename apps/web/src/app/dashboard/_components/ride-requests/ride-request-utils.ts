import type { RideRequestLocationOption, RideRequestStatus, RideRequestContractOption, ContractBillingInterval, VehicleType } from "@smart-dispatch/types";
import type { TimeValue } from "@/components/shared/admin-time-picker";
import { roundUpToMinuteInterval } from "@/components/shared/admin-time-picker";
import { format } from "date-fns";
import { startOfDay } from "date-fns";
import type { getCustomerRequestsMessages } from "@/translations";
import { formatMessage } from "@/translations";
import { formatEthiopianDate, formatEthiopianTime } from "@/lib/ethiopian-calendar";

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
    | "dropoffSavedLocation"
    | "billing",
    string
  >
>;

export type BillingMode = "one_time" | "contract";

export function contractMatchesTripScope(
  contract: Pick<RideRequestContractOption, "region_ids" | "vehicle_type_ids" | "vehicle_class_ids">,
  trip: { regionId: string; vehicleTypeId: string; vehicleClassId: string },
) {
  if (trip.regionId && !contract.region_ids.includes(trip.regionId)) {
    return false;
  }

  if (trip.vehicleTypeId && !contract.vehicle_type_ids.includes(trip.vehicleTypeId)) {
    return false;
  }

  if (trip.vehicleClassId && !contract.vehicle_class_ids.includes(trip.vehicleClassId)) {
    return false;
  }

  return true;
}

export function contractMatchesTripScopeStrict(
  contract: Pick<RideRequestContractOption, "region_ids" | "vehicle_type_ids" | "vehicle_class_ids">,
  trip: { regionId: string; vehicleTypeId: string; vehicleClassId: string },
) {
  if (!trip.regionId || !trip.vehicleTypeId || !trip.vehicleClassId) {
    return false;
  }

  return (
    contract.region_ids.includes(trip.regionId) &&
    contract.vehicle_type_ids.includes(trip.vehicleTypeId) &&
    contract.vehicle_class_ids.includes(trip.vehicleClassId)
  );
}

export type TripContractResolution =
  | { status: "pending" }
  | { status: "matched"; contract: RideRequestContractOption }
  | { status: "none" }
  | { status: "ambiguous"; contracts: RideRequestContractOption[] };

export function resolveTripContract(
  contracts: RideRequestContractOption[],
  trip: { regionId: string; vehicleTypeId: string; vehicleClassId: string },
): TripContractResolution {
  if (!trip.regionId || !trip.vehicleTypeId || !trip.vehicleClassId) {
    return { status: "pending" };
  }

  const matches = contracts.filter((contract) => contractMatchesTripScopeStrict(contract, trip));

  if (matches.length === 0) {
    return { status: "none" };
  }

  if (matches.length === 1) {
    return { status: "matched", contract: matches[0] };
  }

  return { status: "ambiguous", contracts: matches };
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function getTripCoverageDate(scheduledAt?: Date | null) {
  if (!scheduledAt) return null;
  return new Date(
    Date.UTC(scheduledAt.getUTCFullYear(), scheduledAt.getUTCMonth(), scheduledAt.getUTCDate()),
  );
}

export function resolveEnrollmentStartDate(options: {
  scheduledAt?: Date | null;
  acceptedAt?: Date;
}) {
  const acceptedStart = options.acceptedAt
    ? new Date(
        Date.UTC(
          options.acceptedAt.getUTCFullYear(),
          options.acceptedAt.getUTCMonth(),
          options.acceptedAt.getUTCDate(),
        ),
      )
    : null;

  const scheduledStart = getTripCoverageDate(options.scheduledAt ?? null);

  if (!scheduledStart) {
    return acceptedStart;
  }

  if (!acceptedStart || scheduledStart.getTime() >= acceptedStart.getTime()) {
    return scheduledStart;
  }

  return acceptedStart;
}

export function calculateEnrollmentEndDate(
  startsAt: Date,
  billingInterval: ContractBillingInterval,
) {
  const start = new Date(
    Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth(), startsAt.getUTCDate()),
  );

  switch (billingInterval) {
    case "per_trip":
      return start;
    case "monthly": {
      const end = addUtcMonths(start, 1);
      end.setUTCDate(end.getUTCDate() - 1);
      return end;
    }
    case "quarterly": {
      const end = addUtcMonths(start, 3);
      end.setUTCDate(end.getUTCDate() - 1);
      return end;
    }
    case "annually": {
      const end = new Date(
        Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate()),
      );
      end.setUTCDate(end.getUTCDate() - 1);
      return end;
    }
    default:
      return start;
  }
}

export function resolveContractTermForTrip(
  contract: Pick<RideRequestContractOption, "billing_interval" | "current_enrollment">,
  options: { scheduledAt?: Date | null },
) {
  const serviceDate = resolveEnrollmentStartDate({ scheduledAt: options.scheduledAt });
  if (!serviceDate) {
    return null;
  }

  const day = format(serviceDate, "yyyy-MM-dd");
  const enrollment = contract.current_enrollment;

  if (
    enrollment?.starts_at &&
    enrollment.ends_at &&
    day >= enrollment.starts_at &&
    day <= enrollment.ends_at
  ) {
    return enrollment;
  }

  const endsAt = calculateEnrollmentEndDate(serviceDate, contract.billing_interval);

  return {
    starts_at: day,
    ends_at: format(endsAt, "yyyy-MM-dd"),
  };
}

export function formatContractTermRange(
  term: { starts_at: string; ends_at: string },
  locale: string,
) {
  const formatDay = (value: string) => {
    if (!value) return "—";
    const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
    const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return "—";

    if (locale === "am") {
      return formatEthiopianDate(parsed, "am");
    }
    return parsed.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return `${formatDay(term.starts_at)} – ${formatDay(term.ends_at)}`;
}

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

  const date = new Date(value);
  if (locale === "am") {
    return `${formatEthiopianDate(date, "am")} ${formatEthiopianTime(date, "am")}`;
  }

  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

export function formatSubmittedAt(value: string, locale: string) {
  const date = new Date(value);
  if (locale === "am") {
    return `${formatEthiopianDate(date, "am")} ${formatEthiopianTime(date, "am")}`;
  }

  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

export function formatCoordinates(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) {
    return null;
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
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

export function withSelectedPickupAsDropoffOption(
  dropoffLocations: RideRequestLocationOption[],
  pickupLocations: RideRequestLocationOption[],
  pickupLocationId: string,
  useCustomPickup: boolean,
) {
  if (useCustomPickup || !pickupLocationId) {
    return dropoffLocations;
  }

  const selectedPickup = pickupLocations.find((location) => location.id === pickupLocationId);
  if (!selectedPickup) {
    return dropoffLocations;
  }

  if (dropoffLocations.some((location) => location.id === selectedPickup.id)) {
    return dropoffLocations;
  }

  return [...dropoffLocations, selectedPickup];
}

export function buildDropoffLocationItems(
  dropoffLocations: RideRequestLocationOption[],
  pickupLocations: RideRequestLocationOption[],
  pickupLocationId: string,
  useCustomPickup: boolean,
  pickupTag?: string,
) {
  const nativeDropoffIds = new Set(dropoffLocations.map((location) => location.id));

  return withSelectedPickupAsDropoffOption(
    dropoffLocations,
    pickupLocations,
    pickupLocationId,
    useCustomPickup,
  ).map((location) => ({
    label:
      !useCustomPickup &&
      pickupLocationId &&
      location.id === pickupLocationId &&
      !nativeDropoffIds.has(location.id) &&
      pickupTag
        ? `${location.name} (${pickupTag})`
        : location.name,
    value: location.id,
  }));
}
