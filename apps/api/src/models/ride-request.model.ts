import type { RideRequestStatus } from "@smart-dispatch/types";
import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
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
};

export type UpdateRideRequestInput = Omit<CreateRideRequestInput, "requesterUserId">;

export type ListRideRequestsForUserFilters = {
  requesterUserId: string;
  status?: RideRequestStatus;
  search?: string;
};

const rideRequestInclude = {
  vehicleType: true,
  vehicleClass: true,
  region: true,
  pickupLocation: true,
  dropoffLocation: true,
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

export async function updateRideRequestForUser(
  id: string,
  requesterUserId: string,
  input: UpdateRideRequestInput,
) {
  const existing = await findRideRequestForUser(id, requesterUserId);
  if (!existing) {
    return null;
  }

  if (!canEditRideRequest(existing.status)) {
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
