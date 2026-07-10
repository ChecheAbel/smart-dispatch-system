import type { AdminDashboardAnalytics } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export async function fetchAdminDashboardAnalytics(params: {
  locale?: string;
  period_days?: number;
} = {}) {
  const { data } = await apiClient.get("/api/admin/dashboard/analytics", { params });
  return unwrapApiResponse<{ analytics: AdminDashboardAnalytics }>(data).analytics;
}
