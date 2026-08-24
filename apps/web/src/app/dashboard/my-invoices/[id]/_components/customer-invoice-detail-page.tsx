"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, Loader2, Printer, TriangleAlert, WalletCards } from "lucide-react";
import type { CustomerInvoice, CustomerVisibleInvoiceStatus, InvoicePaymentMethod, User } from "@smart-dispatch/types";
import { isDailyLatePaymentType } from "@smart-dispatch/types";
import { useAuth, useBranding, useLocale, usePermission } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import BrandLogo from "@/components/landing/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { adminBadgeGoldClass, adminBadgeSuccessClass } from "@/lib/admin-theme";
import { fetchMyInvoiceById } from "@/lib/customer-billing-api";
import { formatWebsiteLabel, normalizeWebsiteHref } from "@/lib/branding";
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
import { InvoicePaymentSection } from "@/components/billing/invoice-payment-section";
import { USER_DASHBOARD_PATH, USER_MY_INVOICES_PATH } from "@/lib/auth-paths";

const STATUS_BADGE_CLASS: Record<CustomerVisibleInvoiceStatus, string> = {
  issued: adminBadgeGoldClass,
  paid: adminBadgeSuccessClass,
  void: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/35 dark:bg-red-400/14 dark:text-red-200",
};

const PAYMENT_METHOD_LOGOS: Record<string, string> = {
  telebirr: "/providers/telebirr.webp",
  cbe_birr: "/providers/cbe-birr.webp",
};

function formatDate(value: string | null, locale: string) {
  if (!value) return "";
  const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function customerDisplayName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ").trim();
}

