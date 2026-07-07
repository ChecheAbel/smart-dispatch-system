import type { RideRequestStatus } from "@smart-dispatch/types";

/** Grace period after submission during which a customer may cancel a pending request. */
export const RIDE_REQUEST_CANCEL_GRACE_MS = 15 * 60 * 1000;

export function getRideRequestCancelDeadline(createdAt: Date) {
  return new Date(createdAt.getTime() + RIDE_REQUEST_CANCEL_GRACE_MS);
}

export function canEditRideRequest(status: RideRequestStatus) {
  return status === "pending";
}

export function canCancelRideRequest(
  status: RideRequestStatus,
  createdAt: Date,
  now: Date = new Date(),
) {
  if (status !== "pending") {
    return false;
  }

  return now.getTime() <= getRideRequestCancelDeadline(createdAt).getTime();
}
