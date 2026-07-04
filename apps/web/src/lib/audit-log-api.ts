import type { AuditAction, AuditLog } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchAuditLogsParams = {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  action?: AuditAction;
  actor_user_id?: string;
  entity_type?: string;
  from?: string;
  to?: string;
};

export async function fetchAuditLogs(params: FetchAuditLogsParams = {}) {
  const { data } = await apiClient.get("/api/audit-logs", { params });
  return unwrapPaginatedApiResponse<AuditLog>(data);
}

export async function fetchAuditLogById(id: string) {
  const { data } = await apiClient.get(`/api/audit-logs/${id}`);
  return unwrapApiResponse<{ audit_log: AuditLog }>(data).audit_log;
}
