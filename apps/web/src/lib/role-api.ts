import type { Permission, Role, RoleTranslation } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchRolesParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
};

export type CreateRoleInput = {
  slug: string;
  translations: RoleTranslation[];
};

export async function fetchRoles(params: FetchRolesParams = {}) {
  const { data } = await apiClient.get("/api/roles", { params });
  return unwrapPaginatedApiResponse<Role>(data);
}

export async function createRole(input: CreateRoleInput) {
  const { data } = await apiClient.post("/api/roles", input);
  return unwrapApiResponse<{ role: Role }>(data).role;
}

export async function fetchRoleCount(locale?: string) {
  const result = await fetchRoles({ page: 1, limit: 1, locale });
  return result.pagination.total;
}

export async function fetchRoleById(id: string) {
  const { data } = await apiClient.get(`/api/roles/${id}`);
  return unwrapApiResponse<{ role: Role }>(data).role;
}

export type UpdateRoleInput = {
  slug?: string;
  translations?: RoleTranslation[];
};

export async function updateRole(id: string, input: UpdateRoleInput) {
  const { data } = await apiClient.patch(`/api/roles/${id}`, input);
  return unwrapApiResponse<{ role: Role }>(data).role;
}

export async function deleteRole(id: string) {
  const { data } = await apiClient.delete(`/api/roles/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}

export async function fetchRolePermissions(roleId: string) {
  const { data } = await apiClient.get(`/api/roles/${roleId}/permissions`);
  return unwrapApiResponse<{ permissions: Permission[] }>(data).permissions;
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  const { data } = await apiClient.put(`/api/roles/${roleId}/permissions`, {
    permission_ids: permissionIds,
  });
  return unwrapApiResponse<{ permissions: Permission[] }>(data).permissions;
}
