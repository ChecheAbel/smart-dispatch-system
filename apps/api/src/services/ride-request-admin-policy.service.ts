import type { RideRequestStatus } from "@smart-dispatch/types";

export type AdminRideRequestStatusAction = "confirm" | "reject" | "start" | "complete";

const ADMIN_CONFIRM_FROM: RideRequestStatus[] = ["pending"];
const ADMIN_REJECT_FROM: RideRequestStatus[] = ["pending", "confirmed"];
const ADMIN_ASSIGN_FROM: RideRequestStatus[] = ["pending", "confirmed"];
const ADMIN_UNASSIGN_FROM: RideRequestStatus[] = ["pending", "confirmed"];
const ADMIN_START_FROM: RideRequestStatus[] = ["confirmed"];
const ADMIN_COMPLETE_FROM: RideRequestStatus[] = ["in_progress"];

export function isRideRequestScheduledInFuture(scheduledAt: Date | null | undefined) {
  if (!scheduledAt) {
    return false;
  }

  return scheduledAt.getTime() > Date.now();
}

export function canAdminConfirmRideRequest(status: RideRequestStatus) {
  return ADMIN_CONFIRM_FROM.includes(status);
}

export function canAdminRejectRideRequest(status: RideRequestStatus) {
  return ADMIN_REJECT_FROM.includes(status);
}

export function canAdminAssignRideRequest(status: RideRequestStatus) {
  return ADMIN_ASSIGN_FROM.includes(status);
}

export function canAdminUnassignRideRequest(
  status: RideRequestStatus,
  hasAssignment: boolean,
) {
  return ADMIN_UNASSIGN_FROM.includes(status) && hasAssignment;
}

export function canAdminStartRideRequest(
  status: RideRequestStatus,
  hasAssignment: boolean,
  scheduledAt?: Date | null,
) {
  if (!ADMIN_START_FROM.includes(status) || !hasAssignment) {
    return false;
  }

  return !isRideRequestScheduledInFuture(scheduledAt);
}

export function isRideRequestStartBlockedBySchedule(
  status: RideRequestStatus,
  hasAssignment: boolean,
  scheduledAt?: Date | null,
) {
  return (
    ADMIN_START_FROM.includes(status) &&
    hasAssignment &&
    isRideRequestScheduledInFuture(scheduledAt)
  );
}

export function canAdminCompleteRideRequest(status: RideRequestStatus) {
  return ADMIN_COMPLETE_FROM.includes(status);
}

export function getAdminRideRequestTargetStatus(
  action: AdminRideRequestStatusAction,
): RideRequestStatus {
  switch (action) {
    case "confirm":
      return "confirmed";
    case "reject":
      return "cancelled";
    case "start":
      return "in_progress";
    case "complete":
      return "completed";
  }
}

export function validateAdminRideRequestStatusAction(
  status: RideRequestStatus,
  action: AdminRideRequestStatusAction,
  options?: { hasAssignment?: boolean; scheduledAt?: Date | null },
): string | null {
  const hasAssignment = Boolean(options?.hasAssignment);

  if (action === "confirm" && !canAdminConfirmRideRequest(status)) {
    return "Only pending ride requests can be approved.";
  }

  if (action === "reject" && !canAdminRejectRideRequest(status)) {
    return "Only pending or confirmed ride requests can be rejected.";
  }

  if (action === "start") {
    if (!ADMIN_START_FROM.includes(status) || !hasAssignment) {
      return hasAssignment
        ? "Only confirmed ride requests with an assignment can be started."
        : "Assign a vehicle and driver before starting the trip.";
    }

    if (isRideRequestScheduledInFuture(options?.scheduledAt)) {
      return "This trip cannot be started before the scheduled pickup time.";
    }
  }

  if (action === "complete" && !canAdminCompleteRideRequest(status)) {
    return "Only in-progress ride requests can be completed.";
  }

  return null;
}

export type DriverRideRequestStatusAction = "start" | "complete";

export function validateDriverRideRequestStatusAction(
  status: RideRequestStatus,
  action: DriverRideRequestStatusAction,
  options?: { scheduledAt?: Date | null },
): string | null {
  if (action === "start") {
    if (status !== "confirmed") {
      return "Only confirmed ride requests can be started.";
    }

    if (isRideRequestScheduledInFuture(options?.scheduledAt)) {
      return "This trip cannot be started before the scheduled pickup time.";
    }
  }

  if (action === "complete" && status !== "in_progress") {
    return "Only in-progress ride requests can be completed.";
  }

  return null;
}

export function getDriverRideRequestTargetStatus(
  action: DriverRideRequestStatusAction,
): RideRequestStatus {
  switch (action) {
    case "start":
      return "in_progress";
    case "complete":
      return "completed";
  }
}
