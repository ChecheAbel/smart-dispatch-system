import type {
  GeofenceCoordinate,
  GeofenceKind,
  GeofenceShape,
  VehicleGeofence,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export type VehicleGeofenceInput = {
  name: string;
  kind: GeofenceKind;
  shape: GeofenceShape;
  is_active?: boolean;
  center_latitude?: number | null;
  center_longitude?: number | null;
  radius_m?: number | null;
  coordinates?: GeofenceCoordinate[] | null;
};

export async function fetchVehicleGeofences(vehicleId: string) {
  const { data } = await apiClient.get(`/api/vehicles/${vehicleId}/geofences`);
  return unwrapApiResponse<{ geofences: VehicleGeofence[] }>(data).geofences;
}

export async function createVehicleGeofence(vehicleId: string, input: VehicleGeofenceInput) {
  const { data } = await apiClient.post(`/api/vehicles/${vehicleId}/geofences`, input);
  return unwrapApiResponse<{ geofence: VehicleGeofence }>(data).geofence;
}

export async function updateVehicleGeofence(
  vehicleId: string,
  geofenceId: string,
  input: VehicleGeofenceInput,
) {
  const { data } = await apiClient.patch(
    `/api/vehicles/${vehicleId}/geofences/${geofenceId}`,
    input,
  );
  return unwrapApiResponse<{ geofence: VehicleGeofence }>(data).geofence;
}

export async function deleteVehicleGeofence(vehicleId: string, geofenceId: string) {
  const { data } = await apiClient.delete(`/api/vehicles/${vehicleId}/geofences/${geofenceId}`);
  return unwrapApiResponse<{ message: string }>(data);
}
