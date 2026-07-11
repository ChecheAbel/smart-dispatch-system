import type {
  CustomerContractEnrollment,
  CustomerInvoice,
  CustomerInvoiceSummary,
  CustomerVisibleInvoiceStatus,
  InvoiceStatus,
} from "@smart-dispatch/types";
import type { DbCustomerContractEnrollment } from "../models/contract-enrollment.model";
import type { DbInvoice } from "../models/invoice.model";
import { formatContractDate } from "../models/contract.model";
import { toPublicInvoice } from "./invoice.mapper";

function toCustomerVisibleStatus(status: InvoiceStatus): CustomerVisibleInvoiceStatus {
  return status as CustomerVisibleInvoiceStatus;
}

function toCustomerInvoiceSummary(
  invoice: DbCustomerContractEnrollment["invoices"][number],
): CustomerInvoiceSummary {
  return {
    id: invoice.id,
    reference_number: invoice.referenceNumber,
    status: toCustomerVisibleStatus(invoice.status),
    total_amount: Number(invoice.totalAmount),
    currency: invoice.currency,
    due_at: invoice.dueAt?.toISOString() ?? null,
    paid_at: invoice.paidAt?.toISOString() ?? null,
    issued_at: invoice.issuedAt?.toISOString() ?? null,
  };
}

export function toCustomerContractEnrollment(
  enrollment: DbCustomerContractEnrollment,
): CustomerContractEnrollment {
  const latestInvoice = enrollment.invoices[0] ?? null;

  return {
    id: enrollment.id,
    starts_at: formatContractDate(enrollment.startsAt) ?? "",
    ends_at: formatContractDate(enrollment.endsAt) ?? "",
    created_at: enrollment.createdAt.toISOString(),
    contract: {
      id: enrollment.contract.id,
      reference_number: enrollment.contract.referenceNumber,
      title: enrollment.contract.title,
      status: enrollment.contract.status,
      billing_interval: enrollment.contract.billingInterval,
      payment_terms_days: enrollment.contract.paymentTermsDays,
    },
    invoice: latestInvoice ? toCustomerInvoiceSummary(latestInvoice) : null,
  };
}

export function toCustomerContractEnrollments(enrollments: DbCustomerContractEnrollment[]) {
  return enrollments.map((enrollment) => toCustomerContractEnrollment(enrollment));
}

export function toCustomerInvoice(invoice: DbInvoice, options?: { locale?: string }): CustomerInvoice {
  const publicInvoice = toPublicInvoice(invoice, options);

  return {
    id: publicInvoice.id,
    reference_number: publicInvoice.reference_number,
    status: toCustomerVisibleStatus(publicInvoice.status),
    contract: publicInvoice.contract,
    contract_enrollment: publicInvoice.contract_enrollment,
    period_start: publicInvoice.period_start,
    period_end: publicInvoice.period_end,
    subtotal: publicInvoice.subtotal,
    total_amount: publicInvoice.total_amount,
    currency: publicInvoice.currency,
    payment_terms_days: publicInvoice.payment_terms_days,
    issued_at: publicInvoice.issued_at,
    due_at: publicInvoice.due_at,
    paid_at: publicInvoice.paid_at,
    voided_at: publicInvoice.voided_at,
    notes: publicInvoice.notes,
    line_items: publicInvoice.line_items,
    line_item_count: publicInvoice.line_item_count,
    created_at: publicInvoice.created_at,
  };
}

export function toCustomerInvoices(invoices: DbInvoice[], options?: { locale?: string }) {
  return invoices.map((invoice) => toCustomerInvoice(invoice, options));
}
