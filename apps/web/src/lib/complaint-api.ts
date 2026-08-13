import type { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus, ComplaintSummary } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type ComplaintListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: ComplaintCategory;
};

export async function fetchMyComplaints(params: ComplaintListParams = {}) {
  const { data } = await apiClient.get("/api/complaints/mine", { params });
  return unwrapPaginatedApiResponse<Complaint>(data);
}

export async function fetchAdminComplaints(params: ComplaintListParams = {}) {
  const { data } = await apiClient.get("/api/complaints/admin", { params });
  return unwrapPaginatedApiResponse<Complaint>(data);
}

export async function fetchComplaintSummary(admin = false) {
  const { data } = await apiClient.get(`/api/complaints/${admin ? "admin" : "mine"}/summary`);
  return unwrapApiResponse<{ summary: ComplaintSummary }>(data).summary;
}

export async function createComplaint(input: {
  category: ComplaintCategory;
  subject: string;
  description: string;
  ride_request_id?: string | null;
}) {
  const { data } = await apiClient.post("/api/complaints", input);
  return unwrapApiResponse<{ complaint: Complaint }>(data).complaint;
}

export async function updateComplaint(id: string, input: {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assigned_to_user_id?: string | null;
  admin_response?: string | null;
}) {
  const { data } = await apiClient.patch(`/api/complaints/admin/${id}`, input);
  return unwrapApiResponse<{ complaint: Complaint }>(data).complaint;
}
