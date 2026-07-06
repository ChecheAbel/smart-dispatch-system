import type { VehicleClass, VehicleClassTranslation } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchVehicleClassesParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  is_active?: boolean;
};

export type CreateVehicleClassInput = {
  translations: VehicleClassTranslation[];
  is_active?: boolean;
};

export type UpdateVehicleClassInput = {
  translations?: VehicleClassTranslation[];
  is_active?: boolean;
};

export async function fetchVehicleClasses(params: FetchVehicleClassesParams = {}) {
  const { data } = await apiClient.get("/api/vehicle-classes", { params });
  return unwrapPaginatedApiResponse<VehicleClass>(data);
}

export async function fetchVehicleClassCount(
  params: Pick<FetchVehicleClassesParams, "is_active"> = {},
) {
  const result = await fetchVehicleClasses({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchActiveVehicleClasses(locale?: string) {
  const { data } = await apiClient.get("/api/vehicle-classes/active", { params: { locale } });
  return unwrapApiResponse<{ vehicle_classes: VehicleClass[] }>(data).vehicle_classes;
}

export async function fetchVehicleClassById(id: string) {
  const { data } = await apiClient.get(`/api/vehicle-classes/${id}`);
  return unwrapApiResponse<{ vehicle_class: VehicleClass }>(data).vehicle_class;
}

export async function createVehicleClass(input: CreateVehicleClassInput) {
  const { data } = await apiClient.post("/api/vehicle-classes", input);
  return unwrapApiResponse<{ vehicle_class: VehicleClass }>(data).vehicle_class;
}

export async function updateVehicleClass(id: string, input: UpdateVehicleClassInput) {
  const { data } = await apiClient.patch(`/api/vehicle-classes/${id}`, input);
  return unwrapApiResponse<{ vehicle_class: VehicleClass }>(data).vehicle_class;
}

export async function deleteVehicleClass(id: string) {
  const { data } = await apiClient.delete(`/api/vehicle-classes/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
