import type { RideRequestStatus } from "@smart-dispatch/types";

export type AdminRideRequestAction = "confirm" | "reject";

const ADMIN_CONFIRM_FROM: RideRequestStatus[] = ["pending"];
const ADMIN_REJECT_FROM: RideRequestStatus[] = ["pending", "confirmed"];

export function canAdminConfirmRideRequest(status: RideRequestStatus) {
  return ADMIN_CONFIRM_FROM.includes(status);
}

export function canAdminRejectRideRequest(status: RideRequestStatus) {
  return ADMIN_REJECT_FROM.includes(status);
}

export function getAdminRideRequestTargetStatus(action: AdminRideRequestAction): RideRequestStatus {
  return action === "confirm" ? "confirmed" : "cancelled";
}

export function validateAdminRideRequestAction(
  status: RideRequestStatus,
  action: AdminRideRequestAction,
): string | null {
  if (action === "confirm" && !canAdminConfirmRideRequest(status)) {
    return "Only pending ride requests can be approved.";
  }

  if (action === "reject" && !canAdminRejectRideRequest(status)) {
    return "Only pending or confirmed ride requests can be rejected.";
  }

  return null;
}
