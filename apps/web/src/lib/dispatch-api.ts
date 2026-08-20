import type { AdminDispatchAutoAssignResult, AdminDispatchOverview } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export async function fetchAdminDispatchOverview(locale?: string) {
  const { data } = await apiClient.get("/api/admin/dispatch/overview", {
    params: { locale },
  });
  return unwrapApiResponse<{ overview: AdminDispatchOverview }>(data).overview;
}

export async function autoAssignDispatchQueue(options: { locale?: string; rideRequestIds?: string[] } = {}) {
  const { data } = await apiClient.post(
    "/api/admin/dispatch/auto-assign",
    options.rideRequestIds?.length ? { ride_request_ids: options.rideRequestIds } : {},
    { params: { locale: options.locale } },
  );
  return unwrapApiResponse<{ result: AdminDispatchAutoAssignResult }>(data).result;
}
