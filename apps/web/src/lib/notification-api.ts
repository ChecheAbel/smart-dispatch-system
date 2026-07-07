import type { NotificationChannel, NotificationConfiguration } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export type UpdateNotificationConfigurationInput = {
  is_enabled?: boolean;
  provider?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  reply_to?: string | null;
  sender_id?: string | null;
  settings?: Record<string, unknown>;
};

export async function fetchNotificationConfiguration(channel: NotificationChannel) {
  const { data } = await apiClient.get(`/api/notifications/${channel}`);
  return unwrapApiResponse<{ configuration: NotificationConfiguration }>(data).configuration;
}

export async function updateNotificationConfiguration(
  channel: NotificationChannel,
  input: UpdateNotificationConfigurationInput,
) {
  const { data } = await apiClient.patch(`/api/notifications/${channel}`, input);
  return unwrapApiResponse<{ configuration: NotificationConfiguration }>(data).configuration;
}

export async function sendTestSms(input: { to: string }) {
  const { data } = await apiClient.post("/api/notifications/sms/test", input);
  return unwrapApiResponse<{ delivery: { provider: string; to: string; message: string } }>(data);
}

export type NotificationTemplateInput = {
  id: string;
  is_enabled: boolean;
  subject?: string | null;
  body: string;
};

export async function fetchNotificationTemplates() {
  const { data } = await apiClient.get("/api/notifications/templates");
  return unwrapApiResponse<{
    templates: import("@smart-dispatch/types").NotificationTemplate[];
  }>(data);
}

export async function updateNotificationTemplates(templates: NotificationTemplateInput[]) {
  const { data } = await apiClient.put("/api/notifications/templates", { templates });
  return unwrapApiResponse<{
    templates: import("@smart-dispatch/types").NotificationTemplate[];
  }>(data);
}

export async function sendNotificationTemplateTest(templateId: string, input: { to?: string } = {}) {
  const { data } = await apiClient.post(`/api/notifications/templates/${templateId}/test`, input);
  return unwrapApiResponse<{ delivery: Record<string, unknown> }>(data);
}
