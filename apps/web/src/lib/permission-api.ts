import type { Permission } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchPermissionsParams = {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
};

export type CreatePermissionInput = {
  slug: string;
  module: string;
  action: string;
  description?: string | null;
};

export type UpdatePermissionInput = {
  slug?: string;
  module?: string;
  action?: string;
  description?: string | null;
};

export async function fetchPermissions(params: FetchPermissionsParams = {}) {
  const { data } = await apiClient.get("/api/permissions", { params });
  return unwrapPaginatedApiResponse<Permission>(data);
}

export async function fetchPermissionById(id: string) {
  const { data } = await apiClient.get(`/api/permissions/${id}`);
  return unwrapApiResponse<{ permission: Permission }>(data).permission;
}

export async function createPermission(input: CreatePermissionInput) {
  const { data } = await apiClient.post("/api/permissions", input);
  return unwrapApiResponse<{ permission: Permission }>(data).permission;
}

export async function updatePermission(id: string, input: UpdatePermissionInput) {
  const { data } = await apiClient.patch(`/api/permissions/${id}`, input);
  return unwrapApiResponse<{ permission: Permission }>(data).permission;
}

export async function deletePermission(id: string) {
  const { data } = await apiClient.delete(`/api/permissions/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}

export async function fetchPermissionCount() {
  const result = await fetchPermissions({ page: 1, limit: 1 });
  return result.pagination.total;
}
