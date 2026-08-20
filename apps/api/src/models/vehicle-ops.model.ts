import type { Prisma } from "../generated/prisma";
import {
  VehicleFuelLogSource,
  VehicleFuelType,
  VehicleHistoryEventType,
  VehicleMaintenanceStatus,
} from "../generated/prisma";
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
  driverAtRequestId?: string | null;
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
  vehicle: {
    select: {
      id: true,
      plateNumber: true,
      make: true,
      model: true,
      status: true,
    },
  },
  workType: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
  driverAtRequest: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} as const;

export type VehicleMaintenanceLogFilters = {
  vehicleId?: string;
  status?: VehicleMaintenanceStatus;
  search?: string;
};

function buildMaintenanceWhere(filters: VehicleMaintenanceLogFilters): Prisma.VehicleMaintenanceLogWhereInput {
  const search = filters.search?.trim();

  return {
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { vendor: { contains: search, mode: "insensitive" } },
            { vehicle: { plateNumber: { contains: search, mode: "insensitive" } } },
            {
              driverAtRequest: {
                is: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { middleName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

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

export async function listAllVehicleMaintenanceLogs(
  filters: VehicleMaintenanceLogFilters,
  options?: { skip?: number; take?: number },
) {
  return prisma.vehicleMaintenanceLog.findMany({
    where: buildMaintenanceWhere(filters),
    include: maintenanceInclude,
    orderBy: { createdAt: "desc" },
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
  });
}

export async function countAllVehicleMaintenanceLogs(filters: VehicleMaintenanceLogFilters) {
  return prisma.vehicleMaintenanceLog.count({ where: buildMaintenanceWhere(filters) });
}

export async function getFleetMaintenanceStats() {
  const grouped = await prisma.vehicleMaintenanceLog.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const stats = {
    total: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of grouped) {
    stats[row.status] = row._count._all;
    stats.total += row._count._all;
  }

  return stats;
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
      driverAtRequestId: input.driverAtRequestId ?? null,
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

export type CreateVehicleFuelLogInput = {
  vehicleId: string;
  loggedAt: Date;
  odometerKm: number;
  quantityLiters: number;
  totalCost?: number | null;
  fuelType?: VehicleFuelType;
  stationName?: string | null;
  receiptReference?: string | null;
  source?: VehicleFuelLogSource;
  notes?: string | null;
  createdById?: string | null;
  driverAtRefillId?: string | null;
};

export type UpdateVehicleFuelLogInput = {
  loggedAt?: Date;
  odometerKm?: number;
  quantityLiters?: number;
  totalCost?: number | null;
  fuelType?: VehicleFuelType;
  stationName?: string | null;
  receiptReference?: string | null;
  notes?: string | null;
};

const fuelInclude = {
  vehicle: {
    select: {
      id: true,
      plateNumber: true,
      make: true,
      model: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
  driverAtRefill: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  },
} as const;

export type VehicleFuelLogFilters = {
  vehicleId?: string;
  fuelType?: VehicleFuelType;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
};

function buildFuelWhere(filters: VehicleFuelLogFilters): Prisma.VehicleFuelLogWhereInput {
  const search = filters.search?.trim();

  return {
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(filters.fuelType ? { fuelType: filters.fuelType } : {}),
    ...(filters.fromDate || filters.toDate
      ? {
          loggedAt: {
            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
            ...(filters.toDate ? { lt: filters.toDate } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { stationName: { contains: search, mode: "insensitive" } },
            { receiptReference: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
            { vehicle: { plateNumber: { contains: search, mode: "insensitive" } } },
            {
              driverAtRefill: {
                is: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { middleName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function listVehicleFuelLogs(
  vehicleId: string,
  options?: { skip?: number; take?: number },
) {
  return prisma.vehicleFuelLog.findMany({
    where: { vehicleId },
    include: fuelInclude,
    orderBy: [{ loggedAt: "desc" }, { createdAt: "desc" }],
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
  });
}

export async function countVehicleFuelLogs(vehicleId: string) {
  return prisma.vehicleFuelLog.count({ where: { vehicleId } });
}

export async function listAllVehicleFuelLogs(
  filters: VehicleFuelLogFilters,
  options?: { skip?: number; take?: number },
) {
  return prisma.vehicleFuelLog.findMany({
    where: buildFuelWhere(filters),
    include: fuelInclude,
    orderBy: [{ loggedAt: "desc" }, { createdAt: "desc" }],
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
  });
}

export async function countAllVehicleFuelLogs(filters: VehicleFuelLogFilters) {
  return prisma.vehicleFuelLog.count({ where: buildFuelWhere(filters) });
}

export async function getFleetFuelStats() {
  const [totals, vehicles] = await Promise.all([
    prisma.vehicleFuelLog.aggregate({
      _count: { _all: true },
      _sum: { quantityLiters: true, totalCost: true },
    }),
    prisma.vehicleFuelLog.groupBy({ by: ["vehicleId"] }),
  ]);

  return {
    total_logs: totals._count._all,
    vehicles_fueled: vehicles.length,
    total_liters: Number(totals._sum.quantityLiters ?? 0),
    total_cost: Number(totals._sum.totalCost ?? 0),
  };
}

export async function findVehicleFuelLogById(id: string) {
  return prisma.vehicleFuelLog.findUnique({
    where: { id },
    include: fuelInclude,
  });
}

export async function createVehicleFuelLog(input: CreateVehicleFuelLogInput) {
  return prisma.vehicleFuelLog.create({
    data: {
      vehicleId: input.vehicleId,
      loggedAt: input.loggedAt,
      odometerKm: input.odometerKm,
      quantityLiters: input.quantityLiters,
      totalCost: input.totalCost ?? null,
      fuelType: input.fuelType ?? VehicleFuelType.diesel,
      stationName: input.stationName?.trim() || null,
      receiptReference: input.receiptReference?.trim() || null,
      source: input.source ?? VehicleFuelLogSource.manual,
      notes: input.notes?.trim() || null,
      createdById: input.createdById ?? null,
      driverAtRefillId: input.driverAtRefillId ?? null,
    },
    include: fuelInclude,
  });
}

export async function updateVehicleFuelLog(id: string, input: UpdateVehicleFuelLogInput) {
  return prisma.vehicleFuelLog.update({
    where: { id },
    data: {
      loggedAt: input.loggedAt,
      odometerKm: input.odometerKm,
      quantityLiters: input.quantityLiters,
      totalCost: input.totalCost,
      fuelType: input.fuelType,
      stationName: input.stationName === undefined ? undefined : input.stationName?.trim() || null,
      receiptReference:
        input.receiptReference === undefined
          ? undefined
          : input.receiptReference?.trim() || null,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
    },
    include: fuelInclude,
  });
}

export function parseVehicleFuelType(value: unknown): VehicleFuelType | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return Object.values(VehicleFuelType).includes(normalized as VehicleFuelType)
    ? (normalized as VehicleFuelType)
    : undefined;
}

export function parseVehicleFuelLogSource(value: unknown): VehicleFuelLogSource | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return Object.values(VehicleFuelLogSource).includes(normalized as VehicleFuelLogSource)
    ? (normalized as VehicleFuelLogSource)
    : undefined;
}

export async function findPreviousVehicleFuelLog(vehicleId: string, loggedAt: Date, id?: string) {
  return prisma.vehicleFuelLog.findFirst({
    where: {
      vehicleId,
      loggedAt: { lt: loggedAt },
      ...(id ? { id: { not: id } } : {}),
    },
    orderBy: [{ loggedAt: "desc" }, { createdAt: "desc" }],
    select: { odometerKm: true, loggedAt: true },
  });
}

export async function buildVehicleFuelPreviousOdometerMap(vehicleId: string) {
  const entries = await prisma.vehicleFuelLog.findMany({
    where: { vehicleId },
    orderBy: [{ loggedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, odometerKm: true },
  });

  const map = new Map<string, number | null>();
  let previous: number | null = null;

  for (const entry of entries) {
    map.set(entry.id, previous);
    previous = entry.odometerKm;
  }

  return map;
}

export async function buildFleetFuelPreviousOdometerMap(vehicleIds: string[]) {
  const entries = await prisma.vehicleFuelLog.findMany({
    where: { vehicleId: { in: [...new Set(vehicleIds)] } },
    orderBy: [{ vehicleId: "asc" }, { loggedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, vehicleId: true, odometerKm: true },
  });

  const previousByVehicle = new Map<string, number>();
  const map = new Map<string, number | null>();

  for (const entry of entries) {
    map.set(entry.id, previousByVehicle.get(entry.vehicleId) ?? null);
    previousByVehicle.set(entry.vehicleId, entry.odometerKm);
  }

  return map;
}
