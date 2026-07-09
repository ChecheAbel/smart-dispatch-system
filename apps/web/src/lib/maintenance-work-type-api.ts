import type { MaintenanceWorkType, MaintenanceWorkTypeTranslation } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchMaintenanceWorkTypesParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  is_active?: boolean;
};

export type CreateMaintenanceWorkTypeInput = {
  translations: MaintenanceWorkTypeTranslation[];
  is_active?: boolean;
  sort_order?: number;
};

export type UpdateMaintenanceWorkTypeInput = {
  translations?: MaintenanceWorkTypeTranslation[];
  is_active?: boolean;
  sort_order?: number;
};

export async function fetchMaintenanceWorkTypes(params: FetchMaintenanceWorkTypesParams = {}) {
  const { data } = await apiClient.get("/api/maintenance-work-types", { params });
  return unwrapPaginatedApiResponse<MaintenanceWorkType>(data);
}

export async function fetchMaintenanceWorkTypeCount(
  params: Pick<FetchMaintenanceWorkTypesParams, "is_active"> = {},
) {
  const result = await fetchMaintenanceWorkTypes({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchActiveMaintenanceWorkTypes(locale?: string) {
  const { data } = await apiClient.get("/api/maintenance-work-types/active", {
    params: { locale },
  });
  return unwrapApiResponse<{ maintenance_work_types: MaintenanceWorkType[] }>(data)
    .maintenance_work_types;
}

export async function fetchMaintenanceWorkTypeById(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/maintenance-work-types/${id}`, {
    params: { locale },
  });
  return unwrapApiResponse<{ maintenance_work_type: MaintenanceWorkType }>(data)
    .maintenance_work_type;
}

export async function createMaintenanceWorkType(input: CreateMaintenanceWorkTypeInput) {
  const { data } = await apiClient.post("/api/maintenance-work-types", input);
  return unwrapApiResponse<{ maintenance_work_type: MaintenanceWorkType }>(data)
    .maintenance_work_type;
}

export async function updateMaintenanceWorkType(
  id: string,
  input: UpdateMaintenanceWorkTypeInput,
) {
  const { data } = await apiClient.patch(`/api/maintenance-work-types/${id}`, input);
  return unwrapApiResponse<{ maintenance_work_type: MaintenanceWorkType }>(data)
    .maintenance_work_type;
}

export async function deleteMaintenanceWorkType(id: string) {
  const { data } = await apiClient.delete(`/api/maintenance-work-types/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
