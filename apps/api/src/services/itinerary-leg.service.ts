import { prisma } from "../db/prisma";
import type { RideRequestStatus } from "@smart-dispatch/types";
import {
  findRideRequestById,
  updateRideRequestStatusAdmin,
} from "../models/ride-request.model";
import { toPublicRideRequestLeg } from "../mappers/ride-request.mapper";
import {
  broadcastRealtimeLegEvent,
  broadcastRealtimeTripEvent,
} from "../websocket/realtime.socket";
import { ensureTripBillingSnapshot } from "./trip-billing.service";

export type UpdateLegStatusInput = {
  rideRequestId: string;
  legId: string;
  status: RideRequestStatus;
  actualWaitMinutes?: number;
  actualDistanceKm?: number;
};

export async function updateLegStatus(input: UpdateLegStatusInput) {
  const leg = await prisma.rideRequestLeg.findFirst({
    where: {
      id: input.legId,
      rideRequestId: input.rideRequestId,
    },
  });

  if (!leg) {
    throw new Error("LEG_NOT_FOUND");
  }

  const now = new Date();
  const data: Record<string, unknown> = {
    status: input.status,
  };

  if (input.status === "in_progress" && !leg.startedAt) {
    data.startedAt = now;
  } else if (input.status === "completed" && !leg.completedAt) {
    data.completedAt = now;
  }

  if (typeof input.actualWaitMinutes === "number") {
    data.actualWaitMinutes = Math.max(0, input.actualWaitMinutes);
  }

  if (typeof input.actualDistanceKm === "number") {
    data.actualDistanceKm = Math.max(0, input.actualDistanceKm);
  }

  const updatedLeg = await prisma.rideRequestLeg.update({
    where: { id: input.legId },
    data,
  });

  // Trip State Machine Synchronization (Item 3)
  const parent = await findRideRequestById(input.rideRequestId);
  if (parent) {
    if (input.status === "in_progress") {
      if (["pending", "assigned", "confirmed"].includes(parent.status)) {
        await updateRideRequestStatusAdmin(parent.id, "in_progress");
      }
    } else if (input.status === "completed") {
      const allLegs = await prisma.rideRequestLeg.findMany({
        where: { rideRequestId: input.rideRequestId },
        orderBy: { sequenceOrder: "asc" },
      });
      const allFinished = allLegs.every(
        (l) => l.status === "completed" || l.status === "cancelled",
      );
      if (allFinished && parent.status !== "completed") {
        const totalDistance = computeTotalLegsDistance(allLegs);
        const totalWaitMinutes = computeTotalLegsWaitMinutes(allLegs);

        await updateRideRequestStatusAdmin(parent.id, "completed");

        if (totalDistance > 0 || totalWaitMinutes > 0) {
          await prisma.rideRequest.update({
            where: { id: parent.id },
            data: {
              ...(totalDistance > 0 ? { distanceKm: totalDistance } : {}),
              ...(totalWaitMinutes > 0 ? { waitingMinutes: totalWaitMinutes } : {}),
            },
          });
        }

        if (parent.contractId) {
          try {
            await ensureTripBillingSnapshot(parent.id, { recalculate: true });
          } catch (err) {
            console.warn("Failed to ensure billing snapshot for multi-leg completion:", err);
          }
        }
      }
    }
  }

  const freshParent = await findRideRequestById(input.rideRequestId);

  // Real-time Broadcasting (Item 4)
  try {
    broadcastRealtimeLegEvent({
      requesterUserId: freshParent?.requesterUserId ?? parent?.requesterUserId,
      driverUserId: freshParent?.assignedDriverUserId ?? parent?.assignedDriverUserId,
      payload: {
        ride_request_id: input.rideRequestId,
        leg: toPublicRideRequestLeg(updatedLeg),
        parent_status: freshParent?.status ?? parent?.status ?? "pending",
      },
    });

    if (freshParent && freshParent.assignedDriverUserId) {
      broadcastRealtimeTripEvent(freshParent.assignedDriverUserId, {
        type: "updated",
        data: freshParent,
      });
    }
  } catch (socketErr) {
    console.warn("Failed to broadcast realtime leg event:", socketErr);
  }

  return updatedLeg;
}

export async function getRideRequestLegs(rideRequestId: string) {
  return prisma.rideRequestLeg.findMany({
    where: { rideRequestId },
    orderBy: { sequenceOrder: "asc" },
  });
}

export function computeTotalLegsDistance(
  legs: Array<{
    actualDistanceKm?: unknown;
    estimatedDistanceKm?: unknown;
    actual_distance_km?: unknown;
    estimated_distance_km?: unknown;
  }>,
) {
  return legs.reduce((total, leg) => {
    const actual = Number((leg as any).actualDistanceKm ?? (leg as any).actual_distance_km ?? 0);
    const estimated = Number((leg as any).estimatedDistanceKm ?? (leg as any).estimated_distance_km ?? 0);
    const val = actual > 0 ? actual : estimated;
    return total + (isNaN(val) ? 0 : val);
  }, 0);
}

export function computeTotalLegsWaitMinutes(
  legs: Array<{
    actualWaitMinutes?: unknown;
    plannedWaitMinutes?: unknown;
    actual_wait_minutes?: unknown;
    planned_wait_minutes?: unknown;
  }>,
) {
  return legs.reduce((total, leg) => {
    const actual = Number((leg as any).actualWaitMinutes ?? (leg as any).actual_wait_minutes ?? 0);
    const planned = Number((leg as any).plannedWaitMinutes ?? (leg as any).planned_wait_minutes ?? 0);
    const val = actual > 0 ? actual : planned;
    return total + (isNaN(val) ? 0 : val);
  }, 0);
}
