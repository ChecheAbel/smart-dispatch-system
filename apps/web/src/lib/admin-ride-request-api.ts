import type { AdminRideRequest, RideRequestStatus, Vehicle } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchAdminRideRequestsParams = {
  locale?: string;
  page?: number;
  limit?: number;
  status?: RideRequestStatus | "";
  search?: string;
  upcoming?: boolean;
  vehicleId?: string;
  from_date?: string;
  to_date?: string;
};

export type AdminRideRequestStatusAction = "confirm" | "reject" | "start" | "complete" | "no_show";

export async function fetchAdminRideRequests(params: FetchAdminRideRequestsParams = {}) {
  const { data } = await apiClient.get("/api/admin/ride-requests", {
    params: {
      locale: params.locale,
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      search: params.search || undefined,
      upcoming: params.upcoming ? true : undefined,
      vehicleId: params.vehicleId || undefined,
      from_date: params.from_date || undefined,
      to_date: params.to_date || undefined,
    },
  });
  return unwrapPaginatedApiResponse<AdminRideRequest>(data);
}

export async function fetchAllAdminRideRequestsForExport(
  params: Omit<FetchAdminRideRequestsParams, "page" | "limit">,
) {
  const limit = 100;
  let page = 1;
  const items: AdminRideRequest[] = [];

  while (true) {
    const result = await fetchAdminRideRequests({ ...params, page, limit });
    items.push(...result.data);
    if (!result.pagination.has_next) {
      break;
    }
    page += 1;
  }

  return items;
}

export async function fetchAdminRideRequestCount(
  params: Pick<FetchAdminRideRequestsParams, "locale" | "status" | "upcoming"> = {},
) {
  const result = await fetchAdminRideRequests({ ...params, page: 1, limit: 1 });
  return result.pagination.total;
}

export async function fetchAdminRideRequest(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/admin/ride-requests/${id}`, { params: { locale } });
  return unwrapApiResponse<{ ride_request: AdminRideRequest }>(data).ride_request;
}

export async function fetchAssignableVehiclesForRideRequest(
  id: string,
  options: { locale?: string; search?: string } = {},
) {
  const { data } = await apiClient.get(`/api/admin/ride-requests/${id}/assignable-vehicles`, {
    params: {
      locale: options.locale,
      search: options.search || undefined,
    },
  });
  return unwrapApiResponse<{ vehicles: Vehicle[] }>(data).vehicles;
}

export async function assignAdminRideRequest(
  id: string,
  vehicleId: string,
  options: { locale?: string } = {},
) {
  const { data } = await apiClient.post(
    `/api/admin/ride-requests/${id}/assign`,
    { vehicle_id: vehicleId },
    { params: { locale: options.locale } },
  );
  return unwrapApiResponse<{ ride_request: AdminRideRequest }>(data).ride_request;
}

export async function unassignAdminRideRequest(id: string, options: { locale?: string } = {}) {
  const { data } = await apiClient.post(`/api/admin/ride-requests/${id}/unassign`, undefined, {
    params: { locale: options.locale },
  });
  return unwrapApiResponse<{ ride_request: AdminRideRequest }>(data).ride_request;
}

export async function updateAdminRideRequestStatus(
  id: string,
  action: AdminRideRequestStatusAction,
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
