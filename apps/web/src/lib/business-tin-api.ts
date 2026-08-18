import type {
  BusinessLicenseAddress,
  BusinessLicenseDetail,
  BusinessTinLicense,
  BusinessTinRegistration,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export type BusinessTinAutofillFields = {
  organizationName: string;
  registrationNumber: string;
  organizationAddress: string;
};

export async function fetchBusinessTinRegistration(tin: string, signal?: AbortSignal) {
  const { data } = await apiClient.get(`/api/business-tin/${encodeURIComponent(tin)}`, { signal });
  return unwrapApiResponse<{ registration: BusinessTinRegistration }>(data).registration;
}

export async function fetchBusinessTinLicense(
  tin: string,
  licenseNo: string,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get(`/api/business-tin/${encodeURIComponent(tin)}/license`, {
    params: { license_no: licenseNo },
    signal,
  });
  return unwrapApiResponse<{ license: BusinessLicenseDetail }>(data).license;
}

export function formatBusinessLicenseAddress(address: BusinessLicenseAddress | null | undefined) {
  if (!address) return "";

  const parts: string[] = [];
  if (address.house_no) parts.push(`House ${address.house_no}`);
  if (address.kebele) parts.push(`Kebele ${address.kebele}`);
  if (address.woreda) parts.push(address.woreda);
  if (address.zone && address.zone !== address.woreda && address.zone !== address.region) {
    parts.push(address.zone);
  }
  if (address.region) parts.push(address.region);

  return parts.join(", ");
}

export function businessFieldsFromTinLookup(
  registration: BusinessTinRegistration,
  license: BusinessTinLicense,
  detail: BusinessLicenseDetail | null,
): BusinessTinAutofillFields {
  return {
    organizationName:
      license.business_name.trim() ||
      registration.owner_name.trim() ||
      detail?.trade_name?.trim() ||
      "",
    registrationNumber: detail?.license_no?.trim() || license.license_no.trim(),
    organizationAddress: formatBusinessLicenseAddress(detail?.address),
  };
}
