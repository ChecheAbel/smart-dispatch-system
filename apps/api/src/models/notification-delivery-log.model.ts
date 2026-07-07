import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationModule,
  NotificationTemplateRecipient,
} from "@smart-dispatch/types";
import type {
  NotificationChannel as DbNotificationChannel,
  NotificationDeliveryStatus as DbNotificationDeliveryStatus,
  NotificationModule as DbNotificationModule,
  NotificationTemplateRecipient as DbNotificationTemplateRecipient,
  Prisma,
} from "../generated/prisma";
import { prisma } from "../db/prisma";

export type CreateNotificationDeliveryLogInput = {
  status: NotificationDeliveryStatus;
  module: NotificationModule;
  event: string;
  channel: NotificationChannel;
  recipient: NotificationTemplateRecipient;
  templateId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  recipientContact?: string | null;
  subject?: string | null;
  bodyPreview?: string | null;
  errorMessage?: string | null;
  isTest?: boolean;
};

export type ListNotificationDeliveryLogsFilter = {
  search?: string;
  status?: NotificationDeliveryStatus;
  module?: NotificationModule;
  channel?: NotificationChannel;
  event?: string;
  isTest?: boolean;
  from?: Date;
  to?: Date;
};

function truncate(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1)}…`;
}

export async function createNotificationDeliveryLog(input: CreateNotificationDeliveryLogInput) {
  return prisma.notificationDeliveryLog.create({
    data: {
      status: input.status as DbNotificationDeliveryStatus,
      module: input.module as DbNotificationModule,
      event: input.event,
      channel: input.channel as DbNotificationChannel,
      recipient: input.recipient as DbNotificationTemplateRecipient,
      templateId: input.templateId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      recipientContact: truncate(input.recipientContact, 255),
      subject: truncate(input.subject, 255),
      bodyPreview: truncate(input.bodyPreview, 500),
      errorMessage: truncate(input.errorMessage, 500),
      isTest: input.isTest ?? false,
    },
  });
}

export function queueNotificationDeliveryLog(input: CreateNotificationDeliveryLogInput) {
  void createNotificationDeliveryLog(input).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[Notification] Failed to persist delivery log: ${message}`);
  });
}

function buildWhere(
  filter?: ListNotificationDeliveryLogsFilter,
): Prisma.NotificationDeliveryLogWhereInput {
  if (!filter) {
    return {};
  }

  const where: Prisma.NotificationDeliveryLogWhereInput = {};

  if (filter.status) {
    where.status = filter.status as DbNotificationDeliveryStatus;
  }

  if (filter.module) {
    where.module = filter.module as DbNotificationModule;
  }

  if (filter.channel) {
    where.channel = filter.channel as DbNotificationChannel;
  }

  if (filter.event) {
    where.event = filter.event;
  }

  if (filter.isTest !== undefined) {
    where.isTest = filter.isTest;
  }

  if (filter.from || filter.to) {
    where.createdAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  if (filter.search) {
    const pattern = filter.search.trim();
    where.OR = [
      { recipientContact: { contains: pattern, mode: "insensitive" } },
      { subject: { contains: pattern, mode: "insensitive" } },
      { bodyPreview: { contains: pattern, mode: "insensitive" } },
      { errorMessage: { contains: pattern, mode: "insensitive" } },
      { entityId: { contains: pattern, mode: "insensitive" } },
      { event: { contains: pattern, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function countNotificationDeliveryLogs(filter?: ListNotificationDeliveryLogsFilter) {
  return prisma.notificationDeliveryLog.count({
    where: buildWhere(filter),
  });
}

export async function listNotificationDeliveryLogs(
  filter?: ListNotificationDeliveryLogsFilter,
  options?: { skip?: number; take?: number },
) {
  return prisma.notificationDeliveryLog.findMany({
    where: buildWhere(filter),
    orderBy: { createdAt: "desc" },
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
  });
}

export async function findNotificationDeliveryLogById(id: string) {
  return prisma.notificationDeliveryLog.findUnique({
    where: { id },
  });
}
