import type { Region, RideRequest, RideRequestLocationOption, VehicleClass, VehicleType } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export type RideRequestVehicleTypeOption = VehicleType & {
  allowed_classes: VehicleClass[];
};

export type RideRequestFormOptions = {
  vehicle_types: RideRequestVehicleTypeOption[];
  regions: Region[];
  pickup_locations: RideRequestLocationOption[];
  dropoff_locations: RideRequestLocationOption[];
};

export type CreateRideRequestInput = {
  pickup_address: string;
  dropoff_address: string;
  pickup_location_id?: string | null;
  dropoff_location_id?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  dropoff_latitude?: number | null;
  dropoff_longitude?: number | null;
  vehicle_type_id?: string | null;
  vehicle_class_id?: string | null;
  region_id?: string | null;
  passenger_count: number;
  scheduled_at?: string | null;
  notes?: string | null;
};

export async function fetchRideRequestFormOptions(locale?: string, regionId?: string) {
  const { data } = await apiClient.get("/api/ride-requests/form-options", {
    params: { locale, region_id: regionId || undefined },
  });
  return unwrapApiResponse<RideRequestFormOptions>(data);
}

export async function fetchMyRideRequests(locale?: string) {
  const { data } = await apiClient.get("/api/ride-requests", { params: { locale } });
  return unwrapApiResponse<{ ride_requests: RideRequest[] }>(data).ride_requests;
}

export async function createRideRequest(input: CreateRideRequestInput) {
  const { data } = await apiClient.post("/api/ride-requests", input);
  return unwrapApiResponse<{ ride_request: RideRequest }>(data).ride_request;
}
