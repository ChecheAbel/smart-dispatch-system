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

export type DispatchEscalationResult = {
  unmatched: number;
  disrupted: number;
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

function waitMinutesForUnmatched(scheduledAt: Date | null, createdAt: Date, now: Date) {
  if (!scheduledAt) {
    return Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / 60_000));
  }

  return Math.max(0, Math.round(Math.abs(now.getTime() - scheduledAt.getTime()) / 60_000));
}

async function notifyEscalation(input: {
  rideRequestId: string;
  level: DispatchEscalationLevel;
  reason: "unmatched" | "disrupted";
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

export async function runDispatchEscalationJob(): Promise<DispatchEscalationResult> {
  const result: DispatchEscalationResult = {
    unmatched: 0,
    disrupted: 0,
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
      if (level === "supervisor") {
        const sentSupervisor = await notifyEscalation({
          rideRequestId: trip.id,
          level: "supervisor",
          reason: "unmatched",
          waitMinutes,
        });
        if (sentSupervisor) {
          result.notifiedSupervisor += 1;
        }
        if (!(await wasRideRequestNotificationSent(trip.id, "escalated"))) {
          const sentDispatcher = await notifyEscalation({
            rideRequestId: trip.id,
            level: "dispatcher",
            reason: "unmatched",
            waitMinutes,
          });
          if (sentDispatcher) {
            result.notifiedDispatcher += 1;
          }
        }
        continue;
      }

      const sent = await notifyEscalation({
        rideRequestId: trip.id,
        level: "dispatcher",
        reason: "unmatched",
        waitMinutes,
      });
      if (sent) {
        result.notifiedDispatcher += 1;
      }
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
      if (level === "supervisor") {
        const sentSupervisor = await notifyEscalation({
          rideRequestId: disruption.id,
          level: "supervisor",
          reason: "disrupted",
          waitMinutes,
        });
        if (sentSupervisor) {
          result.notifiedSupervisor += 1;
        }
        if (!(await wasRideRequestNotificationSent(disruption.id, "escalated"))) {
          const sentDispatcher = await notifyEscalation({
            rideRequestId: disruption.id,
            level: "dispatcher",
            reason: "disrupted",
            waitMinutes,
          });
          if (sentDispatcher) {
            result.notifiedDispatcher += 1;
          }
        }
        continue;
      }

      const sent = await notifyEscalation({
        rideRequestId: disruption.id,
        level: "dispatcher",
        reason: "disrupted",
        waitMinutes,
      });
      if (sent) {
        result.notifiedDispatcher += 1;
      }
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
  return `[DispatchEscalation] unmatched=${result.unmatched}, disrupted=${result.disrupted}, dispatcher=${result.notifiedDispatcher}, supervisor=${result.notifiedSupervisor}, errors=${result.errors.length}`;
}
