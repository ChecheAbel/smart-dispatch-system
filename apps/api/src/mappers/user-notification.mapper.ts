import type {
  InAppNotification,
  InAppNotificationCategory,
  InAppNotificationPriority,
} from "@smart-dispatch/types";
import type { UserNotification as DbUserNotification } from "../generated/prisma";

export function toPublicUserNotification(notification: DbUserNotification): InAppNotification {
  return {
    id: notification.id,
    user_id: notification.userId,
    title: notification.title,
    message: notification.message,
    category: notification.category as InAppNotificationCategory,
    priority: (notification.priority || "medium") as InAppNotificationPriority,
    action_url: notification.actionUrl,
    read_at: notification.readAt ? notification.readAt.toISOString() : null,
    created_at: notification.createdAt.toISOString(),
  };
}
