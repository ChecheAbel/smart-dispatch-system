import type { DispatchDisruptionReason, RideRequestStatus, VehicleGeofenceStatus } from "@smart-dispatch/types";
import { prisma } from "../db/prisma";
import { reassignRideRequestAdmin } from "../models/ride-request.model";
import { evaluateVehicleGeofenceStatus } from "../models/vehicle-geofence.model";
import { recordAuditLog } from "./audit-log.service";
import {
  pickReplacementForTrip,
  type DispatchAllocationTrip,
} from "./dispatch-allocation.service";
import { syncDriverUpcomingTripsAfterChange } from "./driver-upcoming-trips-sync.service";
import { queueRideRequestNotifications } from "./notification-dispatch.service";

const STALE_LOCATION_MS = 5 * 60 * 1000;
const REROUTE_COOLDOWN_MS = 10 * 60 * 1000;
const DISRUPTION_LIMIT = 40;

const rerouteCooldown = new Map<string, number>();
const disruptionFirstSeen = new Map<string, number>();

export function noteDisruptionSeen(tripId: string, now = Date.now()) {
  if (!disruptionFirstSeen.has(tripId)) {
    disruptionFirstSeen.set(tripId, now);
  }
  return disruptionFirstSeen.get(tripId) ?? now;
}

export function clearDisruptionSeen(tripId: string) {
  disruptionFirstSeen.delete(tripId);
}

export function getDisruptionWaitMinutes(tripId: string, now = Date.now()) {
  const seen = disruptionFirstSeen.get(tripId);
  if (!seen) {
    return 0;
  }
  return Math.max(0, Math.round((now - seen) / 60_000));
}

export type DisruptedTrip = {
  id: string;
  reason: DispatchDisruptionReason;
  suggestedVehicle: Awaited<ReturnType<typeof pickReplacementForTrip>>;
};

