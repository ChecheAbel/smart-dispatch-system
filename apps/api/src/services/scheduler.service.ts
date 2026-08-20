import {
  formatInvoiceAutomationSummary,
  getInvoiceAutomationIntervalMs,
  getInvoiceAutomationStartupDelayMs,
  isInvoiceAutomationEnabled,
  runInvoiceAutomation,
} from "./invoice-automation.service";
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
  if (!isRideRequestReminderEnabled()) {
    console.log(
      "[Scheduler] Ride request reminder disabled (RIDE_REQUEST_REMINDER_ENABLED=false).",
    );
    return;
  }

  const intervalMs = getRideRequestReminderIntervalMs();
  const startupDelayMs = getRideRequestReminderStartupDelayMs();

  console.log(
    `[Scheduler] Ride request reminder enabled. First run in ${startupDelayMs}ms, then every ${intervalMs}ms.`,
  );

  setTimeout(() => {
    void executeRideRequestReminder("startup");
  }, startupDelayMs);

  rideRequestReminderTimer = setInterval(() => {
    void executeRideRequestReminder("interval");
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
  await executeRideRequestReminder("interval");
}
