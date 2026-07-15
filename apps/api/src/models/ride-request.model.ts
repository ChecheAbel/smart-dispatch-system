import type { ContractBillingInterval, RideRequestStatus } from "@smart-dispatch/types";
import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { ensureContractEnrollment } from "./contract-enrollment.model";
import { findActiveContractById } from "./contract.model";
import { findVehicleById } from "./vehicle.model";
import { ensureTripBillingSnapshot } from "../services/trip-billing.service";
import { tryAutoInvoiceCompletedTrip } from "../services/invoice-automation.service";
import {
  canCancelRideRequest,
  canEditRideRequest,
} from "../services/ride-request-policy.service";

export type CreateRideRequestInput = {
  requesterUserId: string;
  vehicleTypeId?: string | null;
  vehicleClassId?: string | null;
  regionId?: string | null;
  pickupLocationId?: string | null;
  dropoffLocationId?: string | null;
  pickupAddress: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffAddress: string;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  scheduledAt?: Date | null;
  passengerCount: number;
  notes?: string | null;
  contractId?: string | null;
};

export type UpdateRideRequestInput = Omit<CreateRideRequestInput, "requesterUserId">;

export type ListRideRequestsForUserFilters = {
  requesterUserId: string;
  status?: RideRequestStatus;
  search?: string;
};

export type ListRideRequestsAdminFilters = {
  status?: RideRequestStatus;
  search?: string;
  upcoming?: boolean;
  vehicleId?: string;
};

export type ListRideRequestsForDriverFilters = {
  driverUserId: string;
  status?: RideRequestStatus;
  /**
   * When true, returns only upcoming trips for the driver
   * (confirmed or in_progress, scheduled in the future when scheduled_at is set).
   */
  upcoming?: boolean;
  /**
   * When true, returns only completed or cancelled trips for the driver.
   */
  history?: boolean;
};

const rideRequestInclude = {
  vehicleType: true,
  vehicleClass: true,
  region: true,
  pickupLocation: true,
  dropoffLocation: true,
  requester: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      mobileNumber: true,
    },
  },
  assignedVehicle: {
    include: {
      vehicleType: true,
      vehicleClass: true,
      assignedDriver: true,
    },
  },
  assignedDriver: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      mobileNumber: true,
    },
  },
  contract: {
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      status: true,
      billingInterval: true,
    },
  },
} as const;

const rideRequestAdminInclude = {
  ...rideRequestInclude,
  assignedVehicle: {
    include: {
      vehicleType: true,
      vehicleClass: true,
      assignedDriver: true,
    },
  },
  assignedDriver: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      email: true,
      mobileNumber: true,
    },
  },
} as const;

function toDecimal(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Prisma.Decimal(value);
}

