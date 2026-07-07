import type { Location, LocationTranslation } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchLocationsParams = {
  page?: number;
  limit?: number;
  search?: string;
  region_id?: string;
  locale?: string;
  is_active?: boolean;
  can_pickup?: boolean;
  can_dropoff?: boolean;
};

export type CreateLocationInput = {
  region_id: string;
  translations: LocationTranslation[];
  latitude: number;
  longitude: number;
  address?: string | null;
  can_pickup?: boolean;
  can_dropoff?: boolean;
  is_active?: boolean;
};

export type UpdateLocationInput = {
  region_id?: string;
  translations?: LocationTranslation[];
  latitude?: number;
  longitude?: number;
  address?: string | null;
  can_pickup?: boolean;
  can_dropoff?: boolean;
  is_active?: boolean;
};

export async function fetchLocations(params: FetchLocationsParams = {}) {
  const { data } = await apiClient.get("/api/locations", { params });
  return unwrapPaginatedApiResponse<Location>(data);
}

export async function fetchAllLocations(
  params: Omit<FetchLocationsParams, "page" | "limit"> = {},
) {
  const limit = 100;
  let page = 1;
  const locations: Location[] = [];
  let hasNext = true;

  while (hasNext) {
    const result = await fetchLocations({ ...params, page, limit });
    locations.push(...result.data);
    hasNext = result.pagination.has_next;
    page += 1;
  }

  return locations;
}

export async function fetchLocationCount(params: Pick<FetchLocationsParams, "is_active" | "region_id"> = {}) {
  const result = await fetchLocations({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchLocationById(id: string) {
  const { data } = await apiClient.get(`/api/locations/${id}`);
  return unwrapApiResponse<{ location: Location }>(data).location;
}

export async function createLocation(input: CreateLocationInput) {
  const { data } = await apiClient.post("/api/locations", input);
  return unwrapApiResponse<{ location: Location }>(data).location;
}

export async function updateLocation(id: string, input: UpdateLocationInput) {
  const { data } = await apiClient.patch(`/api/locations/${id}`, input);
  return unwrapApiResponse<{ location: Location }>(data).location;
}

export async function deleteLocation(id: string) {
  const { data } = await apiClient.delete(`/api/locations/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
