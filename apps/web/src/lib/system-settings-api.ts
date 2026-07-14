import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export type DeadlineSettings = {
  ride_request_cancel_grace_minutes: number;
  ride_request_edit_grace_minutes: number;
  invoice_due_soon_days: number;
  insurance_due_soon_days: number;
  inspection_due_soon_days: number;
};

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
  return updateDeadlineSettings({
    ride_request_cancel_grace_minutes: minutes,
    invoice_due_soon_days: 3,
    insurance_due_soon_days: 30,
    inspection_due_soon_days: 30,
  });
}
