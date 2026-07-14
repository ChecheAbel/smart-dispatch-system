import type { RideRequestStatus } from "@smart-dispatch/types";
import { getRideRequestSettings } from "../models/app-setting.model";

/** Grace period after submission during which a customer may cancel a pending request. */
export const RIDE_REQUEST_CANCEL_GRACE_MS = 15 * 60 * 1000;

export function getRideRequestCancelDeadline(createdAt: Date) {
  const minutes = getRideRequestSettings().ride_request_cancel_grace_minutes;
  return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

export function getRideRequestEditDeadline(createdAt: Date) {
  const minutes = getRideRequestSettings().ride_request_edit_grace_minutes;
  return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

export function canEditRideRequest(
  status: RideRequestStatus,
  createdAt: Date,
  now: Date = new Date(),
) {
  if (status !== "pending") {
    return false;
  }

  return now.getTime() <= getRideRequestEditDeadline(createdAt).getTime();
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
