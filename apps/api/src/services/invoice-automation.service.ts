import type { InvoiceNotificationEvent } from "@smart-dispatch/types";
import { getUtcToday } from "../models/contract.model";
import {
  findDueSoonInvoices,
  findEndedEnrollmentsPendingInvoice,
  findOverdueInvoices,
  findUnbilledPerTripRides,
  wasInvoiceNotificationSent,
} from "../models/invoice.model";
import {
  generateInvoiceForEnrollment,
  generateInvoiceForTrip,
} from "./invoice-generation.service";
import {
  queueInvoiceNotifications,
  sendInvoiceNotifications,
} from "./notification-dispatch.service";

export type InvoiceAutomationResult = {
  enrollmentsChecked: number;
  enrollmentsInvoiced: number;
  perTripInvoiced: number;
  dueSoonNotified: number;
  overdueNotified: number;
  errors: string[];
};

function isAutomationError(error: unknown) {
  if (!(error instanceof Error)) {
    return true;
  }

  return ![
    "INVOICE_ALREADY_EXISTS",
    "NO_BILLABLE_TRIPS",
    "TRIP_ALREADY_INVOICED",
  ].includes(error.message);
}

async function processEndedEnrollmentInvoices(result: InvoiceAutomationResult) {
  const enrollments = await findEndedEnrollmentsPendingInvoice();
  result.enrollmentsChecked = enrollments.length;

  for (const enrollment of enrollments) {
    try {
      const invoice = await generateInvoiceForEnrollment({
        contractEnrollmentId: enrollment.id,
        issue: true,
        notes: "Auto-generated after billing period ended.",
      });

      result.enrollmentsInvoiced += 1;
      queueInvoiceNotifications("generated", invoice.id);
    } catch (error) {
      if (isAutomationError(error)) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown enrollment invoice error.";
        result.errors.push(`Enrollment ${enrollment.id}: ${message}`);
      }
    }
  }
}

async function processPerTripInvoices(result: InvoiceAutomationResult) {
  const rides = await findUnbilledPerTripRides();

  for (const ride of rides) {
    try {
      const invoice = await generateInvoiceForTrip(ride.id, { issue: true });
      result.perTripInvoiced += 1;
      queueInvoiceNotifications("generated", invoice.id);
    } catch (error) {
      if (isAutomationError(error)) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown per-trip invoice error.";
        result.errors.push(`Ride ${ride.id}: ${message}`);
      }
    }
  }
}

async function notifyInvoices(
  invoices: Awaited<ReturnType<typeof findDueSoonInvoices>>,
  event: InvoiceNotificationEvent,
  result: InvoiceAutomationResult,
  counterKey: "dueSoonNotified" | "overdueNotified",
) {
  for (const invoice of invoices) {
    const alreadySent = await wasInvoiceNotificationSent(invoice.id, event);
    if (alreadySent) {
      continue;
    }

    try {
      await sendInvoiceNotifications(event, invoice.id);
      result[counterKey] += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown invoice reminder error.";
      result.errors.push(`Invoice ${invoice.referenceNumber}: ${message}`);
    }
  }
}

export async function runInvoiceAutomation(): Promise<InvoiceAutomationResult> {
  const result: InvoiceAutomationResult = {
    enrollmentsChecked: 0,
    enrollmentsInvoiced: 0,
    perTripInvoiced: 0,
    dueSoonNotified: 0,
    overdueNotified: 0,
    errors: [],
  };

  await processEndedEnrollmentInvoices(result);
  await processPerTripInvoices(result);

  const dueSoonInvoices = await findDueSoonInvoices();
  await notifyInvoices(dueSoonInvoices, "due_soon", result, "dueSoonNotified");

  const overdueInvoices = await findOverdueInvoices();
  await notifyInvoices(overdueInvoices, "overdue", result, "overdueNotified");

  return result;
}

export async function tryAutoInvoiceCompletedTrip(rideRequestId: string) {
  const rides = await findUnbilledPerTripRides(rideRequestId);
  const ride = rides[0];
  if (!ride) {
    return null;
  }

  try {
    const invoice = await generateInvoiceForTrip(ride.id, { issue: true });
    queueInvoiceNotifications("generated", invoice.id);
    return invoice;
  } catch (error) {
    if (isAutomationError(error)) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown per-trip invoice error.";
      console.error(
        `[InvoiceAutomation] Failed to auto-invoice trip ${ride.id}: ${message}`,
      );
    }

    return null;
  }
}

export function isInvoiceAutomationEnabled() {
  return process.env.INVOICE_AUTOMATION_ENABLED !== "false";
}

export function getInvoiceAutomationIntervalMs() {
  const parsed = Number.parseInt(
    process.env.INVOICE_AUTOMATION_INTERVAL_MS ?? "3600000",
    10,
  );
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : 3_600_000;
}

export function getInvoiceAutomationStartupDelayMs() {
  const parsed = Number.parseInt(
    process.env.INVOICE_AUTOMATION_STARTUP_DELAY_MS ?? "30000",
    10,
  );
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30_000;
}

export function formatInvoiceAutomationSummary(
  result: InvoiceAutomationResult,
) {
  const today = getUtcToday().toISOString().slice(0, 10);
  return `[InvoiceAutomation ${today}] enrollments=${result.enrollmentsInvoiced}/${result.enrollmentsChecked}, per_trip=${result.perTripInvoiced}, due_soon=${result.dueSoonNotified}, overdue=${result.overdueNotified}, errors=${result.errors.length}`;
}