export function CustomerInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { branding } = useBranding();
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

  const overdue = invoice.is_overdue;
  const requestCopy = getCustomerRequestsMessages(locale as "en" | "am");
  const tripDetailLabels = buildInvoiceTripDetailsLabels(copy.detail, requestCopy.status);
  const showPayment = invoice.status === "issued";

  const paymentTerms =
    invoice.contract.billing_interval === "per_trip"
      ? customerContractsCopy.paymentTermsPerTrip
      : invoice.payment_terms_days
        ? formatMessage(copy.detail.paymentTermsValue, { days: invoice.payment_terms_days })
        : "";

  const billingPeriod = formatContractTermRange(
    { starts_at: invoice.period_start, ends_at: invoice.period_end },
    locale,
  );

  const enrollmentPeriod = invoice.contract_enrollment
    ? formatContractTermRange(invoice.contract_enrollment, locale)
    : null;

  const billToName =
    user.requester_profile?.billing_contact_name?.trim() || customerDisplayName(user);
  const billToOrg = user.requester_profile?.organization_name?.trim() || null;
  const billToEmail = user.requester_profile?.billing_contact_email?.trim() || user.email;
  const amountDueLabel =
    invoice.status === "issued" ? copy.detail.amountDue : copy.detail.total;
  const amountDueValue =
    invoice.status === "paid"
      ? invoice.total_amount + invoice.penalty_amount
      : invoice.status === "issued"
        ? invoice.amount_due
        : invoice.total_amount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
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
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          {copy.detail.print}
        </Button>
      </div>

      {overdue ? (
        <OverdueBanner
          copy={copy}
          daysOverdue={invoice.days_overdue}
          penaltyAmount={invoice.penalty_amount}
          amountDue={invoice.amount_due}
          currency={invoice.currency}
          locale={locale}
          accruesDaily={isDailyLatePaymentType(invoice.late_payment_type)}
        />
      ) : null}
      {invoice.status === "void" ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 print:hidden dark:border-red-400/30 dark:bg-red-400/10"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-300" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">{copy.detail.voidBannerTitle}</p>
            <p className="mt-0.5 text-sm text-red-800/90 dark:text-red-100/80">{copy.detail.voidNotice}</p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          showPayment && "xl:grid xl:grid-cols-[minmax(0,1fr)_20.5rem] xl:items-start xl:gap-6",
        )}
      >
        <article className="relative overflow-hidden rounded-sm border border-slate-200/90 bg-white shadow-[0_24px_48px_-20px_rgba(28,58,52,0.18)] dark:border-border dark:bg-card print:max-w-none print:shadow-none">
          <div
            className="h-1.5 bg-[linear-gradient(90deg,var(--brand-primary)_0%,var(--brand-accent)_55%,var(--brand-primary)_100%)]"
            aria-hidden
          />

          {invoice.status === "paid" || invoice.status === "void" || overdue ? (
            <InvoiceStamp
              label={
                invoice.status === "paid"
                  ? copy.status.paid
                  : invoice.status === "void"
                    ? copy.status.void
                    : copy.detail.milestoneOverdue
              }
              tone={invoice.status === "paid" ? "paid" : invoice.status === "void" ? "void" : "overdue"}
            />
          ) : null}

          <div className="space-y-8 px-5 py-7 sm:px-8 sm:py-9">
            <header className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 space-y-3">
                <BrandLogo className="h-11 sm:h-12" />
                <div className="space-y-0.5 text-sm text-slate-600 dark:text-muted-foreground">
                  <p className="font-semibold text-[var(--brand-primary)] dark:text-foreground">
                    {branding.company_name}
                  </p>
                  {branding.product_name ? <p>{branding.product_name}</p> : null}
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[11px] font-bold tracking-[0.22em] text-[var(--brand-accent)] uppercase">
                  {copy.eyebrow}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl dark:text-foreground">
                  {copy.detail.documentTitle}
                </h1>
                <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-slate-700 dark:text-foreground">
                  {invoice.reference_number}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Badge className={STATUS_BADGE_CLASS[invoice.status]}>{copy.status[invoice.status]}</Badge>
                  {overdue ? (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/35 dark:bg-amber-400/14 dark:text-amber-100">
                      {copy.detail.milestoneOverdue}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="grid gap-6 border-y border-slate-100 py-6 sm:grid-cols-2 dark:border-border">
              <AddressBlock label={copy.detail.fromLabel}>
                <p className="font-semibold text-slate-900 dark:text-foreground">{branding.company_name}</p>
                {branding.support_email ? <p>{branding.support_email}</p> : null}
                {branding.support_phone ? <p>{branding.support_phone}</p> : null}
                {branding.website_url ? (
                  <a
                    href={normalizeWebsiteHref(branding.website_url)}
                    className="text-[var(--brand-primary)] underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {formatWebsiteLabel(branding.website_url)}
                  </a>
                ) : null}
              </AddressBlock>
              <AddressBlock label={copy.detail.billToLabel}>
                {billToOrg ? (
                  <p className="font-semibold text-slate-900 dark:text-foreground">{billToOrg}</p>
                ) : null}
                <p className={cn(!billToOrg && "font-semibold text-slate-900 dark:text-foreground")}>
                  {billToName}
                </p>
                <p>{billToEmail}</p>
                {user.mobile_number ? <p>{user.mobile_number}</p> : null}
                {user.requester_profile?.organization_address ? (
                  <p>{user.requester_profile.organization_address}</p>
                ) : null}
                {user.requester_profile?.tax_id ? <p>{user.requester_profile.tax_id}</p> : null}
              </AddressBlock>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetaField label={copy.detail.issuedTitle} value={formatDate(invoice.issued_at, locale)} />
              <MetaField label={copy.detail.dueTitle} value={formatDate(invoice.due_at, locale)} />
              <MetaField label={copy.detail.periodTitle} value={billingPeriod} />
              <MetaField
                label={copy.detail.paymentTermsTitle}
                value={paymentTerms}
              />
              <MetaField
                label={copy.detail.contractAgreement}
                value={invoice.contract.reference_number}
                hint={invoice.contract.title}
              />
              <MetaField
                label={copy.detail.billingInterval}
                value={contractCopy.billingIntervals[invoice.contract.billing_interval]}
              />
              {enrollmentPeriod ? (
                <MetaField label={copy.detail.enrollmentPeriod} value={enrollmentPeriod} />
              ) : null}
              {invoice.paid_at ? (
                <MetaField label={copy.detail.paidTitle} value={formatDate(invoice.paid_at, locale)} />
              ) : null}
              {invoice.status === "paid" ? (
                <PaymentMethodField
                  label={copy.detail.paymentMethodTitle}
                  method={invoice.payment_method}
                  value={
                    invoice.payment_method
                      ? (copy.detail.paymentMethods as Record<string, string>)[invoice.payment_method] ??
                        invoice.payment_method
                      : copy.detail.paymentMethods.notRecorded
                  }
                />
              ) : null}
              {invoice.status === "void" && invoice.voided_at ? (
                <MetaField label={copy.detail.voidedTitle} value={formatDate(invoice.voided_at, locale)} />
              ) : null}
            </dl>

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">
                  {copy.detail.lineItemsTitle}
                </h2>
                <p className="text-xs text-slate-500">
                  {formatMessage(copy.detail.tripsCount, { count: invoice.line_item_count })}
                </p>
              </div>

              {invoice.line_items.length === 0 ? (
                <p className="border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-border">
                  {copy.detail.noLineItems}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left dark:border-border">
                        <th className="w-10 py-2 pr-3 text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                          #
                        </th>
                        <th className="py-2 pr-3 text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                          {copy.detail.lineItemTrip}
                        </th>
                        <th className="w-16 py-2 pr-3 text-right text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                          {copy.detail.qtyColumn}
                        </th>
                        <th className="w-36 py-2 text-right text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                          {copy.detail.lineItemAmount}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items.map((item, index) => (
                        <InvoiceLineRow
                          key={item.id}
                          index={index}
                          description={item.description}
                          quantity={item.quantity}
                          amount={formatMoney(item.line_total, invoice.currency, locale)}
                          details={
                            <InvoiceLineItemTripDetails
                              item={item}
                              locale={locale}
                              labels={tripDetailLabels}
                              showBillingMetrics
                            />
                          }
                          viewDetailsLabel={copy.detail.viewTripDetails}
                          hideDetailsLabel={copy.detail.hideTripDetails}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <dl className="w-full max-w-sm space-y-2.5">
                <TotalsRow
                  label={copy.detail.subtotal}
                  value={formatMoney(invoice.subtotal, invoice.currency, locale)}
                />
                {invoice.vat_rate > 0 ? (
                  <TotalsRow
                    label={formatMessage(copy.detail.vat, { rate: invoice.vat_rate })}
                    value={formatMoney(invoice.vat_amount, invoice.currency, locale)}
                  />
                ) : null}
                {invoice.penalty_amount > 0 ? (
                  <TotalsRow
                    label={copy.detail.latePenalty}
                    value={formatMoney(invoice.penalty_amount, invoice.currency, locale)}
                    valueClassName="text-amber-800 dark:text-amber-200"
                  />
                ) : null}
                <TotalsRow
                  label={amountDueLabel}
                  value={formatMoney(amountDueValue, invoice.currency, locale)}
                  emphasize
                  valueClassName={cn(
                    invoice.status === "paid" && "text-emerald-800 dark:text-emerald-300",
                    invoice.status === "void" && "text-red-800 line-through decoration-red-300/80 dark:text-red-300",
                    overdue && invoice.status === "issued" && "text-amber-900 dark:text-amber-200",
                  )}
                />
              </dl>
            </div>

            {invoice.notes ? (
              <section className="border-t border-slate-100 pt-6 dark:border-border">
                <p className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                  {copy.detail.notesTitle}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-muted-foreground">
                  {invoice.notes}
                </p>
              </section>
            ) : null}

            <p className="border-t border-slate-100 pt-5 text-center text-xs text-slate-400 dark:border-border">
              {copy.detail.thankYou}
            </p>
          </div>
        </article>

        {showPayment ? (
          <div className="mt-6 print:hidden xl:sticky xl:top-6 xl:mt-0">
            <InvoicePaymentSection
              invoice={invoice}
              locale={locale}
              onInvoiceUpdated={(updated) => setInvoice(updated)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OverdueBanner({
  copy,
  daysOverdue,
  penaltyAmount,
  amountDue,
  currency,
  locale,
  accruesDaily,
}: {
  copy: ReturnType<typeof getCustomerInvoicesMessages>;
  daysOverdue: number;
  penaltyAmount: number;
  amountDue: number;
  currency: string;
  locale: string;
  accruesDaily: boolean;
}) {
  const penaltyLabel = formatMoney(penaltyAmount, currency, locale);
  const dueLabel = formatMoney(amountDue, currency, locale);
  const daysLabel =
    daysOverdue === 1
      ? copy.detail.overdueDaysValueOne
      : formatMessage(copy.detail.overdueDaysValue, { count: daysOverdue });
  const announcement =
    penaltyAmount > 0
      ? formatMessage(
          accruesDaily ? copy.detail.overdueNoticeWithDailyPenalty : copy.detail.overdueNoticeWithPenalty,
          { days: daysOverdue, penalty: penaltyLabel, due: dueLabel },
        )
      : copy.detail.overdueNotice;

  return (
    <div
      role="alert"
      className="overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50 print:hidden dark:border-amber-400/30 dark:bg-amber-400/10"
    >
      <p className="sr-only">{announcement}</p>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100">
          <TriangleAlert className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
            {copy.detail.overdueBannerTitle}
          </p>
          <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-100/80">{copy.detail.overdueNotice}</p>
        </div>
      </div>
      <dl
        className={cn(
          "grid gap-px border-t border-amber-200/70 bg-amber-200/70 dark:border-amber-400/20 dark:bg-amber-400/20",
          penaltyAmount > 0 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2",
        )}
      >
        <OverdueStat label={copy.detail.overdueDaysLabel} value={daysLabel} />
        {penaltyAmount > 0 ? (
          <OverdueStat
            label={copy.detail.latePenalty}
            value={penaltyLabel}
            hint={accruesDaily ? copy.detail.dailyPenaltyHint : undefined}
          />
        ) : null}
        <OverdueStat
          label={copy.detail.amountDue}
          value={dueLabel}
          className={penaltyAmount > 0 ? "col-span-2 sm:col-span-1" : undefined}
          emphasize
        />
      </dl>
    </div>
  );
}

function OverdueStat({
  label,
  value,
  hint,
  emphasize,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-amber-50 px-4 py-3 dark:bg-amber-400/10", className)}>
      <dt className="text-[11px] font-bold tracking-[0.12em] text-amber-800/70 uppercase dark:text-amber-200/70">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-semibold tabular-nums text-amber-950 dark:text-amber-50",
          emphasize ? "text-base" : "text-sm",
        )}
      >
        {value}
      </dd>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-amber-800/80 dark:text-amber-100/70">{hint}</p> : null}
    </div>
  );
}

function AddressBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
      <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">{label}</p>
      {children}
    </div>
  );
}

function MetaField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800 dark:text-foreground">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function PaymentMethodField({
  label,
  method,
  value,
}: {
  label: string;
  method: InvoicePaymentMethod | null;
  value: string;
}) {
  const logo = method ? PAYMENT_METHOD_LOGOS[method] : undefined;

  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">{label}</dt>
      <dd className="mt-1.5 flex min-w-0 items-center gap-2.5">
        {logo ? (
          <span className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-white px-1.5 dark:border-border">
            <Image src={logo} alt="" width={70} height={24} className="max-h-6 w-auto object-contain" />
          </span>
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground">
            <WalletCards className="size-4" />
          </span>
        )}
        <span className="min-w-0 text-sm font-semibold text-slate-800 dark:text-foreground">{value}</span>
      </dd>
    </div>
  );
}

