import type { InvoiceStatus, LatePaymentType } from "@smart-dispatch/types";

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toFee(value: number | string | { toString(): string } | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function utcCalendarDaysOverdue(dueAt: Date | null | undefined, now = new Date()) {
  if (!dueAt) return 0;
  const dueDay = Date.UTC(dueAt.getUTCFullYear(), dueAt.getUTCMonth(), dueAt.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((today - dueDay) / 86_400_000));
}

export function resolveLatePaymentPolicy(input: {
  latePaymentType?: LatePaymentType | null;
  latePaymentFee?: number | string | { toString(): string } | null;
  contract?: {
    latePaymentType?: LatePaymentType | null;
    latePaymentFee?: number | string | { toString(): string } | null;
  } | null;
}): { type: LatePaymentType; fee: number | null } {
  const invoiceType = input.latePaymentType ?? "none";
  if (invoiceType !== "none") {
    return { type: invoiceType, fee: toFee(input.latePaymentFee) };
  }

  return {
    type: input.contract?.latePaymentType ?? "none",
    fee: toFee(input.contract?.latePaymentFee),
  };
}

export function computeLatePaymentPenalty(input: {
  status: InvoiceStatus;
  dueAt: Date | null | undefined;
  totalAmount: number;
  latePaymentType: LatePaymentType;
  latePaymentFee: number | null;
  storedPenaltyAmount?: number | null;
  now?: Date;
}): {
  isOverdue: boolean;
  daysOverdue: number;
  penaltyAmount: number;
  amountDue: number;
} {
  const daysOverdue = utcCalendarDaysOverdue(input.dueAt, input.now);
  const totalAmount = roundMoney(input.totalAmount);

  if (input.status === "paid") {
    return {
      isOverdue: false,
      daysOverdue,
      penaltyAmount: roundMoney(input.storedPenaltyAmount ?? 0),
      amountDue: 0,
    };
  }

  if (input.status === "void") {
    return { isOverdue: false, daysOverdue: 0, penaltyAmount: 0, amountDue: 0 };
  }

  if (input.status !== "issued") {
    return { isOverdue: false, daysOverdue: 0, penaltyAmount: 0, amountDue: totalAmount };
  }

  const isOverdue = daysOverdue > 0;
  let penaltyAmount = 0;
  const fee = input.latePaymentFee;

  if (isOverdue && fee != null && fee > 0) {
    if (input.latePaymentType === "flat") {
      penaltyAmount = roundMoney(fee);
    } else if (input.latePaymentType === "percent") {
      penaltyAmount = roundMoney(totalAmount * (fee / 100));
    } else if (input.latePaymentType === "flat_per_day") {
      penaltyAmount = roundMoney(fee * daysOverdue);
    } else if (input.latePaymentType === "percent_per_day") {
      penaltyAmount = roundMoney(totalAmount * (fee / 100) * daysOverdue);
    }
  }

  return {
    isOverdue,
    daysOverdue,
    penaltyAmount,
    amountDue: roundMoney(totalAmount + penaltyAmount),
  };
}
