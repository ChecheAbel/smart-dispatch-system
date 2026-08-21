import type {
  DriverShiftRosterItem,
  DriverShiftSummary,
  DriverShiftTemplate,
  DriverShiftWeek,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchDriverShiftRosterParams = {
  page?: number;
  limit?: number;
  search?: string;
  date?: string;
  shift?: string;
};

export async function fetchDriverShiftTemplates(includeInactive = false) {
  const { data } = await apiClient.get("/api/driver-shifts/templates", {
    params: includeInactive ? { include_inactive: true } : undefined,
  });
  return unwrapApiResponse<{ templates: DriverShiftTemplate[] }>(data).templates;
}

export async function createDriverShiftTemplate(input: {
  name: string;
  start_time: string;
  end_time: string;
  active?: boolean;
}) {
  const { data } = await apiClient.post("/api/driver-shifts/templates", input);
  return unwrapApiResponse<{ template: DriverShiftTemplate }>(data).template;
}

export async function updateDriverShiftTemplate(
  id: string,
  input: {
    name?: string;
    start_time?: string;
    end_time?: string;
    active?: boolean;
  },
) {
  const { data } = await apiClient.patch(`/api/driver-shifts/templates/${id}`, input);
  return unwrapApiResponse<{ template: DriverShiftTemplate }>(data).template;
}

export async function deleteDriverShiftTemplate(id: string) {
  const { data } = await apiClient.delete(`/api/driver-shifts/templates/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}

export async function fetchDriverShiftRoster(params: FetchDriverShiftRosterParams = {}) {
  const { data } = await apiClient.get("/api/driver-shifts", { params });
  return unwrapPaginatedApiResponse<DriverShiftRosterItem>(data);
}

export async function fetchDriverShiftSummary(date?: string) {
  const { data } = await apiClient.get("/api/driver-shifts/summary", {
    params: date ? { date } : undefined,
  });
  return unwrapApiResponse<{ summary: DriverShiftSummary }>(data).summary;
}

export async function fetchDriverShiftWeek(params: { date?: string; search?: string } = {}) {
  const { data } = await apiClient.get("/api/driver-shifts/week", { params });
  return unwrapApiResponse<{ week: DriverShiftWeek }>(data).week;
}

export async function assignDriverShift(input: {
  driver_user_id: string;
  work_date: string;
  shift_template_id: string | null;
}) {
  const { data } = await apiClient.put("/api/driver-shifts", input);
  return unwrapApiResponse<{
    driver: DriverShiftRosterItem["driver"];
    assignment: DriverShiftRosterItem["assignment"];
  }>(data);
}
