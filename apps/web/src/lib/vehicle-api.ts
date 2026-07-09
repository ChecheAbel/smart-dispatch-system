import type {
  Vehicle,
  VehicleDriverOption,
  VehicleHistoryEvent,
  VehicleMaintenanceLog,
  VehicleMaintenanceStatus,
  VehicleStatus,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchVehiclesParams = {
  page?: number;
  limit?: number;
  search?: string;
  vehicle_type_id?: string;
  vehicle_class_id?: string;
  status?: VehicleStatus;
  unassigned_only?: boolean;
  assigned_only?: boolean;
  locale?: string;
};

export type CreateVehicleInput = {
  plate_number: string;
  chassis_number: string;
  vehicle_type_id: string;
  vehicle_class_id: string;
  assigned_driver_user_id?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: VehicleStatus;
  notes?: string | null;
  insurance_expires_at?: string | null;
  inspection_expires_at?: string | null;
  registration_expires_at?: string | null;
};

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export type CreateVehicleMaintenanceInput = {
  work_type_id: string;
  status?: VehicleMaintenanceStatus;
  title: string;
  description?: string | null;
  vendor?: string | null;
  cost_amount?: number | null;
  odometer_km?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  next_due_at?: string | null;
  next_due_km?: number | null;
};

export type UpdateVehicleMaintenanceInput = Partial<CreateVehicleMaintenanceInput>;

export async function fetchVehicles(params: FetchVehiclesParams = {}) {
  const { data } = await apiClient.get("/api/vehicles", { params });
  return unwrapPaginatedApiResponse<Vehicle>(data);
}

export async function fetchVehicleCount(
  params: Pick<
    FetchVehiclesParams,
    "status" | "assigned_only" | "unassigned_only" | "vehicle_type_id" | "vehicle_class_id"
  > = {},
) {
  const result = await fetchVehicles({ page: 1, limit: 1, ...params });
  return result.pagination.total;
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

export async function fetchVehicleHistory(
  id: string,
  params: { page?: number; limit?: number } = {},
) {
  const { data } = await apiClient.get(`/api/vehicles/${id}/history`, { params });
  return unwrapPaginatedApiResponse<VehicleHistoryEvent>(data);
}

export async function fetchVehicleMaintenance(
  id: string,
  params: { page?: number; limit?: number; status?: VehicleMaintenanceStatus } = {},
) {
  const { data } = await apiClient.get(`/api/vehicles/${id}/maintenance`, { params });
  return unwrapPaginatedApiResponse<VehicleMaintenanceLog>(data);
}

export async function createVehicleMaintenance(id: string, input: CreateVehicleMaintenanceInput) {
  const { data } = await apiClient.post(`/api/vehicles/${id}/maintenance`, input);
  return unwrapApiResponse<{ maintenance_log: VehicleMaintenanceLog }>(data).maintenance_log;
}

export async function updateVehicleMaintenance(
  id: string,
  maintenanceId: string,
  input: UpdateVehicleMaintenanceInput,
) {
  const { data } = await apiClient.patch(`/api/vehicles/${id}/maintenance/${maintenanceId}`, input);
  return unwrapApiResponse<{ maintenance_log: VehicleMaintenanceLog }>(data).maintenance_log;
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
