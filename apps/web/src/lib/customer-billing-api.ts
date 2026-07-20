import type { CustomerContractEnrollment, CustomerInvoice, CustomerPaymentMethodId, CustomerPaymentOptions, CustomerVisibleInvoiceStatus } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchMyContractEnrollmentsParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type FetchMyInvoicesParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  status?: CustomerVisibleInvoiceStatus | "";
};

export async function fetchMyContractEnrollments(params: FetchMyContractEnrollmentsParams = {}) {
  const { data } = await apiClient.get("/api/me/contract-enrollments", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
    },
  });
  return unwrapPaginatedApiResponse<CustomerContractEnrollment>(data);
}

export async function fetchMyContractEnrollmentById(id: string) {
  const { data } = await apiClient.get(`/api/me/contract-enrollments/${id}`);
  return unwrapApiResponse<{ contract_enrollment: CustomerContractEnrollment }>(data);
}

export async function fetchMyInvoices(params: FetchMyInvoicesParams = {}) {
  const { data } = await apiClient.get("/api/me/invoices", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      locale: params.locale,
      status: params.status || undefined,
    },
  });
  return unwrapPaginatedApiResponse<CustomerInvoice>(data);
}

export async function fetchMyInvoiceById(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/me/invoices/${id}`, { params: { locale } });
  return unwrapApiResponse<{ invoice: CustomerInvoice }>(data);
}

export async function fetchCustomerPaymentOptions() {
  const { data } = await apiClient.get("/api/me/billing/payment-options");
  return unwrapApiResponse<{ payment_options: CustomerPaymentOptions }>(data);
}

export type ConfirmCustomerInvoicePaymentParams = {
  payment_method?: CustomerPaymentMethodId;
  locale?: string;
};

export async function confirmCustomerInvoicePayment(
  invoiceId: string,
  params: ConfirmCustomerInvoicePaymentParams = {},
) {
  const { data } = await apiClient.post(
    `/api/me/invoices/${invoiceId}/confirm-payment`,
    { payment_method: params.payment_method },
    { params: { locale: params.locale } },
  );
  return unwrapApiResponse<{ invoice: CustomerInvoice }>(data);
}

export async function fetchMyInvoiceCount(params: Pick<FetchMyInvoicesParams, "status"> = {}) {
  const result = await fetchMyInvoices({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}
