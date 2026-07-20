"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Receipt } from "lucide-react";
import type { CustomerInvoice, CustomerVisibleInvoiceStatus } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { fetchMyInvoiceById } from "@/lib/customer-billing-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast } from "@/lib/toast";
import {
  formatMessage,
  getAdminContractsMessages,
  getCustomerContractsMessages,
  getCustomerInvoicesMessages,
  getCustomerRequestsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import {
  buildInvoiceTripDetailsLabels,
  InvoiceLineItemTripDetails,
} from "@/components/billing/invoice-line-item-trip-details";
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
  const dueDate = invoice.due_at.includes("T") ? invoice.due_at.slice(0, 10) : invoice.due_at;
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
      <div className="space-y-4">
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
  const requestCopy = getCustomerRequestsMessages(locale as "en" | "am");
  const tripDetailLabels = buildInvoiceTripDetailsLabels(copy.detail, requestCopy.status);

  const paymentTerms =
    invoice.contract.billing_interval === "per_trip"
      ? customerContractsCopy.paymentTermsPerTrip
      : invoice.payment_terms_days
        ? formatMessage(copy.detail.paymentTermsValue, { days: invoice.payment_terms_days })
        : "—";

  const billingPeriod = formatContractTermRange(
    { starts_at: invoice.period_start, ends_at: invoice.period_end },
    locale,
  );

  const enrollmentPeriod = invoice.contract_enrollment
    ? formatContractTermRange(invoice.contract_enrollment, locale)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
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
          <div>
            <p className={adminEyebrowClass}>{copy.eyebrow}</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className={adminHeadingClass}>{invoice.reference_number}</h1>
              <Badge className={STATUS_BADGE_CLASS[invoice.status]}>
                {copy.status[invoice.status]}
              </Badge>
              {overdue ? (
                <Badge className="border-amber-200 bg-amber-50 text-amber-900">
                  {copy.detail.milestoneOverdue}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {invoice.contract.title} · {invoice.contract.reference_number}
            </p>
          </div>
        </div>
      </div>

      {overdue ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.detail.overdueNotice}
        </p>
      ) : null}
      {invoice.status === "void" ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800">
          {copy.detail.voidNotice}
        </p>
      ) : null}

      <section className={cn(adminCardClass, "space-y-4 p-5")}>
        <SectionHeader
          icon={Receipt}
          title={copy.detail.summaryTitle}
          description={copy.detail.summaryDescription}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickFact
            label={copy.detail.contractAgreement}
            value={invoice.contract.reference_number}
            hint={invoice.contract.title}
          />
          <QuickFact label={copy.detail.periodTitle} value={billingPeriod} />
          {enrollmentPeriod ? (
            <QuickFact label={copy.detail.enrollmentPeriod} value={enrollmentPeriod} />
          ) : null}
          <QuickFact
            label={copy.detail.billingInterval}
            value={contractCopy.billingIntervals[invoice.contract.billing_interval]}
          />
          <QuickFact label={copy.detail.paymentTermsTitle} value={paymentTerms} />
          <QuickFact
            label={copy.detail.subtotal}
            value={formatMoney(invoice.subtotal, invoice.currency, locale)}
          />
          <QuickFact
            label={copy.detail.total}
            value={formatMoney(invoice.total_amount, invoice.currency, locale)}
            valueClassName={cn(
              invoice.status === "paid" && "text-emerald-800",
              invoice.status === "void" && "text-red-800 line-through decoration-red-300/80",
              overdue && invoice.status === "issued" && "text-amber-900",
            )}
          />
          <QuickFact label={copy.detail.issuedTitle} value={formatDate(invoice.issued_at, locale)} />
          <QuickFact label={copy.detail.dueTitle} value={formatDate(invoice.due_at, locale)} />
          {invoice.paid_at ? (
            <QuickFact label={copy.detail.paidTitle} value={formatDate(invoice.paid_at, locale)} />
          ) : null}
          {invoice.status === "void" && invoice.voided_at ? (
            <QuickFact
              label={copy.detail.voidedTitle}
              value={formatDate(invoice.voided_at, locale)}
            />
          ) : null}
          <QuickFact
            label={copy.detail.lineItemsTitle}
            value={formatMessage(copy.detail.tripsCount, { count: invoice.line_item_count })}
          />
        </div>
      </section>

      {invoice.notes ? (
        <section className={cn(adminCardClass, "space-y-3 p-5")}>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            {copy.detail.notesTitle}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{invoice.notes}</p>
        </section>
      ) : null}

      <section className={cn(adminCardClass, "overflow-hidden")}>
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            icon={FileText}
            title={copy.detail.lineItemsTitle}
            description={copy.detail.lineItemsDescription}
          />
        </div>
        {invoice.line_items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">{copy.detail.noLineItems}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoice.line_items.map((item, index) => (
              <div key={item.id} className="space-y-4 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {copy.detail.lineItemsTitle} {index + 1}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1C3A34]">{item.description}</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-[#1C3A34]">
                    {formatMoney(item.line_total, invoice.currency, locale)}
                  </p>
                </div>
                <InvoiceLineItemTripDetails
                  item={item}
                  locale={locale}
                  labels={tripDetailLabels}
                  showBillingMetrics
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={adminIconBoxClass}>
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className={cn("text-base", adminHeadingClass)}>{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function QuickFact({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-semibold text-slate-800", valueClassName)}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
