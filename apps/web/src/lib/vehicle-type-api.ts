import type { VehicleType, VehicleTypeTranslation } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchVehicleTypesParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
};

export type CreateVehicleTypeInput = {
  slug: string;
  translations: VehicleTypeTranslation[];
  passenger_capacity?: number | null;
  is_active?: boolean;
};

export type UpdateVehicleTypeInput = {
  slug?: string;
  translations?: VehicleTypeTranslation[];
  passenger_capacity?: number | null;
  is_active?: boolean;
};

export async function fetchVehicleTypes(params: FetchVehicleTypesParams = {}) {
  const { data } = await apiClient.get("/api/vehicle-types", { params });
  return unwrapPaginatedApiResponse<VehicleType>(data);
}

export async function fetchActiveVehicleTypes(locale?: string) {
  const { data } = await apiClient.get("/api/vehicle-types/active", { params: { locale } });
  return unwrapApiResponse<{ vehicle_types: VehicleType[] }>(data).vehicle_types;
}

export async function fetchVehicleTypeById(id: string) {
  const { data } = await apiClient.get(`/api/vehicle-types/${id}`);
  return unwrapApiResponse<{ vehicle_type: VehicleType }>(data).vehicle_type;
}

export async function createVehicleType(input: CreateVehicleTypeInput) {
  const { data } = await apiClient.post("/api/vehicle-types", input);
  return unwrapApiResponse<{ vehicle_type: VehicleType }>(data).vehicle_type;
}

export async function updateVehicleType(id: string, input: UpdateVehicleTypeInput) {
  const { data } = await apiClient.patch(`/api/vehicle-types/${id}`, input);
  return unwrapApiResponse<{ vehicle_type: VehicleType }>(data).vehicle_type;
}

export async function deleteVehicleType(id: string) {
  const { data } = await apiClient.delete(`/api/vehicle-types/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
