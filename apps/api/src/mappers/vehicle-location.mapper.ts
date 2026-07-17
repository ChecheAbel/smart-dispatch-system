import type { VehicleLocationSnapshot as DbVehicleLocationSnapshot } from "../generated/prisma";
import type { VehicleLocationSnapshot } from "@smart-dispatch/types";

function decimalToNumber(value: { toNumber(): number } | null | undefined) {
  return value == null ? null : value.toNumber();
}

export function toPublicVehicleLocationSnapshot(
  snapshot: DbVehicleLocationSnapshot,
): VehicleLocationSnapshot {
  return {
    vehicle_id: snapshot.vehicleId,
    driver_user_id: snapshot.driverUserId,
    latitude: snapshot.latitude.toNumber(),
    longitude: snapshot.longitude.toNumber(),
    heading: decimalToNumber(snapshot.heading),
    speed_kmh: decimalToNumber(snapshot.speedKmh),
    accuracy_m: decimalToNumber(snapshot.accuracyM),
    recorded_at: snapshot.recordedAt.toISOString(),
    updated_at: snapshot.updatedAt.toISOString(),
  };
}
