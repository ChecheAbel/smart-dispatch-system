import type { LateCancellationType, RideRequestStatus } from "@smart-dispatch/types";
import { getRideRequestCancelDeadline } from "./ride-request-policy.service";

export type BookingPolicyRules = {
  isActive: boolean;
  minAdvanceBookingHours: number;
  maxAdvanceBookingHours: number;
  freeCancellationHours: number;
  lateCancellationType: LateCancellationType;
  lateCancellationFee: number | null | { toNumber: () => number };
  noShowType?: LateCancellationType;
  noShowFee?: number | null | { toNumber: () => number };
  currency: string;
} | null | undefined;

function hoursToMs(hours: number) {
  return hours * 60 * 60 * 1000;
}

function toFeeNumber(
  value: number | null | { toNumber: () => number } | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isActivePolicy(
  policy: BookingPolicyRules,
): policy is NonNullable<BookingPolicyRules> {
  return Boolean(policy && policy.isActive);
}

/**
 * Validates scheduled pickup against the contract booking policy advance window.
 * Returns an error message, or null when allowed.
 */
export function assertAdvanceBookingWindow(
  scheduledAt: Date | null | undefined,
  policy: BookingPolicyRules,
  now: Date = new Date(),
): string | null {
  if (!isActivePolicy(policy)) {
    return null;
  }

  if (!scheduledAt) {
    return "A scheduled pickup time is required by this contract's booking policy.";
  }

  const leadMs = scheduledAt.getTime() - now.getTime();
  const minMs = hoursToMs(policy.minAdvanceBookingHours);
  const maxMs = hoursToMs(policy.maxAdvanceBookingHours);

  if (leadMs < minMs) {
    return `Bookings must be made at least ${policy.minAdvanceBookingHours} hour(s) before pickup.`;
  }

  if (leadMs > maxMs) {
    return `Bookings cannot be made more than ${policy.maxAdvanceBookingHours} hour(s) before pickup.`;
  }

  return null;
}

export function getBookingPolicyFreeCancelDeadline(
  scheduledAt: Date,
  freeCancellationHours: number,
) {
  return new Date(scheduledAt.getTime() - hoursToMs(freeCancellationHours));
}

export type CancelEvaluation = {
  allowed: boolean;
  reason?: string;
  /** When free cancellation ends (policy) or system grace ends (fallback). */
  freeCancelDeadline: Date | null;
  isLateCancellation: boolean;
  lateCancellationType: LateCancellationType | null;
  lateCancellationFee: number | null;
  lateCancellationCurrency: string | null;
};

/**
 * Decides whether a customer can cancel, and whether a late-cancellation penalty applies.
 *
 * Rules:
 * - Only pending requests can be cancelled.
 * - System grace after create always allows a free cancel.
 * - With an active booking policy + scheduled pickup:
 *   - Free cancel until scheduledAt - freeCancellationHours
 *   - After that, cancel is still allowed while pending, with late policy applied
 * - Without a policy, only the system grace window applies.
 */
export function evaluateRideRequestCancellation(input: {
  status: RideRequestStatus;
  createdAt: Date;
  scheduledAt: Date | null;
  policy?: BookingPolicyRules;
  now?: Date;
}): CancelEvaluation {
  const now = input.now ?? new Date();
  const systemGraceDeadline = getRideRequestCancelDeadline(input.createdAt);

  if (input.status !== "pending") {
    return {
      allowed: false,
      reason: "This ride request can no longer be cancelled.",
      freeCancelDeadline: null,
      isLateCancellation: false,
      lateCancellationType: null,
      lateCancellationFee: null,
      lateCancellationCurrency: null,
    };
  }

  if (now.getTime() <= systemGraceDeadline.getTime()) {
    return {
      allowed: true,
      freeCancelDeadline: systemGraceDeadline,
      isLateCancellation: false,
      lateCancellationType: null,
      lateCancellationFee: null,
      lateCancellationCurrency: null,
    };
  }

  if (isActivePolicy(input.policy) && input.scheduledAt) {
    const freeCancelDeadline = getBookingPolicyFreeCancelDeadline(
      input.scheduledAt,
      input.policy.freeCancellationHours,
    );

    if (now.getTime() <= freeCancelDeadline.getTime()) {
      return {
        allowed: true,
        freeCancelDeadline,
        isLateCancellation: false,
        lateCancellationType: null,
        lateCancellationFee: null,
        lateCancellationCurrency: null,
      };
    }

    const fee = toFeeNumber(input.policy.lateCancellationFee);

    return {
      allowed: true,
      freeCancelDeadline,
      isLateCancellation: true,
      lateCancellationType: input.policy.lateCancellationType,
      lateCancellationFee:
        input.policy.lateCancellationType === "charge_fee" ? fee : null,
      lateCancellationCurrency: input.policy.currency,
    };
  }

  return {
    allowed: false,
    reason: "This ride request can no longer be cancelled.",
    freeCancelDeadline: systemGraceDeadline,
    isLateCancellation: false,
    lateCancellationType: null,
    lateCancellationFee: null,
    lateCancellationCurrency: null,
  };
}

export function canCancelRideRequestWithPolicy(input: {
  status: RideRequestStatus;
  createdAt: Date;
  scheduledAt: Date | null;
  policy?: BookingPolicyRules;
  now?: Date;
}) {
  return evaluateRideRequestCancellation(input).allowed;
}

export type NoShowBilling = {
  type: LateCancellationType;
  fee: number | null;
  currency: string | null;
};

/**
 * Resolves no-show penalty from an active contract booking policy.
 * Without an active policy, no charge applies.
 */
export function evaluateNoShowBilling(policy?: BookingPolicyRules): NoShowBilling {
  if (!isActivePolicy(policy)) {
    return { type: "none", fee: null, currency: null };
  }

  const type = policy.noShowType ?? "none";
  const fee = toFeeNumber(policy.noShowFee);

  return {
    type,
    fee: type === "charge_fee" ? fee : null,
    currency: type === "none" ? null : policy.currency,
  };
}

export function getEffectiveCancelDeadline(input: {
  status: RideRequestStatus;
  createdAt: Date;
  scheduledAt: Date | null;
  policy?: BookingPolicyRules;
}): Date | null {
  if (input.status !== "pending") {
    return null;
  }

  if (isActivePolicy(input.policy) && input.scheduledAt) {
    return getBookingPolicyFreeCancelDeadline(
      input.scheduledAt,
      input.policy.freeCancellationHours,
    );
  }

  return getRideRequestCancelDeadline(input.createdAt);
}
