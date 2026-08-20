import type { Request } from "express";
import type {
  AdminDispatchSuggestedVehicle,
  DispatchSlaPriority,
  RideRequestStatus,
} from "@smart-dispatch/types";
import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { getDeadlineSettings } from "../models/app-setting.model";
import { assignRideRequestAdmin } from "../models/ride-request.model";
import { haversineDistanceMeters, type LatLng } from "../utils/geo";
import { getRideScheduleWindow, rideScheduleWindowsOverlap } from "./ride-request-scheduling.service";
import { canAdminAssignRideRequest } from "./ride-request-admin-policy.service";
import { recordAuditLog } from "./audit-log.service";
import { syncDriverUpcomingTripsAfterChange } from "./driver-upcoming-trips-sync.service";
import { queueRideRequestNotifications } from "./notification-dispatch.service";

const UNKNOWN_DISTANCE_METERS = 10_000_000;
const AUTO_ASSIGN_LIMIT = 50;

export type DispatchSla = {
  priority: DispatchSlaPriority;
  minutesUntilPickup: number | null;
  rank: number;
};

export type DispatchAllocationTrip = {
  id: string;
  status: string;
  vehicleTypeId: string | null;
  vehicleClassId: string | null;
  assignedVehicleId: string | null;
  scheduledAt: Date | null;
  scheduledReturnAt: Date | null;
  createdAt: Date;
  pickupLatitude?: Prisma.Decimal | number | null;
  pickupLongitude?: Prisma.Decimal | number | null;
};

type AllocationVehicle = {
  id: string;
  plateNumber: string;
  vehicleTypeId: string;
  vehicleClassId: string;
  driverName: string | null;
  location: LatLng | null;
};

type ActiveAssignment = {
  assignedVehicleId: string | null;
  scheduledAt: Date | null;
  scheduledReturnAt: Date | null;
  status: string;
};

export type DispatchAllocationSuggestion = {
  tripId: string;
  sla: DispatchSla;
  vehicle: AdminDispatchSuggestedVehicle | null;
  canAutoAssign: boolean;
};

type AllocationContext = {
  vehicles: AllocationVehicle[];
  assignments: ActiveAssignment[];
  reservedVehicleIds: Set<string>;
};

