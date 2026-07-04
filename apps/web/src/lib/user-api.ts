import type { AccountActivation, AccountStatus, Role, User } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  account_status?: AccountStatus;
  account_activation?: AccountActivation;
};

export type CreateUserInput = {
  email: string;
  password: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  mobile_number: string;
  account_status?: AccountStatus;
  account_activation?: AccountActivation;
};

export type UpdateUserInput = {
  email?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  mobile_number?: string;
  account_status?: AccountStatus;
  account_activation?: AccountActivation;
};

export async function fetchUsers(params: FetchUsersParams = {}) {
  const { data } = await apiClient.get("/api/users", { params });
  return unwrapPaginatedApiResponse<User>(data);
}

export async function fetchUserById(id: string) {
  const { data } = await apiClient.get(`/api/users/${id}`);
  return unwrapApiResponse<{ user: User }>(data).user;
}

export async function createUser(input: CreateUserInput) {
  const { data } = await apiClient.post("/api/users", input);
  return unwrapApiResponse<{ user: User }>(data).user;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const { data } = await apiClient.patch(`/api/users/${id}`, input);
  return unwrapApiResponse<{ user: User }>(data).user;
}

export async function deleteUser(id: string) {
  const { data } = await apiClient.delete(`/api/users/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}

export async function fetchUserCount(params: Pick<FetchUsersParams, "account_status"> = {}) {
  const result = await fetchUsers({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchUserRoles(userId: string, locale?: string) {
  const { data } = await apiClient.get(`/api/users/${userId}/roles`, {
    params: locale ? { locale } : undefined,
  });
  return unwrapApiResponse<{ roles: Role[] }>(data).roles;
}

export async function setUserRoles(userId: string, roleIds: string[], locale?: string) {
  const { data } = await apiClient.put(`/api/users/${userId}/roles`, { role_ids: roleIds }, {
    params: locale ? { locale } : undefined,
  });
  return unwrapApiResponse<{ roles: Role[] }>(data).roles;
}
