import { prisma } from "../db/prisma";

export class VehicleTypeClassInUseError extends Error {
  constructor() {
    super("VEHICLE_TYPE_CLASS_IN_USE");
    this.name = "VehicleTypeClassInUseError";
  }
}

export class VehicleClassNotAvailableError extends Error {
  constructor() {
    super("VEHICLE_CLASS_NOT_AVAILABLE");
    this.name = "VehicleClassNotAvailableError";
  }
}

export async function isVehicleTypeClassAllowed(vehicleTypeId: string, vehicleClassId: string) {
  const link = await prisma.vehicleTypeClass.findFirst({
    where: {
      vehicleTypeId,
      vehicleClassId,
      vehicleType: { isActive: true },
      vehicleClass: { isActive: true },
    },
  });

  return Boolean(link);
}

export async function listAllowedClassIdsForVehicleType(vehicleTypeId: string) {
  const links = await prisma.vehicleTypeClass.findMany({
    where: { vehicleTypeId },
    select: { vehicleClassId: true },
    orderBy: { vehicleClass: { slug: "asc" } },
  });

  return links.map((link) => link.vehicleClassId);
}

export async function listActiveVehicleTypesWithAllowedClasses() {
  return prisma.vehicleType.findMany({
    where: { isActive: true },
    include: {
      vehicleClassLinks: {
        where: {
          vehicleClass: { isActive: true },
        },
        include: {
          vehicleClass: true,
        },
      },
    },
    orderBy: { slug: "asc" },
  });
}

export async function syncAllowedVehicleClasses(vehicleTypeId: string, vehicleClassIds: string[]) {
  const uniqueIds = [...new Set(vehicleClassIds)];

  if (uniqueIds.length > 0) {
    const activeClasses = await prisma.vehicleClass.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
      select: { id: true },
    });

    if (activeClasses.length !== uniqueIds.length) {
      throw new VehicleClassNotAvailableError();
    }
  }

  const currentLinks = await prisma.vehicleTypeClass.findMany({
    where: { vehicleTypeId },
    select: { vehicleClassId: true },
  });
  const currentIds = new Set(currentLinks.map((link) => link.vehicleClassId));
  const nextIds = new Set(uniqueIds);
  const toRemove = [...currentIds].filter((classId) => !nextIds.has(classId));

  for (const vehicleClassId of toRemove) {
    const [vehicles, farePlans, rideRequests] = await Promise.all([
      prisma.vehicle.count({ where: { vehicleTypeId, vehicleClassId } }),
      prisma.farePlan.count({ where: { vehicleTypeId, vehicleClassId } }),
      prisma.rideRequest.count({ where: { vehicleTypeId, vehicleClassId } }),
    ]);

    if (vehicles + farePlans + rideRequests > 0) {
      throw new VehicleTypeClassInUseError();
    }
  }

  const toAdd = uniqueIds.filter((classId) => !currentIds.has(classId));

  await prisma.$transaction(async (tx) => {
    if (toRemove.length > 0) {
      await tx.vehicleTypeClass.deleteMany({
        where: {
          vehicleTypeId,
          vehicleClassId: { in: toRemove },
        },
      });
    }

    if (toAdd.length > 0) {
      await tx.vehicleTypeClass.createMany({
        data: toAdd.map((vehicleClassId) => ({
          vehicleTypeId,
          vehicleClassId,
        })),
        skipDuplicates: true,
      });
    }
  });
}
