import type { FarePlan, FarePlanTranslation, PricingModel } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchFarePlansParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  is_active?: boolean;
  pricing_model?: PricingModel;
  vehicle_type_id?: string;
  vehicle_class_id?: string;
  region_id?: string;
};

export type CreateFarePlanInput = {
  translations: FarePlanTranslation[];
  vehicle_type_id?: string | null;
  vehicle_class_id?: string | null;
  region_id?: string | null;
  pricing_model: PricingModel;
  currency?: string;
  base_fare: number;
  per_km_rate?: number | null;
  per_minute_rate?: number | null;
  minimum_fare?: number | null;
  booking_fee?: number | null;
  free_waiting_minutes?: number | null;
  waiting_fee_per_minute?: number | null;
  priority?: number;
  is_active?: boolean;
};

export type UpdateFarePlanInput = {
  translations?: FarePlanTranslation[];
  vehicle_type_id?: string | null;
  vehicle_class_id?: string | null;
  region_id?: string | null;
  pricing_model?: PricingModel;
  currency?: string;
  base_fare?: number;
  per_km_rate?: number | null;
  per_minute_rate?: number | null;
  minimum_fare?: number | null;
  booking_fee?: number | null;
  free_waiting_minutes?: number | null;
  waiting_fee_per_minute?: number | null;
  priority?: number;
  is_active?: boolean;
};

export async function fetchFarePlans(params: FetchFarePlansParams = {}) {
  const { data } = await apiClient.get("/api/fare-plans", { params });
  return unwrapPaginatedApiResponse<FarePlan>(data);
}

export async function fetchFarePlanCount(
  params: Pick<FetchFarePlansParams, "is_active" | "pricing_model"> = {},
) {
  const result = await fetchFarePlans({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchFarePlanById(id: string) {
  const { data } = await apiClient.get(`/api/fare-plans/${id}`);
  return unwrapApiResponse<{ fare_plan: FarePlan }>(data).fare_plan;
}

export type ResolveFarePlanParams = {
  vehicle_type_id?: string;
  vehicle_class_id?: string;
  region_id?: string;
  locale?: string;
};

export async function resolveFarePlan(params: ResolveFarePlanParams) {
  const { data } = await apiClient.get("/api/fare-plans/resolve", { params });
  return unwrapApiResponse<{ fare_plan: FarePlan }>(data).fare_plan;
}

export async function createFarePlan(input: CreateFarePlanInput) {
  const { data } = await apiClient.post("/api/fare-plans", input);
  return unwrapApiResponse<{ fare_plan: FarePlan }>(data).fare_plan;
}

export async function updateFarePlan(id: string, input: UpdateFarePlanInput) {
  const { data } = await apiClient.patch(`/api/fare-plans/${id}`, input);
  return unwrapApiResponse<{ fare_plan: FarePlan }>(data).fare_plan;
}

export async function deleteFarePlan(id: string) {
  const { data } = await apiClient.delete(`/api/fare-plans/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
