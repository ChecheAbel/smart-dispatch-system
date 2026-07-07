import type { AdminRideRequest, RideRequestStatus } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchAdminRideRequestsParams = {
  locale?: string;
  page?: number;
  limit?: number;
  status?: RideRequestStatus | "";
  search?: string;
};

export async function fetchAdminRideRequests(params: FetchAdminRideRequestsParams = {}) {
  const { data } = await apiClient.get("/api/admin/ride-requests", {
    params: {
      locale: params.locale,
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      search: params.search || undefined,
    },
  });
  return unwrapPaginatedApiResponse<AdminRideRequest>(data);
}

export async function fetchAdminRideRequestCount(
  params: Pick<FetchAdminRideRequestsParams, "locale" | "status"> = {},
) {
  const result = await fetchAdminRideRequests({ ...params, page: 1, limit: 1 });
  return result.pagination.total;
}

export async function fetchAdminRideRequest(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/admin/ride-requests/${id}`, { params: { locale } });
  return unwrapApiResponse<{ ride_request: AdminRideRequest }>(data).ride_request;
}

export async function updateAdminRideRequestStatus(
  id: string,
  action: "confirm" | "reject",
  options: { locale?: string; rejectionReason?: string } = {},
) {
  const { data } = await apiClient.post(
    `/api/admin/ride-requests/${id}/status`,
    {
      action,
      rejection_reason: options.rejectionReason,
    },
    { params: { locale: options.locale } },
  );
  return unwrapApiResponse<{ ride_request: AdminRideRequest }>(data).ride_request;
}
