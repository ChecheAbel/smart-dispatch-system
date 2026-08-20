import type {
  GeofenceCoordinate,
  GeofenceKind,
  GeofenceShape,
  VehicleGeofence,
  VehicleGeofenceStatus,
} from "@smart-dispatch/types";
import { Prisma, type VehicleGeofence as DbVehicleGeofence } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { isPointInCircle, isPointInPolygon, type LatLng } from "../utils/geo";

export class VehicleGeofenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleGeofenceValidationError";
  }
}

export type VehicleGeofenceInput = {
  name: string;
  kind: GeofenceKind;
  shape: GeofenceShape;
  isActive?: boolean;
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  radiusM?: number | null;
  coordinates?: GeofenceCoordinate[] | null;
};

function decimalToNumber(value: { toNumber(): number } | null | undefined) {
  return value == null ? null : value.toNumber();
}

function parseCoordinates(value: unknown): GeofenceCoordinate[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const points: GeofenceCoordinate[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return null;
    }

    points.push({ latitude, longitude });
  }

  return points;
}

export function validateVehicleGeofenceInput(input: VehicleGeofenceInput) {
  const name = input.name.trim();
  if (!name) {
    throw new VehicleGeofenceValidationError("Geofence name is required.");
  }

  if (input.kind !== "allowed" && input.kind !== "restricted") {
    throw new VehicleGeofenceValidationError("Geofence kind must be allowed or restricted.");
  }

  if (input.shape !== "circle" && input.shape !== "polygon") {
    throw new VehicleGeofenceValidationError("Geofence shape must be circle or polygon.");
  }

  if (input.shape === "circle") {
    const lat = input.centerLatitude;
    const lng = input.centerLongitude;
    const radius = input.radiusM;

    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new VehicleGeofenceValidationError("Circle geofences require a valid center point.");
    }

    if (radius == null || !Number.isFinite(radius) || radius <= 0) {
      throw new VehicleGeofenceValidationError("Circle geofences require a radius greater than zero.");
    }

    return {
      name,
      kind: input.kind,
      shape: input.shape,
      isActive: input.isActive ?? true,
      centerLatitude: lat,
      centerLongitude: lng,
      radiusM: Math.round(radius),
      coordinates: null as GeofenceCoordinate[] | null,
    };
  }

  const coordinates = input.coordinates ?? [];
  if (coordinates.length < 3) {
    throw new VehicleGeofenceValidationError("Polygon geofences require at least 3 points.");
  }

  for (const point of coordinates) {
    if (
      !Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude) ||
      point.latitude < -90 ||
      point.latitude > 90 ||
      point.longitude < -180 ||
      point.longitude > 180
    ) {
      throw new VehicleGeofenceValidationError("Polygon geofences require valid coordinates.");
    }
  }

  return {
    name,
    kind: input.kind,
    shape: input.shape,
    isActive: input.isActive ?? true,
    centerLatitude: null as number | null,
    centerLongitude: null as number | null,
    radiusM: null as number | null,
    coordinates,
  };
}

export function toPublicVehicleGeofence(geofence: DbVehicleGeofence): VehicleGeofence {
  return {
    id: geofence.id,
    vehicle_id: geofence.vehicleId,
    name: geofence.name,
    kind: geofence.kind,
    shape: geofence.shape,
    is_active: geofence.isActive,
    center_latitude: decimalToNumber(geofence.centerLat),
    center_longitude: decimalToNumber(geofence.centerLng),
    radius_m: geofence.radiusM,
    coordinates: parseCoordinates(geofence.coordinates),
    created_at: geofence.createdAt.toISOString(),
    updated_at: geofence.updatedAt.toISOString(),
  };
}

export async function listVehicleGeofences(vehicleId: string) {
  return prisma.vehicleGeofence.findMany({
    where: { vehicleId },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function listActiveVehicleGeofences(vehicleId: string) {
  return prisma.vehicleGeofence.findMany({
    where: { vehicleId, isActive: true },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function findVehicleGeofenceById(vehicleId: string, geofenceId: string) {
  return prisma.vehicleGeofence.findFirst({
    where: { id: geofenceId, vehicleId },
  });
}

export async function findVehicleGeofenceForVehicle(vehicleId: string) {
  return prisma.vehicleGeofence.findFirst({
    where: { vehicleId },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function createVehicleGeofence(vehicleId: string, input: VehicleGeofenceInput) {
  const existing = await findVehicleGeofenceForVehicle(vehicleId);
  if (existing) {
    throw new VehicleGeofenceValidationError(
      "This vehicle already has a geofence. Edit or delete it instead.",
    );
  }

  const validated = validateVehicleGeofenceInput(input);

  return prisma.vehicleGeofence.create({
    data: {
      vehicleId,
      name: validated.name,
      kind: validated.kind,
      shape: validated.shape,
      isActive: validated.isActive,
      centerLat: validated.centerLatitude,
      centerLng: validated.centerLongitude,
      radiusM: validated.radiusM,
      coordinates:
        validated.coordinates == null
          ? Prisma.JsonNull
          : (validated.coordinates as Prisma.InputJsonValue),
    },
  });
}

export async function updateVehicleGeofence(
  vehicleId: string,
  geofenceId: string,
  input: VehicleGeofenceInput,
) {
  const existing = await findVehicleGeofenceById(vehicleId, geofenceId);
  if (!existing) {
    return null;
  }

  const validated = validateVehicleGeofenceInput(input);

  return prisma.vehicleGeofence.update({
    where: { id: existing.id },
    data: {
      name: validated.name,
      kind: validated.kind,
      shape: validated.shape,
      isActive: validated.isActive,
      centerLat: validated.centerLatitude,
      centerLng: validated.centerLongitude,
      radiusM: validated.radiusM,
      coordinates:
        validated.coordinates == null
          ? Prisma.JsonNull
          : (validated.coordinates as Prisma.InputJsonValue),
    },
  });
}

export async function deleteVehicleGeofence(vehicleId: string, geofenceId: string) {
  const existing = await findVehicleGeofenceById(vehicleId, geofenceId);
  if (!existing) {
    return false;
  }

  await prisma.vehicleGeofence.delete({ where: { id: existing.id } });
  return true;
}

export function isInsideGeofence(point: LatLng, geofence: VehicleGeofence | DbVehicleGeofence) {
  const publicFence =
    "vehicle_id" in geofence ? geofence : toPublicVehicleGeofence(geofence as DbVehicleGeofence);

  if (publicFence.shape === "circle") {
    if (
      publicFence.center_latitude == null ||
      publicFence.center_longitude == null ||
      publicFence.radius_m == null
    ) {
      return false;
    }

    return isPointInCircle(
      point,
      {
        latitude: publicFence.center_latitude,
        longitude: publicFence.center_longitude,
      },
      publicFence.radius_m,
    );
  }

  const coordinates = publicFence.coordinates ?? [];
  return isPointInPolygon(point, coordinates);
}

export async function evaluateVehicleGeofenceStatus(
  vehicleId: string,
  point: LatLng,
): Promise<VehicleGeofenceStatus[]> {
  const geofences = await listActiveVehicleGeofences(vehicleId);

  return geofences.map((geofence) => {
    const publicFence = toPublicVehicleGeofence(geofence);
    return {
      id: publicFence.id,
      name: publicFence.name,
      kind: publicFence.kind,
      inside: isInsideGeofence(point, publicFence),
    };
  });
}
