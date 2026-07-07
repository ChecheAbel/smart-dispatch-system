import type {
  ApiPaginatedResponse,
  Region,
  RideRequest,
  RideRequestLocationOption,
  RideRequestStatus,
  VehicleClass,
  VehicleType,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

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

export type UpdateRideRequestInput = CreateRideRequestInput;

export type FetchRideRequestsParams = {
  locale?: string;
  page?: number;
  limit?: number;
  status?: RideRequestStatus | "";
  search?: string;
};

export async function fetchRideRequestFormOptions(locale?: string, regionId?: string) {
  const { data } = await apiClient.get("/api/ride-requests/form-options", {
    params: { locale, region_id: regionId || undefined },
  });
  return unwrapApiResponse<RideRequestFormOptions>(data);
}

export async function fetchRideRequests(params: FetchRideRequestsParams = {}) {
  const { data } = await apiClient.get("/api/ride-requests", {
    params: {
      locale: params.locale,
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      search: params.search || undefined,
    },
  });
  return unwrapPaginatedApiResponse<RideRequest>(data);
}

export async function fetchRideRequestCount(
  params: Pick<FetchRideRequestsParams, "locale" | "status"> = {},
) {
  const result = await fetchRideRequests({ ...params, page: 1, limit: 1 });
  return result.pagination.total;
}

export async function fetchMyRideRequests(locale?: string, limit = 5) {
  const result = await fetchRideRequests({ locale, page: 1, limit });
  return result.data;
}

export async function fetchRideRequest(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/ride-requests/${id}`, { params: { locale } });
  return unwrapApiResponse<{ ride_request: RideRequest }>(data).ride_request;
}

export async function createRideRequest(input: CreateRideRequestInput) {
  const { data } = await apiClient.post("/api/ride-requests", input);
  return unwrapApiResponse<{ ride_request: RideRequest }>(data).ride_request;
}

export async function updateRideRequest(id: string, input: UpdateRideRequestInput) {
  const { data } = await apiClient.patch(`/api/ride-requests/${id}`, input);
  return unwrapApiResponse<{ ride_request: RideRequest }>(data).ride_request;
}

export async function cancelRideRequest(id: string, locale?: string) {
  const { data } = await apiClient.post(`/api/ride-requests/${id}/cancel`, null, {
    params: { locale },
  });
  return unwrapApiResponse<{ ride_request: RideRequest }>(data).ride_request;
}

export type { ApiPaginatedResponse };
