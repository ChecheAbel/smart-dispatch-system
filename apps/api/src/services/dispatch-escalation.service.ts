import type { DispatchEscalationLevel, RideRequestNotificationEvent } from "@smart-dispatch/types";
import { prisma } from "../db/prisma";
import { getDeadlineSettings } from "../models/app-setting.model";
import { wasRideRequestNotificationSent } from "../models/ride-request.model";
import { sendRideRequestNotifications } from "./notification-dispatch.service";
import {
  getDisruptionWaitMinutes,
  listUnresolvedDisruptions,
  noteDisruptionSeen,
} from "./trip-disruption.service";

const ESCALATION_BATCH = 40;

export type DispatchEscalationReason = "unmatched" | "disrupted" | "assigned_not_started";

export type DispatchEscalationResult = {
  unmatched: number;
  disrupted: number;
  assignedNotStarted: number;
  notifiedDispatcher: number;
  notifiedSupervisor: number;
  errors: string[];
};

function supervisorMinutes(dispatcherMinutes: number, configured: number) {
  return Math.max(configured, dispatcherMinutes);
}

export function getUnmatchedEscalationLevel(
  scheduledAt: Date | null,
  createdAt: Date,
  now = new Date(),
): DispatchEscalationLevel | null {
  const settings = getDeadlineSettings();
  const dispatcherWait = settings.dispatch_escalate_dispatcher_minutes;
  const supervisorWait = supervisorMinutes(
    dispatcherWait,
    settings.dispatch_escalate_supervisor_minutes,
  );

  if (!scheduledAt) {
    const waited = (now.getTime() - createdAt.getTime()) / 60_000;
    if (waited >= supervisorWait) {
      return "supervisor";
    }
    if (waited >= dispatcherWait) {
      return "dispatcher";
    }
    return null;
  }

  const minutesUntilPickup = (scheduledAt.getTime() - now.getTime()) / 60_000;
  if (minutesUntilPickup <= -supervisorWait) {
    return "supervisor";
  }
  if (minutesUntilPickup <= dispatcherWait) {
    return "dispatcher";
  }
  return null;
}

export function getDisruptedEscalationLevel(
  waitMinutes: number,
): DispatchEscalationLevel | null {
  const settings = getDeadlineSettings();
  const dispatcherWait = settings.dispatch_escalate_dispatcher_minutes;
  const supervisorWait = supervisorMinutes(
    dispatcherWait,
    settings.dispatch_escalate_supervisor_minutes,
  );

  if (waitMinutes >= supervisorWait) {
    return "supervisor";
  }
  if (waitMinutes >= dispatcherWait) {
    return "dispatcher";
  }
  return null;
}

/**
 * Assigned confirmed trips escalate only after scheduled pickup + dispatcher grace,
 * then again at the supervisor threshold. Trips stay open for manual start / no-show / cancel.
 */
export function getAssignedNotStartedEscalationLevel(
  scheduledAt: Date | null,
  now = new Date(),
): DispatchEscalationLevel | null {
  if (!scheduledAt) {
    return null;
  }

  const settings = getDeadlineSettings();
  const dispatcherWait = settings.dispatch_escalate_dispatcher_minutes;
  const supervisorWait = supervisorMinutes(
    dispatcherWait,
    settings.dispatch_escalate_supervisor_minutes,
  );

  const minutesPastPickup = (now.getTime() - scheduledAt.getTime()) / 60_000;
  if (minutesPastPickup < dispatcherWait) {
    return null;
  }
  if (minutesPastPickup >= supervisorWait) {
    return "supervisor";
  }
  return "dispatcher";
}

function waitMinutesForUnmatched(scheduledAt: Date | null, createdAt: Date, now: Date) {
  if (!scheduledAt) {
    return Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / 60_000));
  }

  return Math.max(0, Math.round(Math.abs(now.getTime() - scheduledAt.getTime()) / 60_000));
}

function waitMinutesPastPickup(scheduledAt: Date, now: Date) {
  return Math.max(0, Math.round((now.getTime() - scheduledAt.getTime()) / 60_000));
}

/** Pickup cutoff so SQL can skip trips still inside the post-pickup grace window. */
export function assignedNotStartedEscalationCutoff(now = new Date()) {
  const graceMinutes = getDeadlineSettings().dispatch_escalate_dispatcher_minutes;
  return new Date(now.getTime() - graceMinutes * 60_000);
}

