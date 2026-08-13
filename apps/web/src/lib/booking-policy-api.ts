import type {
  BookingPolicy,
  BookingPolicyTranslation,
  LateCancellationType,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchBookingPoliciesParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  is_active?: boolean;
};

export type CreateBookingPolicyInput = {
  translations: BookingPolicyTranslation[];
  min_advance_booking_hours?: number;
  free_cancellation_hours?: number;
  late_cancellation_type?: LateCancellationType;
  late_cancellation_fee?: number | null;
  currency?: string;
  is_active?: boolean;
};

export type UpdateBookingPolicyInput = Partial<CreateBookingPolicyInput>;

export async function fetchBookingPolicies(params: FetchBookingPoliciesParams = {}) {
  const { data } = await apiClient.get("/api/booking-policies", { params });
  return unwrapPaginatedApiResponse<BookingPolicy>(data);
}

export async function fetchBookingPolicyCount(
  params: Pick<FetchBookingPoliciesParams, "is_active"> = {},
) {
  const result = await fetchBookingPolicies({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchActiveBookingPolicies(locale?: string) {
  const { data } = await apiClient.get("/api/booking-policies/active", {
    params: { locale },
  });
  return unwrapApiResponse<{ booking_policies: BookingPolicy[] }>(data).booking_policies;
}

export async function fetchBookingPolicyById(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/booking-policies/${id}`, {
    params: { locale },
  });
  return unwrapApiResponse<{ booking_policy: BookingPolicy }>(data).booking_policy;
}

export async function createBookingPolicy(input: CreateBookingPolicyInput) {
  const { data } = await apiClient.post("/api/booking-policies", input);
  return unwrapApiResponse<{ booking_policy: BookingPolicy }>(data).booking_policy;
}

export async function updateBookingPolicy(id: string, input: UpdateBookingPolicyInput) {
  const { data } = await apiClient.patch(`/api/booking-policies/${id}`, input);
  return unwrapApiResponse<{ booking_policy: BookingPolicy }>(data).booking_policy;
}

export async function deleteBookingPolicy(id: string) {
  const { data } = await apiClient.delete(`/api/booking-policies/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