function buildRideRequestWhere(filters: ListRideRequestsForUserFilters): Prisma.RideRequestWhereInput {
  const where: Prisma.RideRequestWhereInput = {
    requesterUserId: filters.requesterUserId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { pickupAddress: { contains: search, mode: "insensitive" } },
      { dropoffAddress: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildRideRequestAdminWhere(
  filters: ListRideRequestsAdminFilters,
): Prisma.RideRequestWhereInput {
  const where: Prisma.RideRequestWhereInput = {};

  if (filters.upcoming) {
    where.status = { in: ["pending", "confirmed"] };
    where.scheduledAt = { gt: new Date() };
  } else if (filters.status) {
    where.status = filters.status;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { pickupAddress: { contains: search, mode: "insensitive" } },
      { dropoffAddress: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { requester: { firstName: { contains: search, mode: "insensitive" } } },
      { requester: { middleName: { contains: search, mode: "insensitive" } } },
      { requester: { lastName: { contains: search, mode: "insensitive" } } },
      { requester: { email: { contains: search, mode: "insensitive" } } },
      { requester: { mobileNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (filters.vehicleId) {
    where.assignedVehicleId = filters.vehicleId;
  }

  return where;
}

function buildRideRequestDriverWhere(
  filters: ListRideRequestsForDriverFilters,
): Prisma.RideRequestWhereInput {
  const where: Prisma.RideRequestWhereInput = {
    assignedDriverUserId: filters.driverUserId,
  };

  if (filters.upcoming) {
    where.status = { in: ["confirmed", "in_progress"] };
  } else if (filters.history) {
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { in: ["completed", "cancelled"] };
    }
  } else if (filters.status) {
    where.status = filters.status;
  }

  return where;
}

function buildRideRequestData(input: UpdateRideRequestInput) {
  return {
    vehicleTypeId: input.vehicleTypeId ?? null,
    vehicleClassId: input.vehicleClassId ?? null,
    regionId: input.regionId ?? null,
    pickupLocationId: input.pickupLocationId ?? null,
    dropoffLocationId: input.dropoffLocationId ?? null,
    pickupAddress: input.pickupAddress,
    pickupLatitude: toDecimal(input.pickupLatitude),
    pickupLongitude: toDecimal(input.pickupLongitude),
    dropoffAddress: input.dropoffAddress,
    dropoffLatitude: toDecimal(input.dropoffLatitude),
    dropoffLongitude: toDecimal(input.dropoffLongitude),
    scheduledAt: input.scheduledAt ?? null,
    passengerCount: input.passengerCount,
    notes: input.notes?.trim() || null,
  };
}

export async function createRideRequest(input: CreateRideRequestInput) {
  return prisma.rideRequest.create({
    data: {
      requesterUserId: input.requesterUserId,
      contractId: input.contractId ?? null,
      ...buildRideRequestData(input),
    },
    include: rideRequestInclude,
  });
}

export async function countRideRequestsForUser(filters: ListRideRequestsForUserFilters) {
  return prisma.rideRequest.count({
    where: buildRideRequestWhere(filters),
  });
}

export async function listRideRequestsForUser(
  filters: ListRideRequestsForUserFilters,
  skip: number,
  take: number,
) {
  return prisma.rideRequest.findMany({
    where: buildRideRequestWhere(filters),
    include: rideRequestInclude,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export async function findRideRequestForUser(id: string, requesterUserId: string) {
  return prisma.rideRequest.findFirst({
    where: { id, requesterUserId },
    include: rideRequestInclude,
  });
}

export async function findRideRequestForDriver(id: string, driverUserId: string) {
  return prisma.rideRequest.findFirst({
    where: { id, assignedDriverUserId: driverUserId },
    include: rideRequestInclude,
  });
}

export async function countRideRequestsForDriver(filters: ListRideRequestsForDriverFilters) {
  return prisma.rideRequest.count({
    where: buildRideRequestDriverWhere(filters),
  });
}

export async function listRideRequestsForDriver(
  filters: ListRideRequestsForDriverFilters,
  skip: number,
  take: number,
) {
  const upcoming = filters.upcoming === true;

  return prisma.rideRequest.findMany({
    where: buildRideRequestDriverWhere(filters),
    include: rideRequestInclude,
    orderBy: upcoming ? { scheduledAt: "asc" } : { createdAt: "desc" },
    skip,
    take,
  });
}

export async function countRideRequestsAdmin(filters: ListRideRequestsAdminFilters) {
  return prisma.rideRequest.count({
    where: buildRideRequestAdminWhere(filters),
  });
}

export async function listRideRequestsAdmin(
  filters: ListRideRequestsAdminFilters,
  skip: number,
  take: number,
) {
  return prisma.rideRequest.findMany({
    where: buildRideRequestAdminWhere(filters),
    include: rideRequestAdminInclude,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export async function findRideRequestById(id: string) {
  return prisma.rideRequest.findUnique({
    where: { id },
    include: rideRequestAdminInclude,
  });
}

export async function findActiveRideRequestForVehicle(vehicleId: string, exceptRideRequestId?: string) {
  return prisma.rideRequest.findFirst({
    where: {
      assignedVehicleId: vehicleId,
      status: { in: ["confirmed", "in_progress"] },
      ...(exceptRideRequestId ? { NOT: { id: exceptRideRequestId } } : {}),
    },
    select: { id: true },
  });
}

export async function listAssignableVehiclesForRideRequest(
  rideRequest: {
    id: string;
    vehicleTypeId: string | null;
    vehicleClassId: string | null;
    assignedVehicleId: string | null;
  },
  options?: { search?: string; take?: number },
) {
  const search = options?.search?.trim();

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: "active",
      assignedDriverUserId: { not: null },
      ...(rideRequest.vehicleTypeId ? { vehicleTypeId: rideRequest.vehicleTypeId } : {}),
      ...(rideRequest.vehicleClassId ? { vehicleClassId: rideRequest.vehicleClassId } : {}),
      NOT: {
        rideRequestAssignments: {
          some: {
            status: { in: ["confirmed", "in_progress"] },
            NOT: { id: rideRequest.id },
          },
        },
      },
      ...(search
        ? {
            OR: [
              { plateNumber: { contains: search, mode: "insensitive" } },
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              {
                assignedDriver: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    include: {
      vehicleType: true,
      vehicleClass: true,
      assignedDriver: true,
    },
    orderBy: { plateNumber: "asc" },
    take: options?.take ?? 50,
  });

  if (
    rideRequest.assignedVehicleId &&
    !vehicles.some((vehicle) => vehicle.id === rideRequest.assignedVehicleId)
  ) {
    const assignedVehicle = await findVehicleById(rideRequest.assignedVehicleId);
    if (assignedVehicle) {
      return [assignedVehicle, ...vehicles];
    }
  }

  return vehicles;
}

export async function updateRideRequestStatusAdmin(
  id: string,
  status: RideRequestStatus,
  options?: { rejectionReason?: string | null },
) {
  const existing = await findRideRequestById(id);
  if (!existing) {
    return null;
  }

  const data: Prisma.RideRequestUpdateInput = { status };

  if (status === "cancelled") {
    data.rejectionReason = options?.rejectionReason?.trim() || null;
    data.assignedVehicle = { disconnect: true };
    data.assignedDriver = { disconnect: true };
    data.assignedAt = null;
    data.startedAt = null;
    data.completedAt = null;
  } else if (status === "confirmed") {
    data.rejectionReason = null;
  } else if (status === "in_progress") {
    data.startedAt = new Date();
  } else if (status === "completed") {
    data.completedAt = new Date();
  }

  return prisma.$transaction(async (tx) => {
    if (
      status === "confirmed" &&
      existing.status !== "confirmed" &&
      existing.contractId
    ) {
      const contract = await findActiveContractById(existing.contractId);
      if (!contract) {
        throw new Error("Linked contract is not available.");
      }

      await ensureContractEnrollment({
        contractId: existing.contractId,
        requesterUserId: existing.requesterUserId,
        scheduledAt: existing.scheduledAt,
        acceptedAt: new Date(),
        billingInterval: contract.billingInterval as ContractBillingInterval,
        client: tx,
      });
    }

    const updated = await tx.rideRequest.update({
      where: { id },
      data,
      include: rideRequestAdminInclude,
    });

    if (status === "completed" && updated.contractId) {
      await ensureTripBillingSnapshot(updated.id, tx);
    }

    return updated;
  }).then(async (updated) => {
    if (status === "completed" && updated.contractId) {
      await tryAutoInvoiceCompletedTrip(updated.id);
    }

    return updated;
  });
}

export async function assignRideRequestAdmin(id: string, vehicleId: string) {
  const vehicle = await findVehicleById(vehicleId);
  if (!vehicle?.assignedDriverUserId) {
    return null;
  }

  return prisma.rideRequest.update({
    where: { id },
    data: {
      assignedVehicleId: vehicleId,
      assignedDriverUserId: vehicle.assignedDriverUserId,
      assignedAt: new Date(),
      status: "confirmed",
    },
    include: rideRequestAdminInclude,
  });
}

export async function unassignRideRequestAdmin(id: string) {
  return prisma.rideRequest.update({
    where: { id },
    data: {
      assignedVehicleId: null,
      assignedDriverUserId: null,
      assignedAt: null,
      status: "pending",
    },
    include: rideRequestAdminInclude,
  });
}

export async function updateRideRequestForUser(
  id: string,
  requesterUserId: string,
  input: UpdateRideRequestInput,
) {
  const existing = await findRideRequestForUser(id, requesterUserId);
  if (!existing) {
    return null;
  }

  if (!canEditRideRequest(existing.status, existing.createdAt)) {
    return { error: "This ride request can no longer be edited." as const };
  }

  return prisma.rideRequest.update({
    where: { id },
    data: buildRideRequestData(input),
    include: rideRequestInclude,
  });
}

export async function cancelRideRequestForUser(id: string, requesterUserId: string) {
  const existing = await findRideRequestForUser(id, requesterUserId);
  if (!existing) {
    return null;
  }

  if (!canCancelRideRequest(existing.status, existing.createdAt)) {
    return { error: "This ride request can no longer be cancelled." as const };
  }

  return prisma.rideRequest.update({
    where: { id },
    data: { status: "cancelled" },
    include: rideRequestInclude,
  });
}

export async function findVehicleTypeByIdIfActive(id: string) {
  return prisma.vehicleType.findFirst({
    where: { id, isActive: true },
  });
}

export async function findVehicleClassByIdIfActive(id: string) {
  return prisma.vehicleClass.findFirst({
    where: { id, isActive: true },
  });
}

export async function findRegionByIdIfActive(id: string) {
  return prisma.region.findFirst({
    where: { id, isActive: true },
  });
}

export async function isVehicleTypeClassAllowed(vehicleTypeId: string, vehicleClassId: string) {
  const link = await prisma.vehicleTypeClass.findFirst({
    where: { vehicleTypeId, vehicleClassId },
  });

  return Boolean(link);
}