function toCoord(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isGeofenceViolating(status: VehicleGeofenceStatus) {
  return (
    (status.kind === "allowed" && !status.inside) ||
    (status.kind === "restricted" && status.inside)
  );
}

function disruptionReasonForVehicle(input: {
  vehicleStatus: string | null;
  vehicleDriverId: string | null;
  tripDriverId: string | null;
}): DispatchDisruptionReason | null {
  if (!input.vehicleStatus || input.vehicleStatus !== "active") {
    return "vehicle_unavailable";
  }

  if (!input.vehicleDriverId || input.vehicleDriverId !== input.tripDriverId) {
    return "driver_unavailable";
  }

  return null;
}

function onCooldown(tripId: string) {
  const last = rerouteCooldown.get(tripId);
  return Boolean(last && Date.now() - last < REROUTE_COOLDOWN_MS);
}

function markRerouted(tripId: string) {
  rerouteCooldown.set(tripId, Date.now());
}

function toAllocationTrip(
  trip: {
    id: string;
    status: string;
    vehicleTypeId: string | null;
    vehicleClassId: string | null;
    assignedVehicleId: string | null;
    scheduledAt: Date | null;
    scheduledReturnAt: Date | null;
    createdAt: Date;
    pickupLatitude: unknown;
    pickupLongitude: unknown;
  },
  reference?: { latitude: number; longitude: number } | null,
): DispatchAllocationTrip {
  return {
    id: trip.id,
    status: trip.status,
    vehicleTypeId: trip.vehicleTypeId,
    vehicleClassId: trip.vehicleClassId,
    assignedVehicleId: trip.assignedVehicleId,
    scheduledAt: trip.scheduledAt,
    scheduledReturnAt: trip.scheduledReturnAt,
    createdAt: trip.createdAt,
    pickupLatitude: toCoord(trip.pickupLatitude),
    pickupLongitude: toCoord(trip.pickupLongitude),
    referenceLatitude: reference?.latitude ?? null,
    referenceLongitude: reference?.longitude ?? null,
  };
}

async function listAssignedTrips(vehicleId?: string) {
  return prisma.rideRequest.findMany({
    where: {
      status: { in: ["confirmed", "in_progress"] },
      assignedVehicleId: vehicleId ? vehicleId : { not: null },
    },
    orderBy: [{ startedAt: "desc" }, { scheduledAt: "asc" }, { createdAt: "asc" }],
    take: DISRUPTION_LIMIT,
    select: {
      id: true,
      status: true,
      vehicleTypeId: true,
      vehicleClassId: true,
      assignedVehicleId: true,
      assignedDriverUserId: true,
      scheduledAt: true,
      scheduledReturnAt: true,
      createdAt: true,
      pickupLatitude: true,
      pickupLongitude: true,
      pickupAddress: true,
      dropoffAddress: true,
      assignedVehicle: {
        select: {
          id: true,
          status: true,
          assignedDriverUserId: true,
        },
      },
    },
  });
}

export async function detectTripDisruption(
  trip: Awaited<ReturnType<typeof listAssignedTrips>>[number],
  now = new Date(),
): Promise<{
  reason: DispatchDisruptionReason;
  reference: { latitude: number; longitude: number } | null;
} | null> {
  const vehicle = trip.assignedVehicle;
  const assetReason = disruptionReasonForVehicle({
    vehicleStatus: vehicle?.status ?? null,
    vehicleDriverId: vehicle?.assignedDriverUserId ?? null,
    tripDriverId: trip.assignedDriverUserId,
  });

  if (assetReason) {
    return { reason: assetReason, reference: null };
  }

  if (trip.status !== "in_progress" || !trip.assignedVehicleId) {
    return null;
  }

  const snapshot = await prisma.vehicleLocationSnapshot.findUnique({
    where: { vehicleId: trip.assignedVehicleId },
    select: { latitude: true, longitude: true, recordedAt: true },
  });

  const latitude = toCoord(snapshot?.latitude);
  const longitude = toCoord(snapshot?.longitude);
  const reference =
    latitude != null && longitude != null ? { latitude, longitude } : null;

  if (!snapshot || now.getTime() - snapshot.recordedAt.getTime() > STALE_LOCATION_MS) {
    return { reason: "stale_location", reference };
  }

  if (reference) {
    const statuses = await evaluateVehicleGeofenceStatus(trip.assignedVehicleId, reference);
    if (statuses.some(isGeofenceViolating)) {
      return { reason: "geofence_violation", reference };
    }
  }

  return null;
}

export async function listUnresolvedDisruptions(options?: { vehicleId?: string }) {
  const trips = await listAssignedTrips(options?.vehicleId);
  const unresolved: DisruptedTrip[] = [];

  for (const trip of trips) {
    const disruption = await detectTripDisruption(trip);
    if (!disruption) {
      clearDisruptionSeen(trip.id);
      continue;
    }

    noteDisruptionSeen(trip.id);
    unresolved.push({
      id: trip.id,
      reason: disruption.reason,
      suggestedVehicle: await pickReplacementForTrip(toAllocationTrip(trip, disruption.reference)),
    });
  }

  return unresolved;
}

export async function rerouteDisruptedTrips(
  options: { vehicleId?: string; actorUserId?: string | null } = {},
) {
  const result = {
    checked: 0,
    rerouted: 0,
    unresolved: [] as DisruptedTrip[],
    errors: [] as string[],
  };

  const trips = await listAssignedTrips(options.vehicleId);
  result.checked = trips.length;

  for (const trip of trips) {
    try {
      const disruption = await detectTripDisruption(trip);
      if (!disruption) {
        clearDisruptionSeen(trip.id);
        continue;
      }

      noteDisruptionSeen(trip.id);

      if (onCooldown(trip.id)) {
        result.unresolved.push({
          id: trip.id,
          reason: disruption.reason,
          suggestedVehicle: await pickReplacementForTrip(toAllocationTrip(trip, disruption.reference)),
        });
        continue;
      }

      const currentVehicleId = trip.assignedVehicleId;
      const vehicleStillDispatchable =
        trip.assignedVehicle?.status === "active" && Boolean(trip.assignedVehicle.assignedDriverUserId);

      if (disruption.reason === "driver_unavailable" && vehicleStillDispatchable && currentVehicleId) {
        const synced = await reassignRideRequestAdmin(trip.id, currentVehicleId);
        if (synced) {
          markRerouted(trip.id);
          await recordAuditLog({
            actorUserId: options.actorUserId ?? null,
            action: "assign",
            module: "ride_requests",
            entityType: "ride_request",
            entityId: synced.id,
            entityLabel: `${synced.pickupAddress} → ${synced.dropoffAddress}`,
            summary: "Trip driver synced after vehicle driver change",
          });
          queueRideRequestNotifications("assigned", synced.id);
          syncDriverUpcomingTripsAfterChange({
            before: {
              id: trip.id,
              assignedDriverUserId: trip.assignedDriverUserId,
              status: trip.status as RideRequestStatus,
            },
            after: synced,
          });
          clearDisruptionSeen(trip.id);
          result.rerouted += 1;
          continue;
        }
      }

      const suggestion = await pickReplacementForTrip(toAllocationTrip(trip, disruption.reference));
      if (!suggestion) {
        result.unresolved.push({ id: trip.id, reason: disruption.reason, suggestedVehicle: null });
        continue;
      }

      const previousDriverId = trip.assignedDriverUserId;
      const previousStatus = trip.status as RideRequestStatus;
      const updated = await reassignRideRequestAdmin(trip.id, suggestion.id);
      if (!updated) {
        result.unresolved.push({ id: trip.id, reason: disruption.reason, suggestedVehicle: suggestion });
        continue;
      }

      markRerouted(trip.id);

      await recordAuditLog({
        actorUserId: options.actorUserId ?? null,
        action: "assign",
        module: "ride_requests",
        entityType: "ride_request",
        entityId: updated.id,
        entityLabel: `${updated.pickupAddress} → ${updated.dropoffAddress}`,
        summary: `Trip automatically rerouted after disruption (${disruption.reason}) to ${suggestion.plate_number}`,
      });

      queueRideRequestNotifications("rerouted", updated.id);
      syncDriverUpcomingTripsAfterChange({
        before: {
          id: trip.id,
          assignedDriverUserId: previousDriverId,
          status: previousStatus,
        },
        after: updated,
      });

      clearDisruptionSeen(trip.id);
      result.rerouted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown reroute error.";
      result.errors.push(`Ride ${trip.id}: ${message}`);
    }
  }

  return result;
}

export function isTripDisruptionRerouteEnabled() {
  return process.env.TRIP_DISRUPTION_REROUTE_ENABLED !== "false";
}

export function formatTripDisruptionSummary(result: Awaited<ReturnType<typeof rerouteDisruptedTrips>>) {
  return `[TripDisruption] checked=${result.checked}, rerouted=${result.rerouted}, unresolved=${result.unresolved.length}, errors=${result.errors.length}`;
}

export function queueTripDisruptionReroute(options: { vehicleId?: string; actorUserId?: string | null } = {}) {
  if (!isTripDisruptionRerouteEnabled()) {
    return;
  }

  void rerouteDisruptedTrips(options).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown reroute error.";
    console.error(`[TripDisruption] ${message}`);
  });
}
