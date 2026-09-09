import type {
  InAppNotification,
  InAppNotificationCategory,
  InAppNotificationPriority,
  RoleSlug,
} from "@smart-dispatch/types";
import {
  createUserNotification,
  getUnreadNotificationCount,
  listUserNotifications,
  markAllUserNotificationsAsRead,
  markUserNotificationAsRead,
} from "../models/user-notification.model";
import { listActiveUsersByRoleSlug } from "../models/user.model";
import { toPublicUserNotification } from "../mappers/user-notification.mapper";
import {
  emitNotificationReadAllToUser,
  emitNotificationReadToUser,
  emitUserNotificationToUser,
} from "../websocket/realtime.socket";
import {
  broadcastPushNotification,
  isPushNotificationConfigured,
  toPushTarget,
} from "./push-notification.service";

export interface SendInAppNotificationInput {
  userId: string;
  title: string;
  message: string;
  category: InAppNotificationCategory;
  priority?: InAppNotificationPriority;
  actionUrl?: string | null;
  sendPush?: boolean;
}

export async function sendInAppNotification(
  input: SendInAppNotificationInput,
): Promise<InAppNotification> {
  const dbNotification = await createUserNotification({
    userId: input.userId,
    title: input.title,
    message: input.message,
    category: input.category,
    priority: input.priority || "medium",
    actionUrl: input.actionUrl || null,
  });

  const publicNotification = toPublicUserNotification(dbNotification);

  // 1. Broadcast real-time Socket.IO event to user's room
  try {
    emitUserNotificationToUser(input.userId, publicNotification);
  } catch (socketError) {
    console.warn("Failed to emit socket notification to user:", input.userId, socketError);
  }

  // 2. Broadcast push notification to registered devices (mobile and web) in background if configured
  if (input.sendPush !== false && isPushNotificationConfigured()) {
    broadcastPushNotification({
      targets: [toPushTarget(input.userId)],
      title: input.title,
      message: input.message,
      data: {
        notificationId: publicNotification.id,
        category: input.category,
        actionUrl: input.actionUrl || "",
      },
    }).catch((pushError) => {
      // Non-fatal: external push service failures shouldn't affect in-app notifications
      console.warn("Push broadcast failed for in-app notification:", pushError instanceof Error ? pushError.message : pushError);
    });
  }

  return publicNotification;
}

export async function broadcastInAppNotificationToRoles(
  roles: RoleSlug[],
  input: Omit<SendInAppNotificationInput, "userId">,
): Promise<number> {
  const uniqueUserIds = new Set<string>();

  for (const roleSlug of roles) {
    try {
      const users = await listActiveUsersByRoleSlug(roleSlug);
      for (const user of users) {
        uniqueUserIds.add(user.id);
      }
    } catch (error) {
      console.warn(`Failed to list active users for role ${roleSlug}:`, error);
    }
  }

  let sentCount = 0;
  for (const userId of uniqueUserIds) {
    try {
      await sendInAppNotification({
        ...input,
        userId,
      });
      sentCount++;
    } catch (error) {
      console.warn(`Failed to send in-app notification to user ${userId}:`, error);
    }
  }

  return sentCount;
}

export async function fetchUserNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean; category?: string },
): Promise<{ notifications: InAppNotification[]; unreadCount: number }> {
  const [dbNotifications, unreadCount] = await Promise.all([
    listUserNotifications(userId, options),
    getUnreadNotificationCount(userId),
  ]);

  return {
    notifications: dbNotifications.map(toPublicUserNotification),
    unreadCount,
  };
}

export async function fetchUserUnreadCount(userId: string): Promise<number> {
  return getUnreadNotificationCount(userId);
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<InAppNotification | null> {
  const updated = await markUserNotificationAsRead(notificationId, userId);
  if (!updated) {
    return null;
  }

  emitNotificationReadToUser(userId, notificationId);
  return toPublicUserNotification(updated);
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const count = await markAllUserNotificationsAsRead(userId);
  emitNotificationReadAllToUser(userId);
  return count;
}
