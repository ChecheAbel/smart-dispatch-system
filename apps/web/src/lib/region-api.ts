import type { Region, RegionTranslation } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchRegionsParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  is_active?: boolean;
};

export type CreateRegionInput = {
  translations: RegionTranslation[];
  is_active?: boolean;
};

export type UpdateRegionInput = {
  translations?: RegionTranslation[];
  is_active?: boolean;
};

export async function fetchRegions(params: FetchRegionsParams = {}) {
  const { data } = await apiClient.get("/api/regions", { params });
  return unwrapPaginatedApiResponse<Region>(data);
}

export async function fetchRegionCount(params: Pick<FetchRegionsParams, "is_active"> = {}) {
  const result = await fetchRegions({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchActiveRegions(locale?: string) {
  const { data } = await apiClient.get("/api/regions/active", { params: { locale } });
  return unwrapApiResponse<{ regions: Region[] }>(data).regions;
}

export async function fetchRegionById(id: string) {
  const { data } = await apiClient.get(`/api/regions/${id}`);
  return unwrapApiResponse<{ region: Region }>(data).region;
}

export async function createRegion(input: CreateRegionInput) {
  const { data } = await apiClient.post("/api/regions", input);
  return unwrapApiResponse<{ region: Region }>(data).region;
}

export async function updateRegion(id: string, input: UpdateRegionInput) {
  const { data } = await apiClient.patch(`/api/regions/${id}`, input);
  return unwrapApiResponse<{ region: Region }>(data).region;
}

export async function deleteRegion(id: string) {
  const { data } = await apiClient.delete(`/api/regions/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
