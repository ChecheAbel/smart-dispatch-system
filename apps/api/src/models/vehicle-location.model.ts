import { prisma } from "../db/prisma";

export type VehicleLocationInput = {
  vehicleId: string;
  driverUserId?: string | null;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speedKmh?: number | null;
  accuracyM?: number | null;
  recordedAt?: Date;
};

function assertValidCoordinate(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${label}.`);
  }
}

export function validateVehicleLocationInput(input: VehicleLocationInput) {
  assertValidCoordinate(input.latitude, -90, 90, "latitude");
  assertValidCoordinate(input.longitude, -180, 180, "longitude");

  if (input.heading != null) {
    assertValidCoordinate(input.heading, 0, 360, "heading");
  }

  if (input.speedKmh != null && (!Number.isFinite(input.speedKmh) || input.speedKmh < 0)) {
    throw new Error("Invalid speed.");
  }

  if (input.accuracyM != null && (!Number.isFinite(input.accuracyM) || input.accuracyM < 0)) {
    throw new Error("Invalid accuracy.");
  }
}

export async function findVehicleLocationByVehicleId(vehicleId: string) {
  return prisma.vehicleLocationSnapshot.findUnique({
    where: { vehicleId },
  });
}

export async function upsertVehicleLocation(input: VehicleLocationInput) {
  validateVehicleLocationInput(input);

  const recordedAt = input.recordedAt ?? new Date();

  return prisma.vehicleLocationSnapshot.upsert({
    where: { vehicleId: input.vehicleId },
    create: {
      vehicleId: input.vehicleId,
      driverUserId: input.driverUserId ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      heading: input.heading ?? null,
      speedKmh: input.speedKmh ?? null,
      accuracyM: input.accuracyM ?? null,
      recordedAt,
    },
    update: {
      driverUserId: input.driverUserId ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      heading: input.heading ?? null,
      speedKmh: input.speedKmh ?? null,
      accuracyM: input.accuracyM ?? null,
      recordedAt,
    },
  });
}

export async function findAssignedVehicleForDriver(driverUserId: string) {
  return prisma.vehicle.findFirst({
    where: { assignedDriverUserId: driverUserId },
    select: {
      id: true,
      assignedDriverUserId: true,
    },
  });
}
