import { prisma } from "../db/prisma";
import type { RideRequestStatus } from "@smart-dispatch/types";

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

  return prisma.rideRequestLeg.update({
    where: { id: input.legId },
    data,
  });
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
