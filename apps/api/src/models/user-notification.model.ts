import { prisma } from "../db/prisma";
import type { Prisma } from "../generated/prisma";

export interface CreateUserNotificationInput {
  userId: string;
  title: string;
  message: string;
  category: string;
  priority?: string;
  actionUrl?: string | null;
}

export interface ListUserNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  category?: string;
}

export async function createUserNotification(input: CreateUserNotificationInput) {
  return prisma.userNotification.create({
    data: {
      userId: input.userId,
      title: input.title.trim(),
      message: input.message.trim(),
      category: input.category.trim(),
      priority: input.priority?.trim() || "medium",
      actionUrl: input.actionUrl?.trim() || null,
    },
  });
}

export async function listUserNotifications(
  userId: string,
  options: ListUserNotificationsOptions = {},
) {
  const where: Prisma.UserNotificationWhereInput = {
    userId,
  };

  if (options.unreadOnly) {
    where.readAt = null;
  }

  if (options.category) {
    where.category = options.category;
  }

  return prisma.userNotification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 30,
    skip: options.offset ?? 0,
  });
}

export async function countUserNotifications(
  userId: string,
  options: { unreadOnly?: boolean; category?: string } = {},
) {
  const where: Prisma.UserNotificationWhereInput = {
    userId,
  };

  if (options.unreadOnly) {
    where.readAt = null;
  }

  if (options.category) {
    where.category = options.category;
  }

  return prisma.userNotification.count({ where });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.userNotification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function findUserNotificationById(id: string, userId: string) {
  return prisma.userNotification.findFirst({
    where: { id, userId },
  });
}

export async function markUserNotificationAsRead(id: string, userId: string) {
  const existing = await prisma.userNotification.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return null;
  }

  if (existing.readAt) {
    return existing;
  }

  return prisma.userNotification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllUserNotificationsAsRead(userId: string) {
  const result = await prisma.userNotification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

export async function deleteUserNotification(id: string, userId: string) {
  const existing = await prisma.userNotification.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.userNotification.delete({
    where: { id },
  });
}
