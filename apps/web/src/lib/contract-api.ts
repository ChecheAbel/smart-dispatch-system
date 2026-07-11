import type { Contract, ContractEnrollment, ContractStatus, ContractBillingInterval } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchContractsParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  status?: ContractStatus | "";
};

export type CreateContractInput = {
  title: string;
  status?: ContractStatus;
  notes?: string | null;
  billing_interval?: ContractBillingInterval;
  payment_terms_days?: number | null;
  region_ids?: string[];
  vehicle_type_ids?: string[];
  vehicle_class_ids?: string[];
};

export type UpdateContractInput = Partial<CreateContractInput>;

export async function fetchContracts(params: FetchContractsParams = {}) {
  const { data } = await apiClient.get("/api/contracts", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      locale: params.locale,
      status: params.status || undefined,
    },
  });
  return unwrapPaginatedApiResponse<Contract>(data);
}

export async function fetchContractCount(params: Pick<FetchContractsParams, "status"> = {}) {
  const result = await fetchContracts({ page: 1, limit: 1, ...params });
  return result.pagination.total;
}

export async function fetchContractById(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/contracts/${id}`, { params: { locale } });
  return unwrapApiResponse<{ contract: Contract }>(data);
}

export async function fetchContractEnrollments(id: string) {
  const { data } = await apiClient.get(`/api/contracts/${id}/enrollments`);
  return unwrapApiResponse<{ enrollments: ContractEnrollment[] }>(data);
}

export async function createContract(input: CreateContractInput) {
  const { data } = await apiClient.post("/api/contracts", input);
  return unwrapApiResponse<{ contract: Contract }>(data).contract;
}

export async function updateContract(id: string, input: UpdateContractInput) {
  const { data } = await apiClient.patch(`/api/contracts/${id}`, input);
  return unwrapApiResponse<{ contract: Contract }>(data).contract;
}

export async function deleteContract(id: string) {
  const { data } = await apiClient.delete(`/api/contracts/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}
