import { VehicleHistoryEventType, VehicleStatus } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { findUserByIdWithRoles } from "./user.model";
import { createVehicleHistoryEvent } from "./vehicle-ops.model";

export type CreateVehicleInput = {
  plateNumber: string;
  chassisNumber?: string | null;
  vehicleTypeId: string;
  vehicleClassId: string;
  assignedDriverUserId?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: VehicleStatus;
  notes?: string | null;
  insuranceExpiresAt?: Date | null;
  inspectionExpiresAt?: Date | null;
  registrationExpiresAt?: Date | null;
  actorUserId?: string | null;
};

export type UpdateVehicleInput = {
  plateNumber?: string;
  chassisNumber?: string | null;
  vehicleTypeId?: string;
  vehicleClassId?: string;
  assignedDriverUserId?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: VehicleStatus;
  notes?: string | null;
  insuranceExpiresAt?: Date | null;
  inspectionExpiresAt?: Date | null;
  registrationExpiresAt?: Date | null;
  actorUserId?: string | null;
};

export type ListVehiclesFilter = {
  search?: string;
  vehicleTypeId?: string;
  vehicleClassId?: string;
  status?: VehicleStatus;
  assignedDriverUserId?: string;
  unassignedOnly?: boolean;
  assignedOnly?: boolean;
};

const vehicleInclude = {
  vehicleType: true,
  vehicleClass: true,
  assignedDriver: true,
} as const;

function normalizePlateNumber(plateNumber: string) {
  return plateNumber.trim().toUpperCase();
}

function normalizeChassisNumber(chassisNumber: string) {
  return chassisNumber.trim().toUpperCase();
}

export async function assertAssignableDriver(userId: string) {
  const user = await findUserByIdWithRoles(userId);
  if (!user) {
    throw new Error("DRIVER_NOT_FOUND");
  }

  const isDriver = user.authRoles.some((authRole) => authRole.role.slug === "driver");
  if (!isDriver) {
    throw new Error("USER_NOT_DRIVER");
  }

  if (user.accountStatus !== "active" || user.accountActivation !== "activated") {
    throw new Error("DRIVER_NOT_ACTIVE");
  }

  return user;
}

async function clearDriverFromOtherVehicles(driverUserId: string, exceptVehicleId?: string) {
  await prisma.vehicle.updateMany({
    where: {
      assignedDriverUserId: driverUserId,
      ...(exceptVehicleId ? { NOT: { id: exceptVehicleId } } : {}),
    },
    data: { assignedDriverUserId: null },
  });
}

export async function findVehicleById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: vehicleInclude,
  });
}

