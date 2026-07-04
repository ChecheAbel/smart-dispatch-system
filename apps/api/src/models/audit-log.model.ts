import type { AuditAction, Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

export type CreateAuditLogInput = {
  actorUserId?: string | null;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
};

export type ListAuditLogsFilter = {
  search?: string;
  module?: string;
  action?: AuditAction;
  actorUserId?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
};

const auditLogInclude = {
  actor: {
    select: {
      id: true,
      email: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} satisfies Prisma.AuditLogInclude;

export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      summary: input.summary ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      requestMethod: input.requestMethod ?? null,
      requestPath: input.requestPath ?? null,
    },
  });
}

export async function findAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: auditLogInclude,
  });
}

function buildWhere(filter?: ListAuditLogsFilter): Prisma.AuditLogWhereInput {
  if (!filter) {
    return {};
  }

  const where: Prisma.AuditLogWhereInput = {};

  if (filter.module) {
    where.module = filter.module;
  }

  if (filter.action) {
    where.action = filter.action;
  }

  if (filter.actorUserId) {
    where.actorUserId = filter.actorUserId;
  }

  if (filter.entityType) {
    where.entityType = filter.entityType;
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
      { summary: { contains: pattern, mode: "insensitive" } },
      { entityLabel: { contains: pattern, mode: "insensitive" } },
      { requestPath: { contains: pattern, mode: "insensitive" } },
      { actor: { email: { contains: pattern, mode: "insensitive" } } },
      { actor: { firstName: { contains: pattern, mode: "insensitive" } } },
      { actor: { lastName: { contains: pattern, mode: "insensitive" } } },
    ];
  }

  return where;
}

export async function countAuditLogs(filter?: ListAuditLogsFilter) {
  return prisma.auditLog.count({
    where: buildWhere(filter),
  });
}

export async function listAuditLogs(
  filter?: ListAuditLogsFilter,
  options?: { skip?: number; take?: number },
) {
  return prisma.auditLog.findMany({
    where: buildWhere(filter),
    include: auditLogInclude,
    orderBy: { createdAt: "desc" },
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
  });
}
