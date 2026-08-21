import {
  formatInvoiceAutomationSummary,
  getInvoiceAutomationIntervalMs,
  getInvoiceAutomationStartupDelayMs,
  isInvoiceAutomationEnabled,
  runInvoiceAutomation,
} from "./invoice-automation.service";
import {
  formatRideRequestExpirySummary,
  isRideRequestExpiryEnabled,
  runRideRequestExpiryJob,
} from "./ride-request-expiry.service";
import {
  formatTripDisruptionSummary,
  isTripDisruptionRerouteEnabled,
  rerouteDisruptedTrips,
} from "./trip-disruption.service";
import {
  formatDispatchEscalationSummary,
  isDispatchEscalationEnabled,
  runDispatchEscalationJob,
} from "./dispatch-escalation.service";
import {
  formatRideRequestReminderSummary,
  getRideRequestReminderIntervalMs,
  getRideRequestReminderStartupDelayMs,
  isRideRequestReminderEnabled,
  runRideRequestReminderJob,
} from "./ride-request-reminder.service";

let invoiceAutomationTimer: NodeJS.Timeout | null = null;
let invoiceAutomationRunning = false;

let rideRequestReminderTimer: NodeJS.Timeout | null = null;
let rideRequestReminderRunning = false;
let rideRequestExpiryRunning = false;
let tripDisruptionRunning = false;
let dispatchEscalationRunning = false;

async function executeInvoiceAutomation(trigger: "startup" | "interval") {
  if (invoiceAutomationRunning) {
    console.log(`[Scheduler] Skipping invoice automation (${trigger}): previous run still in progress.`);
    return;
  }

  invoiceAutomationRunning = true;

  try {
    const result = await runInvoiceAutomation();
    console.log(formatInvoiceAutomationSummary(result));

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(`[InvoiceAutomation] ${error}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduler error.";
    console.error(`[Scheduler] Invoice automation failed (${trigger}): ${message}`);
  } finally {
    invoiceAutomationRunning = false;
  }
}

async function executeRideRequestExpiry(trigger: "startup" | "interval") {
  if (!isRideRequestExpiryEnabled()) {
    return;
  }

  if (rideRequestExpiryRunning) {
    console.log(
      `[Scheduler] Skipping ride request expiry (${trigger}): previous run still in progress.`,
    );
    return;
  }

  rideRequestExpiryRunning = true;

  try {
    const result = await runRideRequestExpiryJob();
    console.log(formatRideRequestExpirySummary(result));

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(`[RideRequestExpiry] ${error}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduler error.";
    console.error(`[Scheduler] Ride request expiry failed (${trigger}): ${message}`);
  } finally {
    rideRequestExpiryRunning = false;
  }
}

async function executeTripDisruption(trigger: "startup" | "interval") {
  if (!isTripDisruptionRerouteEnabled()) {
    return;
  }

  if (tripDisruptionRunning) {
    console.log(
      `[Scheduler] Skipping trip disruption reroute (${trigger}): previous run still in progress.`,
    );
    return;
  }

  tripDisruptionRunning = true;

  try {
    const result = await rerouteDisruptedTrips();
    console.log(formatTripDisruptionSummary(result));

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(`[TripDisruption] ${error}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduler error.";
    console.error(`[Scheduler] Trip disruption reroute failed (${trigger}): ${message}`);
  } finally {
    tripDisruptionRunning = false;
  }
}

async function executeRideRequestReminder(trigger: "startup" | "interval") {
  if (rideRequestReminderRunning) {
    console.log(
      `[Scheduler] Skipping ride request reminder (${trigger}): previous run still in progress.`,
    );
    return;
  }

  rideRequestReminderRunning = true;

  try {
    const result = await runRideRequestReminderJob();
    console.log(formatRideRequestReminderSummary(result));

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(`[RideRequestReminder] ${error}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduler error.";
    console.error(`[Scheduler] Ride request reminder failed (${trigger}): ${message}`);
  } finally {
    rideRequestReminderRunning = false;
  }
}

async function executeDispatchEscalation(trigger: "startup" | "interval") {
  if (!isDispatchEscalationEnabled()) {
    return;
  }

  if (dispatchEscalationRunning) {
    console.log(
      `[Scheduler] Skipping dispatch escalation (${trigger}): previous run still in progress.`,
    );
    return;
  }

  dispatchEscalationRunning = true;

  try {
    const result = await runDispatchEscalationJob();
    console.log(formatDispatchEscalationSummary(result));

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.error(`[DispatchEscalation] ${error}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduler error.";
    console.error(`[Scheduler] Dispatch escalation failed (${trigger}): ${message}`);
  } finally {
    dispatchEscalationRunning = false;
  }
}

async function executeRideRequestJobs(trigger: "startup" | "interval") {
  if (isRideRequestReminderEnabled()) {
    await executeRideRequestReminder(trigger);
  }

  await executeRideRequestExpiry(trigger);
  await executeTripDisruption(trigger);
  await executeDispatchEscalation(trigger);
}

export function startInvoiceAutomationScheduler() {
  if (!isInvoiceAutomationEnabled()) {
    console.log("[Scheduler] Invoice automation disabled (INVOICE_AUTOMATION_ENABLED=false).");
    return;
  }

  const intervalMs = getInvoiceAutomationIntervalMs();
  const startupDelayMs = getInvoiceAutomationStartupDelayMs();

  console.log(
    `[Scheduler] Invoice automation enabled. First run in ${startupDelayMs}ms, then every ${intervalMs}ms.`,
  );

  setTimeout(() => {
    void executeInvoiceAutomation("startup");
  }, startupDelayMs);

  invoiceAutomationTimer = setInterval(() => {
    void executeInvoiceAutomation("interval");
  }, intervalMs);

  invoiceAutomationTimer.unref?.();
}

export function stopInvoiceAutomationScheduler() {
  if (invoiceAutomationTimer) {
    clearInterval(invoiceAutomationTimer);
    invoiceAutomationTimer = null;
  }
}

export async function runInvoiceAutomationNow() {
  await executeInvoiceAutomation("interval");
}

export function startRideRequestReminderScheduler() {
  const reminderEnabled = isRideRequestReminderEnabled();
  const expiryEnabled = isRideRequestExpiryEnabled();
  const disruptionEnabled = isTripDisruptionRerouteEnabled();
  const escalationEnabled = isDispatchEscalationEnabled();

  if (!reminderEnabled && !expiryEnabled && !disruptionEnabled && !escalationEnabled) {
    console.log(
      "[Scheduler] Ride request jobs disabled (reminder, expiry, disruption reroute, and escalation are off).",
    );
    return;
  }

  const intervalMs = getRideRequestReminderIntervalMs();
  const startupDelayMs = getRideRequestReminderStartupDelayMs();

  console.log(
    `[Scheduler] Ride request jobs enabled (reminder=${reminderEnabled}, expiry=${expiryEnabled}, disruption=${disruptionEnabled}, escalation=${escalationEnabled}). First run in ${startupDelayMs}ms, then every ${intervalMs}ms.`,
  );

  setTimeout(() => {
    void executeRideRequestJobs("startup");
  }, startupDelayMs);

  rideRequestReminderTimer = setInterval(() => {
    void executeRideRequestJobs("interval");
  }, intervalMs);

  rideRequestReminderTimer.unref?.();
}

export function stopRideRequestReminderScheduler() {
  if (rideRequestReminderTimer) {
    clearInterval(rideRequestReminderTimer);
    rideRequestReminderTimer = null;
  }
}

export async function runRideRequestReminderNow() {
  await executeRideRequestJobs("interval");
}
