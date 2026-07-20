import type { ContractBillingInterval } from "@smart-dispatch/types";
import {
  createInvoice,
  findContractEnrollmentById,
  findUnbilledContractTrips,
  generateInvoiceReferenceNumber,
  invoiceExistsForEnrollmentPeriod,
} from "../models/invoice.model";
import {
  buildLineItemDescription,
  computeTripBillingSnapshot,
  ensureTripBillingSnapshot,
} from "../services/trip-billing.service";
import {
  ensureContractEnrollment,
  findEnrollmentCoveringTrip,
} from "../models/contract-enrollment.model";

export type GenerateInvoiceOptions = {
  contractEnrollmentId: string;
  issue?: boolean;
  notes?: string | null;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function assertBillingIntervalSupportsPeriod(
  billingInterval: ContractBillingInterval,
  tripCount: number,
) {
  if (billingInterval === "per_trip" && tripCount > 1) {
    throw new Error("PER_TRIP_SINGLE_INVOICE");
  }
}

export async function generateInvoiceForEnrollment(options: GenerateInvoiceOptions) {
  const enrollment = await findContractEnrollmentById(options.contractEnrollmentId);
  if (!enrollment) {
    throw new Error("ENROLLMENT_NOT_FOUND");
  }

  const contract = enrollment.contract;
  const periodStart = enrollment.startsAt;
  const periodEnd = enrollment.endsAt;

  const existing = await invoiceExistsForEnrollmentPeriod(
    enrollment.id,
    periodStart,
    periodEnd,
  );
  if (existing) {
    throw new Error("INVOICE_ALREADY_EXISTS");
  }

  const trips = await findUnbilledContractTrips({
    contractId: contract.id,
    requesterUserId: enrollment.requesterUserId,
    periodStart,
    periodEnd,
  });

  if (trips.length === 0) {
    throw new Error("NO_BILLABLE_TRIPS");
  }

  assertBillingIntervalSupportsPeriod(
    contract.billingInterval as ContractBillingInterval,
    trips.length,
  );

  const lineItems = [];
  let currency = contract.farePlan?.currency ?? "ETB";

  for (const trip of trips) {
    const snapshot =
      (await ensureTripBillingSnapshot(trip.id)) ??
      (await computeTripBillingSnapshot(trip, contract.farePlanId));

    if (!snapshot) {
      throw new Error("FARE_PLAN_NOT_FOUND");
    }

    currency = snapshot.billableCurrency;

    lineItems.push({
      rideRequestId: trip.id,
      description: buildLineItemDescription(trip),
      unitAmount: snapshot.billableAmount,
      lineTotal: snapshot.billableAmount,
      farePlanId: snapshot.farePlanId,
      distanceKm: snapshot.distanceKm,
      durationMinutes: snapshot.durationMinutes,
      pricingSnapshot: snapshot.pricingSnapshot,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalAmount = Math.round(subtotal * 100) / 100;
  const paymentTermsDays = contract.paymentTermsDays;
  const issuedAt = options.issue ? new Date() : null;
  const dueAt =
    options.issue && paymentTermsDays != null ? addDays(issuedAt!, paymentTermsDays) : null;

  const referenceNumber = await generateInvoiceReferenceNumber();

  return createInvoice({
    referenceNumber,
    contractId: contract.id,
    contractEnrollmentId: enrollment.id,
    requesterUserId: enrollment.requesterUserId,
    periodStart,
    periodEnd,
    subtotal,
    totalAmount,
    currency,
    paymentTermsDays,
    issuedAt,
    dueAt,
    status: options.issue ? "issued" : "draft",
    notes: options.notes ?? null,
    lineItems,
  });
}

export async function generateInvoiceForTrip(rideRequestId: string, options?: { issue?: boolean }) {
  const { prisma } = await import("../db/prisma");
  const ride = await prisma.rideRequest.findUnique({
    where: { id: rideRequestId },
    include: {
      contract: {
        include: {
          farePlan: true,
        },
      },
      invoiceLineItem: true,
    },
  });

  if (!ride || ride.status !== "completed" || !ride.contractId || !ride.contract) {
    throw new Error("TRIP_NOT_BILLABLE");
  }

  if (ride.invoiceLineItem) {
    throw new Error("TRIP_ALREADY_INVOICED");
  }

  const contract = ride.contract;
  if (contract.billingInterval !== "per_trip") {
    throw new Error("CONTRACT_NOT_PER_TRIP");
  }

  const snapshot =
    (await ensureTripBillingSnapshot(ride.id)) ??
    (await computeTripBillingSnapshot(ride, contract.farePlanId));

  if (!snapshot) {
    throw new Error("FARE_PLAN_NOT_FOUND");
  }

  const completedDay = ride.completedAt ?? new Date();
  const periodStart = new Date(
    Date.UTC(completedDay.getUTCFullYear(), completedDay.getUTCMonth(), completedDay.getUTCDate()),
  );
  const periodEnd = periodStart;

  let enrollment =
    (await findEnrollmentCoveringTrip(contract.id, ride.requesterUserId, completedDay)) ??
    (await ensureContractEnrollment({
      contractId: contract.id,
      requesterUserId: ride.requesterUserId,
      scheduledAt: ride.scheduledAt,
      billingInterval: contract.billingInterval as ContractBillingInterval,
    }));

  const paymentTermsDays = contract.paymentTermsDays;
  const issuedAt = options?.issue ? new Date() : null;
  const dueAt =
    options?.issue && paymentTermsDays != null ? addDays(issuedAt!, paymentTermsDays) : null;

  const referenceNumber = await generateInvoiceReferenceNumber();

  return createInvoice({
    referenceNumber,
    contractId: contract.id,
    contractEnrollmentId: enrollment.id,
    requesterUserId: ride.requesterUserId,
    periodStart,
    periodEnd,
    subtotal: snapshot.billableAmount,
    totalAmount: snapshot.billableAmount,
    currency: snapshot.billableCurrency,
    paymentTermsDays,
    issuedAt,
    dueAt,
    status: options?.issue ? "issued" : "draft",
    lineItems: [
      {
        rideRequestId: ride.id,
        description: buildLineItemDescription(ride),
        unitAmount: snapshot.billableAmount,
        lineTotal: snapshot.billableAmount,
        farePlanId: snapshot.farePlanId,
        distanceKm: snapshot.distanceKm,
        durationMinutes: snapshot.durationMinutes,
        pricingSnapshot: snapshot.pricingSnapshot,
      },
    ],
  });
}

export async function issueInvoice(invoiceId: string) {
  const { findInvoiceById, updateInvoiceStatus } = await import("../models/invoice.model");
  const invoice = await findInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  if (invoice.status !== "draft") {
    throw new Error("INVOICE_NOT_DRAFT");
  }

  const issuedAt = new Date();
  const dueAt =
    invoice.paymentTermsDays != null ? addDays(issuedAt, invoice.paymentTermsDays) : null;

  return updateInvoiceStatus(invoice.id, "issued", { issuedAt, dueAt });
}

export async function markInvoicePaid(invoiceId: string) {
  const { findInvoiceById, updateInvoiceStatus } = await import("../models/invoice.model");
  const invoice = await findInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  if (invoice.status !== "issued") {
    throw new Error("INVOICE_NOT_ISSUED");
  }

  return updateInvoiceStatus(invoice.id, "paid", { paidAt: new Date() });
}

export async function markInvoicePaidForRequester(invoiceId: string, requesterUserId: string) {
  const { findInvoiceForRequester } = await import("../models/invoice.model");
  const invoice = await findInvoiceForRequester(invoiceId, requesterUserId);
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  return markInvoicePaid(invoiceId);
}

export async function voidInvoice(invoiceId: string) {
  const { findInvoiceById, updateInvoiceStatus } = await import("../models/invoice.model");
  const invoice = await findInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  if (invoice.status === "paid" || invoice.status === "void") {
    throw new Error("INVOICE_NOT_VOIDABLE");
  }

  return updateInvoiceStatus(invoice.id, "void", { voidedAt: new Date() });
}
