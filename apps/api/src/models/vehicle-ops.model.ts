import type { Prisma } from "../generated/prisma";
import { VehicleHistoryEventType, VehicleMaintenanceStatus } from "../generated/prisma";
import { prisma } from "../db/prisma";

export type CreateVehicleMaintenanceInput = {
  vehicleId: string;
  workTypeId: string;
  status?: VehicleMaintenanceStatus;
  title: string;
  description?: string | null;
  vendor?: string | null;
  costAmount?: number | null;
  odometerKm?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  nextDueAt?: Date | null;
  nextDueKm?: number | null;
  createdById?: string | null;
};

export type UpdateVehicleMaintenanceInput = {
  workTypeId?: string;
  status?: VehicleMaintenanceStatus;
  title?: string;
  description?: string | null;
  vendor?: string | null;
  costAmount?: number | null;
  odometerKm?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  nextDueAt?: Date | null;
  nextDueKm?: number | null;
};

export type CreateVehicleHistoryEventInput = {
  vehicleId: string;
  eventType: VehicleHistoryEventType;
  summary: string;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
};

const maintenanceInclude = {
  workType: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} as const;

const historyInclude = {
  actor: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} as const;

export async function createVehicleHistoryEvent(input: CreateVehicleHistoryEventInput) {
  return prisma.vehicleHistoryEvent.create({
    data: {
      vehicleId: input.vehicleId,
      eventType: input.eventType,
      summary: input.summary.trim(),
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      actorUserId: input.actorUserId ?? null,
    },
    include: historyInclude,
  });
}

export async function listVehicleHistoryEvents(
  vehicleId: string,
  options?: { skip?: number; take?: number },
) {
  return prisma.vehicleHistoryEvent.findMany({
    where: { vehicleId },
    include: historyInclude,
    orderBy: { createdAt: "desc" },
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
  });
}

export async function countVehicleHistoryEvents(vehicleId: string) {
  return prisma.vehicleHistoryEvent.count({ where: { vehicleId } });
}

export async function countOpenVehicleMaintenance(vehicleId: string) {
  return prisma.vehicleMaintenanceLog.count({
    where: {
      vehicleId,
      status: { in: [VehicleMaintenanceStatus.open, VehicleMaintenanceStatus.in_progress] },
    },
  });
}

export async function listVehicleMaintenanceLogs(
  vehicleId: string,
  options?: { skip?: number; take?: number; status?: VehicleMaintenanceStatus },
) {
  return prisma.vehicleMaintenanceLog.findMany({
    where: {
      vehicleId,
      ...(options?.status ? { status: options.status } : {}),
    },
    include: maintenanceInclude,
    orderBy: { createdAt: "desc" },
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
  });
}

export async function countVehicleMaintenanceLogs(
  vehicleId: string,
  options?: { status?: VehicleMaintenanceStatus },
) {
  return prisma.vehicleMaintenanceLog.count({
    where: {
      vehicleId,
      ...(options?.status ? { status: options.status } : {}),
    },
  });
}

export async function findVehicleMaintenanceLogById(id: string) {
  return prisma.vehicleMaintenanceLog.findUnique({
    where: { id },
    include: maintenanceInclude,
  });
}

export async function createVehicleMaintenanceLog(input: CreateVehicleMaintenanceInput) {
  return prisma.vehicleMaintenanceLog.create({
    data: {
      vehicleId: input.vehicleId,
      workTypeId: input.workTypeId,
      status: input.status ?? VehicleMaintenanceStatus.open,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      vendor: input.vendor?.trim() || null,
      costAmount: input.costAmount ?? null,
      odometerKm: input.odometerKm ?? null,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null,
      nextDueAt: input.nextDueAt ?? null,
      nextDueKm: input.nextDueKm ?? null,
      createdById: input.createdById ?? null,
    },
    include: maintenanceInclude,
  });
}

export async function updateVehicleMaintenanceLog(id: string, input: UpdateVehicleMaintenanceInput) {
  return prisma.vehicleMaintenanceLog.update({
    where: { id },
    data: {
      workTypeId: input.workTypeId,
      status: input.status,
      title: input.title === undefined ? undefined : input.title.trim(),
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      vendor: input.vendor === undefined ? undefined : input.vendor?.trim() || null,
      costAmount: input.costAmount,
      odometerKm: input.odometerKm,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      nextDueAt: input.nextDueAt,
      nextDueKm: input.nextDueKm,
    },
    include: maintenanceInclude,
  });
}

export function parseVehicleMaintenanceStatus(value: unknown): VehicleMaintenanceStatus | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return Object.values(VehicleMaintenanceStatus).includes(normalized as VehicleMaintenanceStatus)
    ? (normalized as VehicleMaintenanceStatus)
    : undefined;
}

export function isOpenMaintenanceStatus(status: VehicleMaintenanceStatus) {
  return status === VehicleMaintenanceStatus.open || status === VehicleMaintenanceStatus.in_progress;
}
