import type { Endpoint, HttpMethod } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchEndpointsParams = {
  page?: number;
  limit?: number;
  search?: string;
  method?: HttpMethod;
  is_active?: boolean;
};

export type CreateEndpointInput = {
  slug: string;
  method: HttpMethod;
  path: string;
  description?: string | null;
  permission_id?: string | null;
  is_active?: boolean;
};

export type UpdateEndpointInput = {
  slug?: string;
  method?: HttpMethod;
  path?: string;
  description?: string | null;
  permission_id?: string | null;
  is_active?: boolean;
};

export async function fetchEndpoints(params: FetchEndpointsParams = {}) {
  const { data } = await apiClient.get("/api/endpoints", { params });
  return unwrapPaginatedApiResponse<Endpoint>(data);
}

export async function fetchEndpointById(id: string) {
  const { data } = await apiClient.get(`/api/endpoints/${id}`);
  return unwrapApiResponse<{ endpoint: Endpoint }>(data).endpoint;
}

export async function createEndpoint(input: CreateEndpointInput) {
  const { data } = await apiClient.post("/api/endpoints", input);
  return unwrapApiResponse<{ endpoint: Endpoint }>(data).endpoint;
}

export async function updateEndpoint(id: string, input: UpdateEndpointInput) {
  const { data } = await apiClient.patch(`/api/endpoints/${id}`, input);
  return unwrapApiResponse<{ endpoint: Endpoint }>(data).endpoint;
}

export async function deleteEndpoint(id: string) {
  const { data } = await apiClient.delete(`/api/endpoints/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}

export async function fetchEndpointCount() {
  const result = await fetchEndpoints({ page: 1, limit: 1 });
  return result.pagination.total;
}