function TotalsRow({
  label,
  value,
  emphasize,
  valueClassName,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-6",
        emphasize && "border-t-2 border-[var(--brand-primary)] pt-3 dark:border-[var(--brand-accent)]",
      )}
    >
      <dt
        className={cn(
          "text-sm text-slate-500",
          emphasize && "font-semibold text-[var(--brand-primary)] dark:text-foreground",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums text-slate-800 dark:text-foreground",
          emphasize ? "text-xl font-bold tracking-tight" : "text-sm font-semibold",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function InvoiceLineRow({
  index,
  description,
  quantity,
  amount,
  details,
  viewDetailsLabel,
  hideDetailsLabel,
}: {
  index: number;
  description: string;
  quantity: number;
  amount: string;
  details: ReactNode;
  viewDetailsLabel: string;
  hideDetailsLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-slate-100 align-top dark:border-border">
        <td className="py-3 pr-3 tabular-nums text-slate-400">{index + 1}</td>
        <td className="py-3 pr-3">
          <p className="font-medium text-slate-800 dark:text-foreground">{description}</p>
          <Collapsible open={open} onOpenChange={setOpen} className="print:hidden">
            <CollapsibleTrigger className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--brand-primary)] hover:underline dark:text-[var(--brand-accent)]">
              {open ? hideDetailsLabel : viewDetailsLabel}
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
            </CollapsibleTrigger>
          </Collapsible>
        </td>
        <td className="py-3 pr-3 text-right tabular-nums text-slate-600">{quantity}</td>
        <td className="py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-foreground">
          {amount}
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-slate-100 print:hidden dark:border-border">
          <td colSpan={4} className="pb-4">
            {details}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function InvoiceStamp({
  label,
  tone,
}: {
  label: string;
  tone: "paid" | "void" | "overdue";
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-16 right-6 rotate-[-12deg] rounded-sm border-[3px] px-4 py-1.5 text-sm font-extrabold tracking-[0.28em] uppercase opacity-80 sm:top-20 sm:right-10 sm:text-lg",
        tone === "paid" && "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300",
        tone === "void" && "border-red-500 text-red-600 dark:border-red-400 dark:text-red-300",
        tone === "overdue" && "border-amber-600 text-amber-800 dark:border-amber-400 dark:text-amber-200",
      )}
      aria-hidden
    >
      {label}
    </div>
  );
}
