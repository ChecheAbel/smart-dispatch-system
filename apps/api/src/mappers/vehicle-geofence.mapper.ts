import type { VehicleGeofence } from "@smart-dispatch/types";
import type { VehicleGeofence as DbVehicleGeofence } from "../generated/prisma";
import { toPublicVehicleGeofence } from "../models/vehicle-geofence.model";

export function mapVehicleGeofence(geofence: DbVehicleGeofence): VehicleGeofence {
  return toPublicVehicleGeofence(geofence);
}

export function mapVehicleGeofences(geofences: DbVehicleGeofence[]): VehicleGeofence[] {
  return geofences.map(mapVehicleGeofence);
}
