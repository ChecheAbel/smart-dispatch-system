import type { Invoice, InvoiceStatus } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchInvoicesParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  status?: InvoiceStatus | "";
  contract_id?: string;
  requester_user_id?: string;
};

export type GenerateInvoiceInput = {
  contract_enrollment_id?: string;
  ride_request_id?: string;
  issue?: boolean;
  notes?: string | null;
};

export async function fetchInvoices(params: FetchInvoicesParams = {}) {
  const { data } = await apiClient.get("/api/invoices", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      locale: params.locale,
      status: params.status || undefined,
      contract_id: params.contract_id || undefined,
      requester_user_id: params.requester_user_id || undefined,
    },
  });
  return unwrapPaginatedApiResponse<Invoice>(data);
}

export async function fetchInvoiceCount(params: Pick<FetchInvoicesParams, "status"> = {}) {
  const result = await fetchInvoices({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchInvoiceById(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/invoices/${id}`, { params: { locale } });
  return unwrapApiResponse<{ invoice: Invoice }>(data);
}

export async function generateInvoice(input: GenerateInvoiceInput) {
  const { data } = await apiClient.post("/api/invoices/generate", input);
  return unwrapApiResponse<{ invoice: Invoice }>(data).invoice;
}

export async function issueInvoice(id: string) {
  const { data } = await apiClient.post(`/api/invoices/${id}/issue`);
  return unwrapApiResponse<{ invoice: Invoice }>(data).invoice;
}

export async function markInvoicePaid(id: string) {
  const { data } = await apiClient.post(`/api/invoices/${id}/mark-paid`);
  return unwrapApiResponse<{ invoice: Invoice }>(data).invoice;
}

export async function voidInvoice(id: string) {
  const { data } = await apiClient.post(`/api/invoices/${id}/void`);
  return unwrapApiResponse<{ invoice: Invoice }>(data).invoice;
}
