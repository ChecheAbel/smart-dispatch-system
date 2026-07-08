import type { RideRequestStatus } from "@smart-dispatch/types";
import { toPublicRideRequest } from "../mappers/ride-request.mapper";
import { broadcastDriverUpcomingTripEvent } from "../websocket/driver-upcoming-trips.ws";

const UPCOMING_STATUSES = new Set<RideRequestStatus>(["confirmed", "in_progress"]);

type RideRequestSnapshot = {
  id: string;
  assignedDriverUserId: string | null;
  status: RideRequestStatus;
};

type RideRequestEntity = Parameters<typeof toPublicRideRequest>[0];

export function isDriverUpcomingTrip(rideRequest: RideRequestSnapshot) {
  return Boolean(rideRequest.assignedDriverUserId) && UPCOMING_STATUSES.has(rideRequest.status);
}

export function syncDriverUpcomingTripsAfterChange(params: {
  before: RideRequestSnapshot | null;
  after: RideRequestEntity | null;
}) {
  const rideRequestId = params.after?.id ?? params.before?.id;
  if (!rideRequestId) {
    return;
  }

  const beforeDriverId = params.before?.assignedDriverUserId ?? null;
  const afterDriverId = params.after?.assignedDriverUserId ?? null;
  const wasUpcoming = params.before ? isDriverUpcomingTrip(params.before) : false;
  const isUpcoming = params.after ? isDriverUpcomingTrip(params.after) : false;

  if (beforeDriverId && wasUpcoming && (!isUpcoming || beforeDriverId !== afterDriverId)) {
    broadcastDriverUpcomingTripEvent(beforeDriverId, {
      type: "trip_removed",
      data: { id: rideRequestId },
    });
  }

  if (!params.after || !afterDriverId || !isUpcoming) {
    return;
  }

  broadcastDriverUpcomingTripEvent(afterDriverId, {
    type: wasUpcoming && beforeDriverId === afterDriverId ? "trip_updated" : "trip_added",
    data: params.after,
  });
}
