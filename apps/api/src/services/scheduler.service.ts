import {
  formatInvoiceAutomationSummary,
  getInvoiceAutomationIntervalMs,
  getInvoiceAutomationStartupDelayMs,
  isInvoiceAutomationEnabled,
  runInvoiceAutomation,
} from "./invoice-automation.service";

let invoiceAutomationTimer: NodeJS.Timeout | null = null;
let invoiceAutomationRunning = false;

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