function buildVehicleWhere(filter?: ListVehiclesFilter) {
  const search = filter?.search?.trim();

  return {
    ...(filter?.vehicleTypeId ? { vehicleTypeId: filter.vehicleTypeId } : {}),
    ...(filter?.vehicleClassId ? { vehicleClassId: filter.vehicleClassId } : {}),
    ...(filter?.status ? { status: filter.status } : {}),
    ...(filter?.assignedDriverUserId
      ? { assignedDriverUserId: filter.assignedDriverUserId }
      : {}),
    ...(filter?.unassignedOnly ? { assignedDriverUserId: null } : {}),
    ...(filter?.assignedOnly ? { assignedDriverUserId: { not: null } } : {}),
    ...(search
      ? {
          OR: [
            { plateNumber: { contains: search, mode: "insensitive" as const } },
            { chassisNumber: { contains: search, mode: "insensitive" as const } },
            { make: { contains: search, mode: "insensitive" as const } },
            { model: { contains: search, mode: "insensitive" as const } },
            {
              assignedDriver: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" as const } },
                  { lastName: { contains: search, mode: "insensitive" as const } },
                  { email: { contains: search, mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : {}),
  };
}

export async function listVehicles(
  filter?: ListVehiclesFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;

  return prisma.vehicle.findMany({
    where: buildVehicleWhere(filter),
    include: vehicleInclude,
    skip,
    take,
    orderBy: { plateNumber: "asc" },
  });
}

export async function countVehicles(filter?: ListVehiclesFilter) {
  return prisma.vehicle.count({
    where: buildVehicleWhere(filter),
  });
}

function dateKey(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function createVehicle(input: CreateVehicleInput) {
  if (input.assignedDriverUserId) {
    await assertAssignableDriver(input.assignedDriverUserId);
    await clearDriverFromOtherVehicles(input.assignedDriverUserId);
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      plateNumber: normalizePlateNumber(input.plateNumber),
      chassisNumber: input.chassisNumber?.trim()
        ? normalizeChassisNumber(input.chassisNumber)
        : null,
      vehicleTypeId: input.vehicleTypeId,
      vehicleClassId: input.vehicleClassId,
      assignedDriverUserId: input.assignedDriverUserId ?? null,
      make: input.make?.trim() || null,
      model: input.model?.trim() || null,
      year: input.year ?? null,
      status: input.status ?? VehicleStatus.active,
      notes: input.notes?.trim() || null,
      insuranceExpiresAt: input.insuranceExpiresAt ?? null,
      inspectionExpiresAt: input.inspectionExpiresAt ?? null,
      registrationExpiresAt: input.registrationExpiresAt ?? null,
    },
    include: vehicleInclude,
  });

  await createVehicleHistoryEvent({
    vehicleId: vehicle.id,
    eventType: VehicleHistoryEventType.created,
    summary: `Vehicle ${vehicle.plateNumber} created`,
    actorUserId: input.actorUserId,
    metadata: { status: vehicle.status },
  });

  if (vehicle.assignedDriverUserId) {
    await createVehicleHistoryEvent({
      vehicleId: vehicle.id,
      eventType: VehicleHistoryEventType.driver_assigned,
      summary: "Default driver assigned",
      actorUserId: input.actorUserId,
      metadata: { driver_user_id: vehicle.assignedDriverUserId },
    });
  }

  return vehicle;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput) {
  const existing = await findVehicleById(id);
  if (!existing) {
    throw new Error("VEHICLE_NOT_FOUND");
  }

  if (input.assignedDriverUserId) {
    await assertAssignableDriver(input.assignedDriverUserId);
    await clearDriverFromOtherVehicles(input.assignedDriverUserId, id);
  }

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      plateNumber:
        input.plateNumber === undefined
          ? undefined
          : normalizePlateNumber(input.plateNumber),
      chassisNumber:
        input.chassisNumber === undefined
          ? undefined
          : input.chassisNumber?.trim()
            ? normalizeChassisNumber(input.chassisNumber)
            : null,
      vehicleTypeId: input.vehicleTypeId,
      vehicleClassId: input.vehicleClassId,
      assignedDriverUserId: input.assignedDriverUserId,
      make: input.make,
      model: input.model,
      year: input.year,
      status: input.status,
      notes: input.notes,
      insuranceExpiresAt: input.insuranceExpiresAt,
      inspectionExpiresAt: input.inspectionExpiresAt,
      registrationExpiresAt: input.registrationExpiresAt,
    },
    include: vehicleInclude,
  });

  if (input.status !== undefined && input.status !== existing.status) {
    await createVehicleHistoryEvent({
      vehicleId: vehicle.id,
      eventType: VehicleHistoryEventType.status_changed,
      summary: `Status changed from ${existing.status} to ${vehicle.status}`,
      actorUserId: input.actorUserId,
      metadata: { from: existing.status, to: vehicle.status },
    });
  }

  if (
    input.assignedDriverUserId !== undefined &&
    input.assignedDriverUserId !== existing.assignedDriverUserId
  ) {
    if (input.assignedDriverUserId) {
      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: VehicleHistoryEventType.driver_assigned,
        summary: "Default driver assigned",
        actorUserId: input.actorUserId,
        metadata: {
          previous_driver_user_id: existing.assignedDriverUserId,
          driver_user_id: input.assignedDriverUserId,
        },
      });
    } else {
      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: VehicleHistoryEventType.driver_unassigned,
        summary: "Default driver unassigned",
        actorUserId: input.actorUserId,
        metadata: { previous_driver_user_id: existing.assignedDriverUserId },
      });
    }
  }

  const expiryChanged =
    (input.insuranceExpiresAt !== undefined &&
      dateKey(input.insuranceExpiresAt) !== dateKey(existing.insuranceExpiresAt)) ||
    (input.inspectionExpiresAt !== undefined &&
      dateKey(input.inspectionExpiresAt) !== dateKey(existing.inspectionExpiresAt)) ||
    (input.registrationExpiresAt !== undefined &&
      dateKey(input.registrationExpiresAt) !== dateKey(existing.registrationExpiresAt));

  if (expiryChanged) {
    await createVehicleHistoryEvent({
      vehicleId: vehicle.id,
      eventType: VehicleHistoryEventType.expiry_updated,
      summary: "Compliance expiry dates updated",
      actorUserId: input.actorUserId,
      metadata: {
        insurance_expires_at: dateKey(vehicle.insuranceExpiresAt),
        inspection_expires_at: dateKey(vehicle.inspectionExpiresAt),
        registration_expires_at: dateKey(vehicle.registrationExpiresAt),
      },
    });
  }

  return vehicle;
}

export async function deleteVehicle(id: string) {
  return prisma.vehicle.delete({ where: { id } });
}

export function parseVehicleStatus(value: unknown): VehicleStatus | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === VehicleStatus.active) return VehicleStatus.active;
  if (normalized === VehicleStatus.maintenance) return VehicleStatus.maintenance;
  if (normalized === VehicleStatus.retired) return VehicleStatus.retired;
  return undefined;
}

export function parseAssignedDriverUserId(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
