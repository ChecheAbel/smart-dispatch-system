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

export async function fetchPushStatus() {
  const { data } = await apiClient.get("/api/notifications/push/status");
  return unwrapApiResponse<{ configured: boolean }>(data);
}

export type PushAudience = "drivers" | "customers" | "dispatchers";

export type SendPushBroadcastInput = {
  title: string;
  message: string;
  user_ids?: string[];
  audience?: PushAudience;
};

export async function sendPushBroadcast(input: SendPushBroadcastInput) {
  const { data } = await apiClient.post("/api/notifications/push/broadcast", input);
  return unwrapApiResponse<{ delivery: Record<string, unknown>; recipient_count: number }>(data);
}

export type OutboundChannel = "email" | "sms" | "push";

export type SendOutboundMessageInput = {
  channels: OutboundChannel[];
  title?: string;
  message: string;
  user_ids?: string[];
  audience?: PushAudience;
};

export type ChannelSendCounts = {
  sent: number;
  skipped: number;
  failed: number;
};

export async function sendOutboundMessage(input: SendOutboundMessageInput) {
  const { data } = await apiClient.post("/api/notifications/send", input);
  return unwrapApiResponse<{
    recipient_count: number;
    results: Partial<Record<OutboundChannel, ChannelSendCounts>>;
  }>(data);
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
