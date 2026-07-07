import type {
  NotificationChannel,
  NotificationDeliveryLog,
  NotificationDeliveryStatus,
  NotificationModule,
} from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchNotificationDeliveryLogsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: NotificationDeliveryStatus;
  module?: NotificationModule;
  channel?: NotificationChannel;
  event?: string;
  is_test?: boolean;
  from?: string;
  to?: string;
};

export async function fetchNotificationDeliveryLogs(
  params: FetchNotificationDeliveryLogsParams = {},
) {
  const { data } = await apiClient.get("/api/notification-delivery-logs", { params });
  return unwrapPaginatedApiResponse<NotificationDeliveryLog>(data);
}

export async function fetchNotificationDeliveryLogById(id: string) {
  const { data } = await apiClient.get(`/api/notification-delivery-logs/${id}`);
  return unwrapApiResponse<{ delivery_log: NotificationDeliveryLog }>(data).delivery_log;
}
