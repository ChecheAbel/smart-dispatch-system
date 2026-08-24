import type {
  CustomerContractEnrollment,
  CustomerInvoice,
  CustomerInvoiceSummary,
  CustomerVisibleInvoiceStatus,
  InvoiceStatus,
  LatePaymentType,
} from "@smart-dispatch/types";
import type { DbCustomerContractEnrollment } from "../models/contract-enrollment.model";
import type { DbInvoice } from "../models/invoice.model";
import { formatContractDate } from "../models/contract.model";
import { toPublicInvoice } from "./invoice.mapper";
import {
  computeLatePaymentPenalty,
  resolveLatePaymentPolicy,
} from "../services/invoice-penalty.service";

function toCustomerVisibleStatus(status: InvoiceStatus): CustomerVisibleInvoiceStatus {
  return status as CustomerVisibleInvoiceStatus;
}

function toCustomerInvoiceSummary(
  invoice: DbCustomerContractEnrollment["invoices"][number],
  contract: DbCustomerContractEnrollment["contract"],
): CustomerInvoiceSummary {
  const policy = resolveLatePaymentPolicy({
    latePaymentType: invoice.latePaymentType as LatePaymentType,
    latePaymentFee: invoice.latePaymentFee,
    contract: {
      latePaymentType: contract.latePaymentType as LatePaymentType,
      latePaymentFee: contract.latePaymentFee,
    },
  });
  const computed = computeLatePaymentPenalty({
    status: invoice.status as InvoiceStatus,
    dueAt: invoice.dueAt,
    totalAmount: Number(invoice.totalAmount),
    latePaymentType: policy.type,
    latePaymentFee: policy.fee,
    storedPenaltyAmount: Number(invoice.penaltyAmount),
  });

  return {
    id: invoice.id,
    reference_number: invoice.referenceNumber,
    status: toCustomerVisibleStatus(invoice.status),
    total_amount: Number(invoice.totalAmount),
    currency: invoice.currency,
    due_at: invoice.dueAt?.toISOString() ?? null,
    paid_at: invoice.paidAt?.toISOString() ?? null,
    issued_at: invoice.issuedAt?.toISOString() ?? null,
    is_overdue: computed.isOverdue,
    penalty_amount: computed.penaltyAmount,
    amount_due: computed.amountDue,
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
      late_payment_type: enrollment.contract.latePaymentType,
      late_payment_fee:
        enrollment.contract.latePaymentFee != null
          ? Number(enrollment.contract.latePaymentFee)
          : null,
    },
    invoice: latestInvoice
      ? toCustomerInvoiceSummary(latestInvoice, enrollment.contract)
      : null,
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
    vat_rate: publicInvoice.vat_rate,
    vat_amount: publicInvoice.vat_amount,
    total_amount: publicInvoice.total_amount,
    currency: publicInvoice.currency,
    payment_terms_days: publicInvoice.payment_terms_days,
    late_payment_type: publicInvoice.late_payment_type,
    late_payment_fee: publicInvoice.late_payment_fee,
    is_overdue: publicInvoice.is_overdue,
    days_overdue: publicInvoice.days_overdue,
    penalty_amount: publicInvoice.penalty_amount,
    amount_due: publicInvoice.amount_due,
    issued_at: publicInvoice.issued_at,
    due_at: publicInvoice.due_at,
    paid_at: publicInvoice.paid_at,
    payment_method: publicInvoice.payment_method,
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
