import { getOptionalString, getString } from "../utils/validation";

export type ParsedRideRequestPayload = {
  pickupAddress: string;
  dropoffAddress: string;
  vehicleTypeId: string | null;
  vehicleClassId: string | null;
  regionId: string | null;
  pickupLocationId: string | null;
  dropoffLocationId: string | null;
  notes: string | null;
  passengerCount: number;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  scheduledAt: Date | null;
};

function parseCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function parsePassengerCount(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 50) {
    return undefined;
  }

  return value;
}

function parseScheduledAt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export function parseRideRequestPayload(body: unknown):
  | { ok: true; data: ParsedRideRequestPayload }
  | { ok: false; error: string } {
  const pickupAddress = getString((body as { pickup_address?: unknown })?.pickup_address);
  const dropoffAddress = getString((body as { dropoff_address?: unknown })?.dropoff_address);
  const vehicleTypeId = getOptionalString((body as { vehicle_type_id?: unknown })?.vehicle_type_id);
  const vehicleClassId = getOptionalString((body as { vehicle_class_id?: unknown })?.vehicle_class_id);
  const regionId = getOptionalString((body as { region_id?: unknown })?.region_id);
  const pickupLocationId = getOptionalString((body as { pickup_location_id?: unknown })?.pickup_location_id);
  const dropoffLocationId = getOptionalString((body as { dropoff_location_id?: unknown })?.dropoff_location_id);
  const notes = getOptionalString((body as { notes?: unknown })?.notes);
  const passengerCount = parsePassengerCount((body as { passenger_count?: unknown })?.passenger_count) ?? 1;
  const pickupLatitude = parseCoordinate((body as { pickup_latitude?: unknown })?.pickup_latitude);
  const pickupLongitude = parseCoordinate((body as { pickup_longitude?: unknown })?.pickup_longitude);
  const dropoffLatitude = parseCoordinate((body as { dropoff_latitude?: unknown })?.dropoff_latitude);
  const dropoffLongitude = parseCoordinate((body as { dropoff_longitude?: unknown })?.dropoff_longitude);
  const scheduledAt = parseScheduledAt((body as { scheduled_at?: unknown })?.scheduled_at);

  if (!pickupAddress) {
    return { ok: false, error: "Pickup address is required." };
  }

  if (!dropoffAddress) {
    return { ok: false, error: "Drop-off address is required." };
  }

  if (
    pickupLatitude === undefined ||
    pickupLongitude === undefined ||
    dropoffLatitude === undefined ||
    dropoffLongitude === undefined ||
    scheduledAt === undefined
  ) {
    return { ok: false, error: "One or more request fields are invalid." };
  }

  return {
    ok: true,
    data: {
      pickupAddress,
      dropoffAddress,
      vehicleTypeId: vehicleTypeId ?? null,
      vehicleClassId: vehicleClassId ?? null,
      regionId: regionId ?? null,
      pickupLocationId: pickupLocationId ?? null,
      dropoffLocationId: dropoffLocationId ?? null,
      notes: notes ?? null,
      passengerCount,
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      scheduledAt,
    },
  };
}
