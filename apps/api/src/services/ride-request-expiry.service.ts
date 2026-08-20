import type { RideRequestStatus } from "@smart-dispatch/types";
import {
  AUTO_COMPLETED_TRIP_NOTE,
  buildExpiredRideRequestReason,
  findExpiredUnstartedRideRequests,
  findStaleInProgressRideRequests,
  updateRideRequestStatusAdmin,
} from "../models/ride-request.model";
import { recordAuditLog } from "./audit-log.service";
import { applyDispatchAutoAssignments } from "./dispatch-allocation.service";
import { syncDriverUpcomingTripsAfterChange } from "./driver-upcoming-trips-sync.service";
import { queueRideRequestNotifications } from "./notification-dispatch.service";

export type RideRequestExpiryResult = {
  candidates: number;
  cancelled: number;
  completed: number;
  errors: string[];
};

async function cancelExpiredUnstartedRides(result: RideRequestExpiryResult) {
  const rides = await findExpiredUnstartedRideRequests();
  result.candidates += rides.length;

  for (const ride of rides) {
    try {
      const updated = await updateRideRequestStatusAdmin(ride.id, "cancelled", {
        rejectionReason: buildExpiredRideRequestReason(ride.scheduledAt),
      });

      if (!updated) {
        continue;
      }

      await recordAuditLog({
        action: "update",
        module: "ride_requests",
        entityType: "ride_request",
        entityId: updated.id,
        entityLabel: `${updated.pickupAddress} → ${updated.dropoffAddress}`,
        summary: "Ride request automatically cancelled after scheduled pickup time passed",
      });

      queueRideRequestNotifications("cancelled", updated.id);
      syncDriverUpcomingTripsAfterChange({
        before: {
          id: ride.id,
          assignedDriverUserId: ride.assignedDriverUserId,
          status: ride.status as RideRequestStatus,
        },
        after: updated,
      });

      result.cancelled += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown ride expiry error.";
      result.errors.push(`Ride ${ride.id}: ${message}`);
    }
  }
}

async function completeStaleInProgressRides(result: RideRequestExpiryResult) {
  const rides = await findStaleInProgressRideRequests();
  result.candidates += rides.length;

  for (const ride of rides) {
    try {
      const updated = await updateRideRequestStatusAdmin(ride.id, "completed", {
        notesAppend: AUTO_COMPLETED_TRIP_NOTE,
      });

      if (!updated) {
        continue;
      }

      await recordAuditLog({
        action: "update",
        module: "ride_requests",
        entityType: "ride_request",
        entityId: updated.id,
        entityLabel: `${updated.pickupAddress} → ${updated.dropoffAddress}`,
        summary: "Ride request automatically completed because the driver did not close the trip",
      });

      queueRideRequestNotifications("completed", updated.id);
      syncDriverUpcomingTripsAfterChange({
        before: {
          id: ride.id,
          assignedDriverUserId: ride.assignedDriverUserId,
          status: ride.status as RideRequestStatus,
        },
        after: updated,
      });

      result.completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown ride auto-complete error.";
      result.errors.push(`Ride ${ride.id}: ${message}`);
    }
  }
}

export async function runRideRequestExpiryJob(): Promise<RideRequestExpiryResult> {
  const result: RideRequestExpiryResult = {
    candidates: 0,
    cancelled: 0,
    completed: 0,
    errors: [],
  };

  await cancelExpiredUnstartedRides(result);
  await completeStaleInProgressRides(result);

  if (result.cancelled > 0 || result.completed > 0) {
    try {
      await applyDispatchAutoAssignments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown reallocation error.";
      result.errors.push(`Reallocation after expiry: ${message}`);
    }
  }

  return result;
}

export function isRideRequestExpiryEnabled() {
  return process.env.RIDE_REQUEST_EXPIRY_ENABLED !== "false";
}

export function formatRideRequestExpirySummary(result: RideRequestExpiryResult) {
  return `[RideRequestExpiry] candidates=${result.candidates}, cancelled=${result.cancelled}, completed=${result.completed}, errors=${result.errors.length}`;
}
