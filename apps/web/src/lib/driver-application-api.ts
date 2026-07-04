import type { DriverApplication } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchDriverApplicationsParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function fetchDriverApplications(params: FetchDriverApplicationsParams = {}) {
  const { data } = await apiClient.get("/api/driver-applications", { params });
  return unwrapPaginatedApiResponse<DriverApplication>(data);
}

export async function fetchDriverApplicationCount() {
  const { data } = await apiClient.get("/api/driver-applications/count");
  return unwrapApiResponse<{ count: number }>(data).count;
}

export async function fetchDriverApplicationById(id: string) {
  const { data } = await apiClient.get(`/api/driver-applications/${id}`);
  return unwrapApiResponse<{ application: DriverApplication }>(data).application;
}

export async function approveDriverApplication(id: string) {
  const { data } = await apiClient.post(`/api/driver-applications/${id}/approve`);
  return unwrapApiResponse<{ application?: DriverApplication; message?: string }>(data);
}

export async function rejectDriverApplication(id: string) {
  const { data } = await apiClient.post(`/api/driver-applications/${id}/reject`);
  return unwrapApiResponse<{ message: string }>(data);
}

export function resolveUploadUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
