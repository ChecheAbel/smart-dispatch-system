import { VehicleHistoryEventType, VehicleStatus } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { getDeadlineSettings } from "./app-setting.model";
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
  images?: string[];
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceIssuedAt?: Date | null;
  insuranceExpiresAt?: Date | null;
  insuranceNotes?: string | null;
  inspectionCenter?: string | null;
  inspectionCertificateNumber?: string | null;
  inspectionPerformedAt?: Date | null;
  inspectionExpiresAt?: Date | null;
  inspectionNotes?: string | null;
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
  images?: string[];
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceIssuedAt?: Date | null;
  insuranceExpiresAt?: Date | null;
  insuranceNotes?: string | null;
  inspectionCenter?: string | null;
  inspectionCertificateNumber?: string | null;
  inspectionPerformedAt?: Date | null;
  inspectionExpiresAt?: Date | null;
  inspectionNotes?: string | null;
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
  complianceType?: VehicleComplianceType;
  complianceStatus?: VehicleComplianceStatus;
};

export type VehicleComplianceType = "insurance" | "inspection";

export type VehicleComplianceStatus = "expired" | "due_soon" | "ok" | "not_set";

export type VehicleComplianceSummary = {
  total_vehicles: number;
  vehicles_needing_attention: number;
} & Record<VehicleComplianceType, Record<VehicleComplianceStatus, number>>;

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

  const isDriver = user.authRoles.some(
    (authRole) => authRole.role.slug === "driver",
  );
  if (!isDriver) {
    throw new Error("USER_NOT_DRIVER");
  }

  if (
    user.accountStatus !== "active" ||
    user.accountActivation !== "activated"
  ) {
    throw new Error("DRIVER_NOT_ACTIVE");
  }

  return user;
}

