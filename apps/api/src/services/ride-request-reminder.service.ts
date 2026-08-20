import {
  findReminderDueRideRequests,
  wasRideRequestNotificationSent,
} from "../models/ride-request.model";
import { sendRideRequestNotifications } from "./notification-dispatch.service";

export type RideRequestReminderResult = {
  candidates: number;
  notified: number;
  errors: string[];
};

export async function runRideRequestReminderJob(): Promise<RideRequestReminderResult> {
  const result: RideRequestReminderResult = {
    candidates: 0,
    notified: 0,
    errors: [],
  };

  const rides = await findReminderDueRideRequests();
  result.candidates = rides.length;

  for (const ride of rides) {
    const alreadySent = await wasRideRequestNotificationSent(ride.id, "reminder");
    if (alreadySent) {
      continue;
    }

    try {
      await sendRideRequestNotifications("reminder", ride.id);
      result.notified += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ride reminder error.";
      result.errors.push(`Ride ${ride.id}: ${message}`);
    }
  }

  return result;
}

export function isRideRequestReminderEnabled() {
  return process.env.RIDE_REQUEST_REMINDER_ENABLED !== "false";
}

export function getRideRequestReminderIntervalMs() {
  const parsed = Number.parseInt(
    process.env.RIDE_REQUEST_REMINDER_INTERVAL_MS ?? "900000",
    10,
  );
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : 900_000;
}

export function getRideRequestReminderStartupDelayMs() {
  const parsed = Number.parseInt(
    process.env.RIDE_REQUEST_REMINDER_STARTUP_DELAY_MS ?? "45000",
    10,
  );
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 45_000;
}

export function formatRideRequestReminderSummary(result: RideRequestReminderResult) {
  return `[RideRequestReminder] candidates=${result.candidates}, notified=${result.notified}, errors=${result.errors.length}`;
}
