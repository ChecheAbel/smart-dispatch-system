import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

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

export async function createRideRequest(input: CreateRideRequestInput) {
  return prisma.rideRequest.create({
    data: {
      requesterUserId: input.requesterUserId,
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
    },
    include: rideRequestInclude,
  });
}

export async function listRideRequestsForUser(requesterUserId: string, limit = 20) {
  return prisma.rideRequest.findMany({
    where: { requesterUserId },
    include: rideRequestInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
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
