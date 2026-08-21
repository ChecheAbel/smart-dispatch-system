import type { AccountActivation, AccountStatus, Role, RoleSlug, User } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  account_status?: AccountStatus;
  account_activation?: AccountActivation;
  role_slug?: RoleSlug;
  has_requester_profile?: boolean;
  has_assigned_vehicle?: boolean;
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

export async function fetchAllUsers(params: Omit<FetchUsersParams, "page" | "limit"> = {}) {
  const limit = 100;
  let page = 1;
  const users: User[] = [];

  while (true) {
    const result = await fetchUsers({ ...params, page, limit });
    users.push(...result.data);
    if (!result.pagination.has_next) {
      break;
    }
    page += 1;
  }

  return users;
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

export async function fetchUserCount(
  params: Pick<
    FetchUsersParams,
    "account_status" | "account_activation" | "has_requester_profile" | "role_slug" | "has_assigned_vehicle"
  > = {},
) {
  const result = await fetchUsers({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function updateUserAccountActivation(id: string, account_activation: AccountActivation) {
  const { data } = await apiClient.patch(`/api/users/${id}/account-activation`, {
    account_activation,
  });
  return unwrapApiResponse<{ user: User }>(data).user;
}

export async function updateUserAccountStatus(
  id: string,
  account_status: AccountStatus,
  account_block_reason?: string | null,
) {
  const { data } = await apiClient.patch(`/api/users/${id}/account-status`, {
    account_status,
    ...(account_block_reason !== undefined ? { account_block_reason } : {}),
  });
  return unwrapApiResponse<{ user: User }>(data).user;
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

export async function upsertUserDriverProfile(
  userId: string,
  input: {
    driver_license_number: string;
    driver_license_photo_front?: File | null;
    driver_license_photo_back?: File | null;
  },
) {
  const formData = new FormData();
  formData.append("driver_license_number", input.driver_license_number);
  if (input.driver_license_photo_front) {
    formData.append("driver_license_photo_front", input.driver_license_photo_front);
  }
  if (input.driver_license_photo_back) {
    formData.append("driver_license_photo_back", input.driver_license_photo_back);
  }

  const { data } = await apiClient.put(`/api/users/${userId}/driver-profile`, formData);
  return unwrapApiResponse<{ user: User }>(data).user;
}