async function clearDriverFromOtherVehicles(
  driverUserId: string,
  exceptVehicleId?: string,
) {
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

function startOfTodayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function complianceExpiryField(type: VehicleComplianceType) {
  return type === "insurance" ? "insuranceExpiresAt" : "inspectionExpiresAt";
}

function classifyExpiryComplianceStatus(
  expiresAt: Date | null,
  today: Date,
  dueSoonEnd: Date,
): VehicleComplianceStatus {
  if (!expiresAt) {
    return "not_set";
  }

  const time = expiresAt.getTime();
  if (time < today.getTime()) {
    return "expired";
  }
  if (time <= dueSoonEnd.getTime()) {
    return "due_soon";
  }
  return "ok";
}

function buildComplianceExpiryWhere(
  type: VehicleComplianceType,
  status: VehicleComplianceStatus,
) {
  const field = complianceExpiryField(type);
  const today = startOfTodayUtc();
  const dueSoonEnd = new Date(today);
  dueSoonEnd.setUTCDate(
    dueSoonEnd.getUTCDate() + getDeadlineSettings().insurance_due_soon_days,
  );

  switch (status) {
    case "not_set":
      return { [field]: null };
    case "expired":
      return { [field]: { lt: today } };
    case "due_soon":
      return { [field]: { gte: today, lte: dueSoonEnd } };
    case "ok":
      return { [field]: { gt: dueSoonEnd } };
  }
}

function buildVehicleWhere(filter?: ListVehiclesFilter) {
  const search = filter?.search?.trim();

  return {
    ...(filter?.vehicleTypeId ? { vehicleTypeId: filter.vehicleTypeId } : {}),
    ...(filter?.vehicleClassId
      ? { vehicleClassId: filter.vehicleClassId }
      : {}),
    ...(filter?.status ? { status: filter.status } : {}),
    ...(filter?.assignedDriverUserId
      ? { assignedDriverUserId: filter.assignedDriverUserId }
      : {}),
    ...(filter?.unassignedOnly ? { assignedDriverUserId: null } : {}),
    ...(filter?.assignedOnly ? { assignedDriverUserId: { not: null } } : {}),
    ...(filter?.complianceType && filter?.complianceStatus
      ? buildComplianceExpiryWhere(
          filter.complianceType,
          filter.complianceStatus,
        )
      : {}),
    ...(search
      ? {
          OR: [
            { plateNumber: { contains: search, mode: "insensitive" as const } },
            {
              chassisNumber: { contains: search, mode: "insensitive" as const },
            },
            { make: { contains: search, mode: "insensitive" as const } },
            { model: { contains: search, mode: "insensitive" as const } },
            {
              assignedDriver: {
                OR: [
                  {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    lastName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
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

export async function getVehicleComplianceSummary(): Promise<VehicleComplianceSummary> {
  const today = startOfTodayUtc();
  const dueSoonEnd = new Date(today);
  dueSoonEnd.setUTCDate(
    dueSoonEnd.getUTCDate() + getDeadlineSettings().inspection_due_soon_days,
  );

  const vehicles = await prisma.vehicle.findMany({
    select: {
      insuranceExpiresAt: true,
      inspectionExpiresAt: true,
    },
  });

  const summary: VehicleComplianceSummary = {
    total_vehicles: vehicles.length,
    vehicles_needing_attention: 0,
    insurance: { expired: 0, due_soon: 0, ok: 0, not_set: 0 },
    inspection: { expired: 0, due_soon: 0, ok: 0, not_set: 0 },
  };

  for (const vehicle of vehicles) {
    const insuranceStatus = classifyExpiryComplianceStatus(
      vehicle.insuranceExpiresAt,
      today,
      dueSoonEnd,
    );
    const inspectionStatus = classifyExpiryComplianceStatus(
      vehicle.inspectionExpiresAt,
      today,
      dueSoonEnd,
    );

    summary.insurance[insuranceStatus] += 1;
    summary.inspection[inspectionStatus] += 1;

    if (insuranceStatus !== "ok" || inspectionStatus !== "ok") {
      summary.vehicles_needing_attention += 1;
    }
  }

  return summary;
}

export function parseVehicleComplianceType(
  value: unknown,
): VehicleComplianceType | undefined {
  if (value === "insurance" || value === "inspection") return value;
  return undefined;
}

export function parseVehicleComplianceStatus(
  value: unknown,
): VehicleComplianceStatus | undefined {
  if (
    value === "expired" ||
    value === "due_soon" ||
    value === "ok" ||
    value === "not_set"
  ) {
    return value;
  }
  return undefined;
}

function dateKey(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function textKey(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildComplianceData(input: {
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceIssuedAt?: Date | null;
  insuranceExpiresAt?: Date | null;
  insuranceNotes?: string | null;
  inspectionCenter?: string | null;
  inspectionCertificateNumber?: string | null;
  inspectionPerformedAt?: Date | null;
  inspectionExpiresAt?: Date | null;
  inspectionNotes?: string | null;
  registrationExpiresAt?: Date | null;
}) {
  return {
    ...(input.insuranceProvider !== undefined
      ? { insuranceProvider: textKey(input.insuranceProvider) }
      : {}),
    ...(input.insurancePolicyNumber !== undefined
      ? { insurancePolicyNumber: textKey(input.insurancePolicyNumber) }
      : {}),
    ...(input.insuranceIssuedAt !== undefined
      ? { insuranceIssuedAt: input.insuranceIssuedAt }
      : {}),
    ...(input.insuranceExpiresAt !== undefined
      ? { insuranceExpiresAt: input.insuranceExpiresAt }
      : {}),
    ...(input.insuranceNotes !== undefined
      ? { insuranceNotes: textKey(input.insuranceNotes) }
      : {}),
    ...(input.inspectionCenter !== undefined
      ? { inspectionCenter: textKey(input.inspectionCenter) }
      : {}),
    ...(input.inspectionCertificateNumber !== undefined
      ? {
          inspectionCertificateNumber: textKey(
            input.inspectionCertificateNumber,
          ),
        }
      : {}),
    ...(input.inspectionPerformedAt !== undefined
      ? { inspectionPerformedAt: input.inspectionPerformedAt }
      : {}),
    ...(input.inspectionExpiresAt !== undefined
      ? { inspectionExpiresAt: input.inspectionExpiresAt }
      : {}),
    ...(input.inspectionNotes !== undefined
      ? { inspectionNotes: textKey(input.inspectionNotes) }
      : {}),
    ...(input.registrationExpiresAt !== undefined
      ? { registrationExpiresAt: input.registrationExpiresAt }
      : {}),
  };
}

function complianceSnapshot(vehicle: {
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceIssuedAt: Date | null;
  insuranceExpiresAt: Date | null;
  insuranceNotes: string | null;
  inspectionCenter: string | null;
  inspectionCertificateNumber: string | null;
  inspectionPerformedAt: Date | null;
  inspectionExpiresAt: Date | null;
  inspectionNotes: string | null;
  registrationExpiresAt: Date | null;
}) {
  return {
    insurance_provider: textKey(vehicle.insuranceProvider),
    insurance_policy_number: textKey(vehicle.insurancePolicyNumber),
    insurance_issued_at: dateKey(vehicle.insuranceIssuedAt),
    insurance_expires_at: dateKey(vehicle.insuranceExpiresAt),
    insurance_notes: textKey(vehicle.insuranceNotes),
    inspection_center: textKey(vehicle.inspectionCenter),
    inspection_certificate_number: textKey(vehicle.inspectionCertificateNumber),
    inspection_performed_at: dateKey(vehicle.inspectionPerformedAt),
    inspection_expires_at: dateKey(vehicle.inspectionExpiresAt),
    inspection_notes: textKey(vehicle.inspectionNotes),
    registration_expires_at: dateKey(vehicle.registrationExpiresAt),
  };
}

function complianceChanged(
  existing: Parameters<typeof complianceSnapshot>[0],
  next: Parameters<typeof complianceSnapshot>[0],
) {
  return (
    JSON.stringify(complianceSnapshot(existing)) !==
    JSON.stringify(complianceSnapshot(next))
  );
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
      images: input.images ?? [],
      ...buildComplianceData({
        insuranceProvider: input.insuranceProvider ?? null,
        insurancePolicyNumber: input.insurancePolicyNumber ?? null,
        insuranceIssuedAt: input.insuranceIssuedAt ?? null,
        insuranceExpiresAt: input.insuranceExpiresAt ?? null,
        insuranceNotes: input.insuranceNotes ?? null,
        inspectionCenter: input.inspectionCenter ?? null,
        inspectionCertificateNumber: input.inspectionCertificateNumber ?? null,
        inspectionPerformedAt: input.inspectionPerformedAt ?? null,
        inspectionExpiresAt: input.inspectionExpiresAt ?? null,
        inspectionNotes: input.inspectionNotes ?? null,
        registrationExpiresAt: input.registrationExpiresAt ?? null,
      }),
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
      images: input.images,
      ...buildComplianceData(input),
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

  if (complianceChanged(existing, vehicle)) {
    await createVehicleHistoryEvent({
      vehicleId: vehicle.id,
      eventType: VehicleHistoryEventType.expiry_updated,
      summary: "Compliance details updated",
      actorUserId: input.actorUserId,
      metadata: complianceSnapshot(vehicle),
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
  if (normalized === VehicleStatus.maintenance)
    return VehicleStatus.maintenance;
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
