import type {
  DriverAttendanceRosterItem,
  DriverAttendanceStatus,
  DriverAttendanceSummary,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type DriverAttendanceStatusFilter = DriverAttendanceStatus | "unmarked";

export type FetchDriverAttendanceParams = {
  page?: number;
  limit?: number;
  search?: string;
  date?: string;
  status?: DriverAttendanceStatusFilter;
};

export async function fetchDriverAttendanceRoster(params: FetchDriverAttendanceParams = {}) {
  const { data } = await apiClient.get("/api/driver-attendance", { params });
  return unwrapPaginatedApiResponse<DriverAttendanceRosterItem>(data);
}

export async function fetchDriverAttendanceSummary(date?: string) {
  const { data } = await apiClient.get("/api/driver-attendance/summary", {
    params: date ? { date } : undefined,
  });
  return unwrapApiResponse<{ summary: DriverAttendanceSummary }>(data).summary;
}
