export const RIDE_REQUEST_REJECTION_REASON_MAX_LENGTH = 500;

export function parseRideRequestRejectionReason(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, error: "A rejection reason is required." };
  }

  const reason = value.trim();

  if (!reason) {
    return { ok: false as const, error: "A rejection reason is required." };
  }

  if (reason.length > RIDE_REQUEST_REJECTION_REASON_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `Rejection reason must be ${RIDE_REQUEST_REJECTION_REASON_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true as const, reason };
}