function toCoord(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function personName(user: { firstName: string; middleName: string | null; lastName: string } | null) {
  if (!user) {
    return null;
  }

  const name = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
  return name || null;
}

function pickupPoint(trip: DispatchAllocationTrip): LatLng | null {
  const latitude = toCoord(trip.pickupLatitude);
  const longitude = toCoord(trip.pickupLongitude);
  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
}

export function getDispatchSla(scheduledAt: Date | null, now = new Date()): DispatchSla {
  if (!scheduledAt) {
    return { priority: "unscheduled", minutesUntilPickup: null, rank: Number.MAX_SAFE_INTEGER };
  }

  const minutesUntilPickup = Math.round((scheduledAt.getTime() - now.getTime()) / 60_000);
  const dueSoonMinutes = getDeadlineSettings().ride_request_reminder_hours * 60;

  if (minutesUntilPickup < 0) {
    return { priority: "overdue", minutesUntilPickup, rank: minutesUntilPickup };
  }

  if (minutesUntilPickup <= dueSoonMinutes) {
    return { priority: "due_soon", minutesUntilPickup, rank: minutesUntilPickup };
  }

  return { priority: "on_track", minutesUntilPickup, rank: minutesUntilPickup };
}

export function compareDispatchSla(a: DispatchAllocationTrip, b: DispatchAllocationTrip, now = new Date()) {
  const slaA = getDispatchSla(a.scheduledAt, now);
  const slaB = getDispatchSla(b.scheduledAt, now);

  if (slaA.rank !== slaB.rank) {
    return slaA.rank - slaB.rank;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

function vehicleConflicts(vehicleId: string, trip: DispatchAllocationTrip, assignments: ActiveAssignment[]) {
  const candidateWindow = getRideScheduleWindow({
    scheduledAt: trip.scheduledAt,
    scheduledReturnAt: trip.scheduledReturnAt,
    status: trip.status,
  });

  return assignments.some((assignment) => {
    if (assignment.assignedVehicleId !== vehicleId) {
      return false;
    }

    const otherWindow = getRideScheduleWindow({
      scheduledAt: assignment.scheduledAt,
      scheduledReturnAt: assignment.scheduledReturnAt,
      status: assignment.status,
    });

    return rideScheduleWindowsOverlap(candidateWindow, otherWindow);
  });
}

function scoreVehicle(vehicle: AllocationVehicle, pickup: LatLng | null) {
  if (!pickup || !vehicle.location) {
    return UNKNOWN_DISTANCE_METERS;
  }

  return haversineDistanceMeters(pickup, vehicle.location);
}

function pickVehicle(
  trip: DispatchAllocationTrip,
  context: AllocationContext,
): { vehicle: AllocationVehicle; distanceMeters: number | null } | null {
  const pickup = pickupPoint(trip);
  const eligible = context.vehicles.filter((vehicle) => {
    if (context.reservedVehicleIds.has(vehicle.id)) {
      return false;
    }

    if (trip.vehicleTypeId && vehicle.vehicleTypeId !== trip.vehicleTypeId) {
      return false;
    }

    if (trip.vehicleClassId && vehicle.vehicleClassId !== trip.vehicleClassId) {
      return false;
    }

    return !vehicleConflicts(vehicle.id, trip, context.assignments);
  });

  if (eligible.length === 0) {
    return null;
  }

  const ranked = [...eligible].sort((left, right) => {
    const scoreDelta = scoreVehicle(left, pickup) - scoreVehicle(right, pickup);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.plateNumber.localeCompare(right.plateNumber);
  });

  const chosen = ranked[0];
  const distance = scoreVehicle(chosen, pickup);

  return {
    vehicle: chosen,
    distanceMeters: distance >= UNKNOWN_DISTANCE_METERS ? null : Math.round(distance),
  };
}

async function loadAllocationContext(): Promise<AllocationContext> {
  const [vehicles, assignments, locations] = await Promise.all([
    prisma.vehicle.findMany({
      where: { status: "active", assignedDriverUserId: { not: null } },
      select: {
        id: true,
        plateNumber: true,
        vehicleTypeId: true,
        vehicleClassId: true,
        assignedDriver: { select: { firstName: true, middleName: true, lastName: true } },
      },
    }),
    prisma.rideRequest.findMany({
      where: {
        assignedVehicleId: { not: null },
        status: { in: ["confirmed", "in_progress"] },
      },
      select: {
        assignedVehicleId: true,
        scheduledAt: true,
        scheduledReturnAt: true,
        status: true,
      },
    }),
    prisma.vehicleLocationSnapshot.findMany({
      select: { vehicleId: true, latitude: true, longitude: true },
    }),
  ]);

  const locationByVehicle = new Map(
    locations.map((row) => {
      const latitude = toCoord(row.latitude);
      const longitude = toCoord(row.longitude);
      return [
        row.vehicleId,
        latitude != null && longitude != null ? { latitude, longitude } : null,
      ] as const;
    }),
  );

  return {
    vehicles: vehicles.map((vehicle) => ({
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      vehicleTypeId: vehicle.vehicleTypeId,
      vehicleClassId: vehicle.vehicleClassId,
      driverName: personName(vehicle.assignedDriver),
      location: locationByVehicle.get(vehicle.id) ?? null,
    })),
    assignments,
    reservedVehicleIds: new Set<string>(),
  };
}

function toSuggestedVehicle(
  pick: { vehicle: AllocationVehicle; distanceMeters: number | null },
): AdminDispatchSuggestedVehicle {
  return {
    id: pick.vehicle.id,
    plate_number: pick.vehicle.plateNumber,
    driver_name: pick.vehicle.driverName,
    distance_meters: pick.distanceMeters,
  };
}

export async function suggestAllocationsForTrips(
  trips: DispatchAllocationTrip[],
  now = new Date(),
): Promise<Map<string, DispatchAllocationSuggestion>> {
  const context = await loadAllocationContext();
  const suggestions = new Map<string, DispatchAllocationSuggestion>();
  const ranked = [...trips].sort((left, right) => compareDispatchSla(left, right, now));

  for (const trip of ranked) {
    const sla = getDispatchSla(trip.scheduledAt, now);
    const pick = trip.assignedVehicleId ? null : pickVehicle(trip, context);

    if (pick) {
      context.reservedVehicleIds.add(pick.vehicle.id);
    }

    suggestions.set(trip.id, {
      tripId: trip.id,
      sla,
      vehicle: pick ? toSuggestedVehicle(pick) : null,
      canAutoAssign:
        !trip.assignedVehicleId &&
        canAdminAssignRideRequest(trip.status as RideRequestStatus) &&
        Boolean(pick),
    });
  }

  return suggestions;
}

export async function autoAssignDispatchQueue(
  input: { rideRequestIds?: string[]; excludeRideRequestIds?: string[] } = {},
) {
  const requestedIds = input.rideRequestIds?.filter(Boolean);
  const excludedIds = new Set(input.excludeRideRequestIds?.filter(Boolean) ?? []);
  const trips = await prisma.rideRequest.findMany({
    where: requestedIds?.length
      ? { id: { in: requestedIds } }
      : {
          status: { in: ["pending", "confirmed"] },
          assignedVehicleId: null,
        },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: AUTO_ASSIGN_LIMIT,
  });

  const now = new Date();
  const ranked = [...trips]
    .filter((trip) => !excludedIds.has(trip.id))
    .sort((left, right) => compareDispatchSla(left, right, now));
  const context = await loadAllocationContext();

  const assigned: Array<{
    rideRequest: NonNullable<Awaited<ReturnType<typeof assignRideRequestAdmin>>>;
    vehiclePlate: string;
    previousStatus: RideRequestStatus;
  }> = [];
  const skipped: Array<{ rideRequestId: string; reason: string }> = [];

  for (const trip of ranked) {
    if (trip.assignedVehicleId) {
      skipped.push({ rideRequestId: trip.id, reason: "This trip already has a vehicle." });
      continue;
    }

    if (!canAdminAssignRideRequest(trip.status as RideRequestStatus)) {
      skipped.push({ rideRequestId: trip.id, reason: "This trip cannot be assigned in its current status." });
      continue;
    }

    const pick = pickVehicle(trip, context);
    if (!pick) {
      skipped.push({ rideRequestId: trip.id, reason: "No matching vehicle is available." });
      continue;
    }

    const updated = await assignRideRequestAdmin(trip.id, pick.vehicle.id);
    if (!updated) {
      skipped.push({ rideRequestId: trip.id, reason: "Unable to assign the selected vehicle." });
      continue;
    }

    context.reservedVehicleIds.add(pick.vehicle.id);
    context.assignments.push({
      assignedVehicleId: pick.vehicle.id,
      scheduledAt: trip.scheduledAt,
      scheduledReturnAt: trip.scheduledReturnAt,
      status: "confirmed",
    });

    assigned.push({
      rideRequest: updated,
      vehiclePlate: pick.vehicle.plateNumber,
      previousStatus: trip.status as RideRequestStatus,
    });
  }

  return { assigned, skipped };
}

export async function applyDispatchAutoAssignments(
  options: {
    rideRequestIds?: string[];
    excludeRideRequestIds?: string[];
    actorUserId?: string | null;
    req?: Request;
  } = {},
) {
  const outcome = await autoAssignDispatchQueue({
    rideRequestIds: options.rideRequestIds,
    excludeRideRequestIds: options.excludeRideRequestIds,
  });

  for (const item of outcome.assigned) {
    if (options.actorUserId) {
      await recordAuditLog({
        actorUserId: options.actorUserId,
        action: "assign",
        module: "ride_requests",
        entityType: "ride_request",
        entityId: item.rideRequest.id,
        entityLabel: `${item.rideRequest.pickupAddress} → ${item.rideRequest.dropoffAddress}`,
        summary:
          item.previousStatus === "pending"
            ? "Vehicle auto-assigned and pending request approved"
            : "Vehicle and driver auto-assigned by allocation engine",
        req: options.req,
      });
    }

    if (item.previousStatus === "pending") {
      queueRideRequestNotifications("confirmed", item.rideRequest.id);
    }
    queueRideRequestNotifications("assigned", item.rideRequest.id);
    syncDriverUpcomingTripsAfterChange({
      before: {
        id: item.rideRequest.id,
        assignedDriverUserId: null,
        status: item.previousStatus,
      },
      after: item.rideRequest,
    });
  }

  return outcome;
}
