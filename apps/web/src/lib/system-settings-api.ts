import type { BrandingSettings } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export type DeadlineSettings = {
  ride_request_cancel_grace_minutes: number;
  ride_request_edit_grace_minutes: number;
  invoice_due_soon_days: number;
  insurance_due_soon_days: number;
  inspection_due_soon_days: number;
};

export type { BrandingSettings };

export async function fetchDeadlineSettings() {
  const { data } = await apiClient.get("/api/admin/system-settings/deadline");
  return unwrapApiResponse<DeadlineSettings>(data);
}

export async function updateDeadlineSettings(input: DeadlineSettings) {
  const { data } = await apiClient.patch(
    "/api/admin/system-settings/deadline",
    input,
  );
  return unwrapApiResponse<DeadlineSettings>(data);
}

export async function fetchRideRequestDeadlineSettings() {
  return fetchDeadlineSettings();
}

export async function updateRideRequestDeadlineSettings(minutes: number) {
  const current = await fetchDeadlineSettings();
  return updateDeadlineSettings({
    ...current,
    ride_request_cancel_grace_minutes: minutes,
  });
}

export async function fetchBrandingSettings() {
  const { data } = await apiClient.get("/api/admin/system-settings/branding");
  const payload = unwrapApiResponse<{ branding: BrandingSettings }>(data);
  return payload.branding;
}

export async function updateBrandingSettings(input: BrandingSettings) {
  const { data } = await apiClient.patch(
    "/api/admin/system-settings/branding",
    input,
  );
  const payload = unwrapApiResponse<{ branding: BrandingSettings }>(data);
  return payload.branding;
}

export async function uploadBrandLogo(file: File) {
  const formData = new FormData();
  formData.append("logo", file);
  const { data } = await apiClient.post(
    "/api/admin/system-settings/branding/logo",
    formData,
  );
  const payload = unwrapApiResponse<{ branding: BrandingSettings }>(data);
  return payload.branding;
}
