"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Receipt,
  RefreshCw,
  Route,
} from "lucide-react";
import type { CustomerInvoice, CustomerVisibleInvoiceStatus } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminEyebrowClass,
  adminHeadingClass,
} from "@/lib/admin-theme";
import { fetchMyInvoiceById } from "@/lib/customer-billing-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast } from "@/lib/toast";
import {
  formatMessage,
  getAdminContractsMessages,
  getCustomerContractsMessages,
  getCustomerInvoicesMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { USER_DASHBOARD_PATH, USER_MY_INVOICES_PATH } from "@/lib/auth-paths";

const STATUS_BADGE_CLASS: Record<CustomerVisibleInvoiceStatus, string> = {
  issued: adminBadgeGoldClass,
  paid: adminBadgeSuccessClass,
  void: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isInvoiceOverdue(invoice: CustomerInvoice) {
  if (invoice.status !== "issued" || !invoice.due_at) return false;
  const dueDate = invoice.due_at.includes("T")
    ? invoice.due_at.slice(0, 10)
    : invoice.due_at;
  const due = new Date(`${dueDate}T23:59:59.999Z`);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

export function CustomerInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const copy = getCustomerInvoicesMessages(locale);
  const contractCopy = getAdminContractsMessages(locale);
  const customerContractsCopy = getCustomerContractsMessages(locale);
  const canRead = usePermission(PERMISSIONS.customer.invoices);
  const [invoice, setInvoice] = useState<CustomerInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead || !params.id) return;

    let cancelled = false;

    async function loadInvoice() {
      setLoading(true);
      try {
        const result = await fetchMyInvoiceById(params.id, locale);
        if (!cancelled) setInvoice(result.invoice);
      } catch {
        if (!cancelled) {
          showErrorToast({
            title: copy.toast.loadFailed.title,
            description: copy.toast.loadFailed.description,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [canRead, copy.toast.loadFailed, locale, params.id]);

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} fallbackPath={USER_DASHBOARD_PATH} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-500">
        <Loader2 className="mr-2 size-4 animate-spin" />
        {copy.detail.loading}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-slate-500">{copy.detail.notFound}</p>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={USER_MY_INVOICES_PATH} />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          {copy.detail.back}
        </Button>
      </div>
    );
  }

  const overdue = isInvoiceOverdue(invoice);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-slate-600"
          render={<Link href={USER_MY_INVOICES_PATH} />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          {copy.detail.back}
        </Button>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#f8fafb] via-white to-[#C9B87A]/10 shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <p className={adminEyebrowClass}>{copy.eyebrow}</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}>
                  {invoice.reference_number}
                </h1>
                <Badge className={STATUS_BADGE_CLASS[invoice.status]}>
                  {copy.status[invoice.status]}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">{invoice.contract.title}</p>
              <p className="font-mono text-xs text-slate-500">
                {invoice.contract.reference_number}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {invoice.issued_at ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
                    <CalendarClock className="size-3 shrink-0 text-[#C9B87A]" />
                    {copy.detail.issuedTitle}: {formatDate(invoice.issued_at, locale)}
                  </span>
                ) : null}
                {invoice.status === "issued" && invoice.due_at ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                      overdue
                        ? "border-amber-200 bg-amber-50 font-medium text-amber-900"
                        : "border-slate-200/80 bg-white text-slate-600",
                    )}
                  >
                    <CalendarClock className="size-3 shrink-0 text-[#C9B87A]" />
                    {copy.detail.dueTitle}: {formatDate(invoice.due_at, locale)}
                  </span>
                ) : null}
                {invoice.paid_at ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
                    <CalendarClock className="size-3 shrink-0 text-emerald-600" />
                    {copy.detail.paidTitle}: {formatDate(invoice.paid_at, locale)}
                  </span>
                ) : null}
                {invoice.status === "void" && invoice.voided_at ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-800">
                    <CalendarClock className="size-3 shrink-0 text-red-600" />
                    {copy.detail.voidedTitle}: {formatDate(invoice.voided_at, locale)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-[#1C3A34]/10 bg-white/80 px-5 py-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {copy.detail.total}
              </p>
              <p
                className={cn(
                  "mt-1 text-3xl font-extrabold tabular-nums tracking-tight",
                  invoice.status === "paid"
                    ? "text-emerald-800"
                    : invoice.status === "void"
                      ? "text-red-800 line-through decoration-red-300/80"
                      : overdue
                        ? "text-amber-900"
                        : "text-[#1C3A34]",
                )}
              >
                {formatMoney(invoice.total_amount, invoice.currency, locale)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatMessage(copy.detail.tripsCount, { count: invoice.line_item_count })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            icon={FileText}
            title={copy.detail.contractTitle}
            description={copy.detail.contractDescription}
          />
        </div>

        <InvoiceContractDetails
          contractTitle={invoice.contract.title}
          contractReference={invoice.contract.reference_number}
          billingInterval={contractCopy.billingIntervals[invoice.contract.billing_interval]}
          billingPeriod={formatContractTermRange(
            { starts_at: invoice.period_start, ends_at: invoice.period_end },
            locale,
          )}
          enrollmentPeriod={
            invoice.contract_enrollment
              ? formatContractTermRange(invoice.contract_enrollment, locale)
              : null
          }
          paymentTerms={
            invoice.contract.billing_interval === "per_trip"
              ? customerContractsCopy.paymentTermsPerTrip
              : invoice.payment_terms_days
                ? formatMessage(copy.detail.paymentTermsValue, {
                    days: invoice.payment_terms_days,
                  })
                : "—"
          }
          labels={{
            agreement: copy.detail.contractAgreement,
            reference: copy.detail.contractReference,
            period: copy.detail.periodTitle,
            enrollmentPeriod: copy.detail.enrollmentPeriod,
            billingInterval: copy.detail.billingInterval,
            paymentTerms: copy.detail.paymentTermsTitle,
          }}
        />
      </section>

      {invoice.notes ? (
        <div className="rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {copy.detail.notesTitle}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {invoice.notes}
          </p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <SectionHeader
            icon={Route}
            title={copy.detail.lineItemsTitle}
            description={copy.detail.lineItemsDescription}
          />
          <Badge variant="outline" className="text-xs text-slate-600">
            {formatMessage(copy.detail.tripsCount, { count: invoice.line_items.length })}
          </Badge>
        </div>

        {invoice.line_items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">{copy.detail.noLineItems}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoice.line_items.map((item, index) => (
              <LineItemRow
                key={item.id}
                index={index + 1}
                description={item.description}
                pickup={item.ride_request.pickup_address}
                dropoff={item.ride_request.dropoff_address}
                amount={formatMoney(item.line_total, invoice.currency, locale)}
                tripLabel={copy.detail.lineItemTrip}
                amountLabel={copy.detail.lineItemAmount}
              />
            ))}
          </div>
        )}

        {invoice.line_items.length > 0 ? (
          <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-4">
            <div className="ml-auto flex max-w-xs flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{copy.detail.subtotal}</span>
                <span className="tabular-nums">
                  {formatMoney(invoice.subtotal, invoice.currency, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-[#1C3A34]">
                <span>{copy.detail.total}</span>
                <span
                  className={cn(
                    "text-base tabular-nums",
                    invoice.status === "paid"
                      ? "text-emerald-800"
                      : invoice.status === "void"
                        ? "text-red-800 line-through decoration-red-300/80"
                        : overdue
                          ? "text-amber-900"
                          : "text-[#1C3A34]",
                  )}
                >
                  {formatMoney(invoice.total_amount, invoice.currency, locale)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Receipt;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-[#1C3A34]">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

function InvoiceContractDetails({
  contractTitle,
  contractReference,
  billingInterval,
  billingPeriod,
  enrollmentPeriod,
  paymentTerms,
  labels,
}: {
  contractTitle: string;
  contractReference: string;
  billingInterval: string;
  billingPeriod: string;
  enrollmentPeriod: string | null;
  paymentTerms: string;
  labels: {
    agreement: string;
    reference: string;
    period: string;
    enrollmentPeriod: string;
    billingInterval: string;
    paymentTerms: string;
  };
}) {
  const detailRows = [
    {
      key: "period",
      icon: CalendarClock,
      label: labels.period,
      value: billingPeriod,
    },
    ...(enrollmentPeriod
      ? [
          {
            key: "enrollment",
            icon: FileText,
            label: labels.enrollmentPeriod,
            value: enrollmentPeriod,
          },
        ]
      : []),
    {
      key: "billing",
      icon: RefreshCw,
      label: labels.billingInterval,
      value: billingInterval,
    },
    {
      key: "payment",
      icon: CreditCard,
      label: labels.paymentTerms,
      value: paymentTerms,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-stretch">
      <div className="overflow-hidden rounded-xl border border-[#C9B87A]/30 bg-gradient-to-br from-[#C9B87A]/10 via-white to-[#1C3A34]/5 lg:w-[min(100%,22rem)] lg:shrink-0">
        <div className="flex h-full gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1C3A34]/10 text-[#1C3A34]">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {labels.agreement}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-[#1C3A34]">{contractTitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-[11px] font-semibold text-slate-600"
              >
                {contractReference}
              </Badge>
              <Badge
                variant="outline"
                className="border-[#C9B87A]/40 bg-[#C9B87A]/10 text-[11px] font-semibold text-[#6f5f2f]"
              >
                {billingInterval}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
        {detailRows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.key}
              className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {row.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{row.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineItemRow({
  index,
  description,
  pickup,
  dropoff,
  amount,
  tripLabel,
  amountLabel,
}: {
  index: number;
  description: string;
  pickup: string;
  dropoff: string;
  amount: string;
  tripLabel: string;
  amountLabel: string;
}) {
  return (
    <div className="flex gap-4 px-5 py-4 hover:bg-slate-50/60">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold tabular-nums text-slate-500">
        {index}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {tripLabel}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#1C3A34]">{description}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {amountLabel}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#1C3A34]">{amount}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3">
          <div className="flex gap-2.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#1C3A34]" />
            <p className="min-w-0 text-sm text-slate-700">{pickup}</p>
          </div>
          <div className="ml-1.5 h-3 w-px bg-gradient-to-b from-[#1C3A34]/30 to-[#C9B87A]/70" aria-hidden />
          <div className="flex gap-2.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#C9B87A]" />
            <p className="min-w-0 text-sm text-slate-700">{dropoff}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
