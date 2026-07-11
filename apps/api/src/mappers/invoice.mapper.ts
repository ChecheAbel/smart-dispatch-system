import type { Invoice, InvoiceLineItem, InvoiceStatus } from "@smart-dispatch/types";
import type { DbInvoice } from "../models/invoice.model";
import { formatContractDate } from "../models/contract.model";
import { parseFarePlanTranslationsMap } from "../types/fare-plan-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

function formatPersonName(person: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function pickFarePlanName(translations: unknown, locale?: string) {
  const map = parseFarePlanTranslationsMap(translations);
  const preferred = normalizeLocale(locale ?? DEFAULT_LOCALE);
  return (
    map[preferred]?.name ??
    map[DEFAULT_LOCALE]?.name ??
    Object.values(map)[0]?.name ??
    ""
  );
}

function toPublicLineItem(
  item: DbInvoice["lineItems"][number],
  options?: { locale?: string },
): InvoiceLineItem {
  return {
    id: item.id,
    ride_request_id: item.rideRequestId,
    description: item.description,
    quantity: item.quantity,
    unit_amount: Number(item.unitAmount),
    line_total: Number(item.lineTotal),
    fare_plan_id: item.farePlanId,
    fare_plan: item.farePlan
      ? {
          id: item.farePlan.id,
          slug: item.farePlan.slug,
          name: pickFarePlanName(item.farePlan.translations, options?.locale),
          pricing_model: item.farePlan.pricingModel,
        }
      : null,
    distance_km: item.distanceKm != null ? Number(item.distanceKm) : null,
    duration_minutes: item.durationMinutes,
    pricing_snapshot: item.pricingSnapshot as Record<string, unknown> | null,
    ride_request: {
      id: item.rideRequest.id,
      pickup_address: item.rideRequest.pickupAddress,
      dropoff_address: item.rideRequest.dropoffAddress,
      completed_at: item.rideRequest.completedAt?.toISOString() ?? null,
      status: item.rideRequest.status,
    },
    created_at: item.createdAt.toISOString(),
  };
}

export function toPublicInvoice(invoice: DbInvoice, options?: { locale?: string }): Invoice {
  const profile = invoice.requester.requesterProfile;

  return {
    id: invoice.id,
    reference_number: invoice.referenceNumber,
    status: invoice.status as InvoiceStatus,
    contract_id: invoice.contractId,
    contract: {
      id: invoice.contract.id,
      reference_number: invoice.contract.referenceNumber,
      title: invoice.contract.title,
      billing_interval: invoice.contract.billingInterval,
      payment_terms_days: invoice.contract.paymentTermsDays,
    },
    contract_enrollment_id: invoice.contractEnrollmentId,
    contract_enrollment: invoice.contractEnrollment
      ? {
          id: invoice.contractEnrollment.id,
          starts_at: formatContractDate(invoice.contractEnrollment.startsAt) ?? "",
          ends_at: formatContractDate(invoice.contractEnrollment.endsAt) ?? "",
        }
      : null,
    requester_user_id: invoice.requesterUserId,
    requester: {
      id: invoice.requester.id,
      name: formatPersonName(invoice.requester),
      email: invoice.requester.email,
      mobile_number: invoice.requester.mobileNumber,
      organization_name: profile?.organizationName ?? null,
      billing_contact_name: profile?.billingContactName ?? null,
      billing_contact_email: profile?.billingContactEmail ?? null,
    },
    period_start: formatContractDate(invoice.periodStart) ?? "",
    period_end: formatContractDate(invoice.periodEnd) ?? "",
    subtotal: Number(invoice.subtotal),
    total_amount: Number(invoice.totalAmount),
    currency: invoice.currency,
    payment_terms_days: invoice.paymentTermsDays,
    issued_at: invoice.issuedAt?.toISOString() ?? null,
    due_at: invoice.dueAt?.toISOString() ?? null,
    paid_at: invoice.paidAt?.toISOString() ?? null,
    voided_at: invoice.voidedAt?.toISOString() ?? null,
    notes: invoice.notes,
    line_items: invoice.lineItems.map((item) => toPublicLineItem(item, options)),
    line_item_count: invoice.lineItems.length,
    created_at: invoice.createdAt.toISOString(),
    updated_at: invoice.updatedAt.toISOString(),
  };
}

export function toPublicInvoices(invoices: DbInvoice[], options?: { locale?: string }) {
  return invoices.map((invoice) => toPublicInvoice(invoice, options));
}