async function notifyEscalation(input: {
  rideRequestId: string;
  level: DispatchEscalationLevel;
  reason: DispatchEscalationReason;
  waitMinutes: number;
}) {
  const event: RideRequestNotificationEvent =
    input.level === "supervisor" ? "escalated_supervisor" : "escalated";

  if (await wasRideRequestNotificationSent(input.rideRequestId, event)) {
    return false;
  }

  await sendRideRequestNotifications(event, input.rideRequestId, {
    escalation_reason: input.reason,
    escalation_level: input.level,
    wait_minutes: String(input.waitMinutes),
  });

  return true;
}

async function escalateAtLevel(
  result: DispatchEscalationResult,
  input: {
    rideRequestId: string;
    level: DispatchEscalationLevel;
    reason: DispatchEscalationReason;
    waitMinutes: number;
  },
) {
  if (input.level === "supervisor") {
    const sentSupervisor = await notifyEscalation({
      ...input,
      level: "supervisor",
    });
    if (sentSupervisor) {
      result.notifiedSupervisor += 1;
    }
    if (!(await wasRideRequestNotificationSent(input.rideRequestId, "escalated"))) {
      const sentDispatcher = await notifyEscalation({
        ...input,
        level: "dispatcher",
      });
      if (sentDispatcher) {
        result.notifiedDispatcher += 1;
      }
    }
    return;
  }

  const sent = await notifyEscalation({
    ...input,
    level: "dispatcher",
  });
  if (sent) {
    result.notifiedDispatcher += 1;
  }
}

export async function runDispatchEscalationJob(): Promise<DispatchEscalationResult> {
  const result: DispatchEscalationResult = {
    unmatched: 0,
    disrupted: 0,
    assignedNotStarted: 0,
    notifiedDispatcher: 0,
    notifiedSupervisor: 0,
    errors: [],
  };

  const now = new Date();

  const unmatched = await prisma.rideRequest.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      assignedVehicleId: null,
    },
    select: { id: true, scheduledAt: true, createdAt: true },
    orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: ESCALATION_BATCH,
  });

  for (const trip of unmatched) {
    const level = getUnmatchedEscalationLevel(trip.scheduledAt, trip.createdAt, now);
    if (!level) {
      continue;
    }

    result.unmatched += 1;
    const waitMinutes = waitMinutesForUnmatched(trip.scheduledAt, trip.createdAt, now);

    try {
      await escalateAtLevel(result, {
        rideRequestId: trip.id,
        level,
        reason: "unmatched",
        waitMinutes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown escalation error.";
      result.errors.push(`Ride ${trip.id}: ${message}`);
    }
  }

  const assignedNotStarted = await prisma.rideRequest.findMany({
    where: {
      status: "confirmed",
      assignedVehicleId: { not: null },
      assignedDriverUserId: { not: null },
      scheduledAt: { lte: assignedNotStartedEscalationCutoff(now) },
    },
    select: { id: true, scheduledAt: true },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: ESCALATION_BATCH,
  });

  for (const trip of assignedNotStarted) {
    const level = getAssignedNotStartedEscalationLevel(trip.scheduledAt, now);
    if (!level || !trip.scheduledAt) {
      continue;
    }

    result.assignedNotStarted += 1;
    const waitMinutes = waitMinutesPastPickup(trip.scheduledAt, now);

    try {
      await escalateAtLevel(result, {
        rideRequestId: trip.id,
        level,
        reason: "assigned_not_started",
        waitMinutes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown escalation error.";
      result.errors.push(`Ride ${trip.id}: ${message}`);
    }
  }

  const disruptions = await listUnresolvedDisruptions();
  for (const disruption of disruptions) {
    noteDisruptionSeen(disruption.id);
    const waitMinutes = getDisruptionWaitMinutes(disruption.id);
    const level = getDisruptedEscalationLevel(waitMinutes);
    if (!level) {
      continue;
    }

    result.disrupted += 1;

    try {
      await escalateAtLevel(result, {
        rideRequestId: disruption.id,
        level,
        reason: "disrupted",
        waitMinutes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown escalation error.";
      result.errors.push(`Ride ${disruption.id}: ${message}`);
    }
  }

  return result;
}

export function isDispatchEscalationEnabled() {
  return process.env.DISPATCH_ESCALATION_ENABLED !== "false";
}

export function formatDispatchEscalationSummary(result: DispatchEscalationResult) {
  return `[DispatchEscalation] unmatched=${result.unmatched}, assignedNotStarted=${result.assignedNotStarted}, disrupted=${result.disrupted}, dispatcher=${result.notifiedDispatcher}, supervisor=${result.notifiedSupervisor}, errors=${result.errors.length}`;
}
