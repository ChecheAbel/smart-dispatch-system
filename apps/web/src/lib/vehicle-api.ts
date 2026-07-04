import type { Vehicle, VehicleDriverOption, VehicleStatus } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchVehiclesParams = {
  page?: number;
  limit?: number;
  search?: string;
  vehicle_type_id?: string;
  status?: VehicleStatus;
  unassigned_only?: boolean;
  assigned_only?: boolean;
  locale?: string;
};

export type CreateVehicleInput = {
  plate_number: string;
  vehicle_type_id: string;
  assigned_driver_user_id?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: VehicleStatus;
  notes?: string | null;
};

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export async function fetchVehicles(params: FetchVehiclesParams = {}) {
  const { data } = await apiClient.get("/api/vehicles", { params });
  return unwrapPaginatedApiResponse<Vehicle>(data);
}

export async function fetchVehicleDriverOptions(search?: string) {
  const { data } = await apiClient.get("/api/vehicles/driver-options", {
    params: search ? { search } : undefined,
  });
  return unwrapApiResponse<{ drivers: VehicleDriverOption[] }>(data).drivers;
}

export async function fetchVehicleById(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/vehicles/${id}`, { params: { locale } });
  return unwrapApiResponse<{ vehicle: Vehicle }>(data).vehicle;
}

export async function createVehicle(input: CreateVehicleInput) {
  const { data } = await apiClient.post("/api/vehicles", input);
  return unwrapApiResponse<{ vehicle: Vehicle }>(data).vehicle;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput) {
  const { data } = await apiClient.patch(`/api/vehicles/${id}`, input);
  return unwrapApiResponse<{ vehicle: Vehicle }>(data).vehicle;
}

export async function deleteVehicle(id: string) {
  const { data } = await apiClient.delete(`/api/vehicles/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
