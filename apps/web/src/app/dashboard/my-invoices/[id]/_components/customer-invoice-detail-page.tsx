"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Receipt } from "lucide-react";
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
import { formatMessage, getCustomerInvoicesMessages } from "@/translations";
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

export function CustomerInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const copy = getCustomerInvoicesMessages(locale);
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
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (!invoice) {
    return <p className="text-sm text-slate-500">{copy.detail.notFound}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-slate-600"
          render={<Link href={USER_MY_INVOICES_PATH} />}
        >
          <ArrowLeft className="size-4" />
          {copy.detail.back}
        </Button>
        <div>
          <p className={adminEyebrowClass}>{copy.eyebrow}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={adminHeadingClass}>{invoice.reference_number}</h1>
            <Badge className={STATUS_BADGE_CLASS[invoice.status]}>{copy.status[invoice.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{invoice.contract.title}</p>
        </div>
      </div>

      <section className={cn(adminCardClass, "space-y-4 p-5")}>
        <SectionHeader icon={Receipt} title={copy.detail.summaryTitle} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickFact
            label={copy.detail.contractTitle}
            value={invoice.contract.reference_number}
            hint={invoice.contract.title}
          />
          <QuickFact
            label={copy.detail.periodTitle}
            value={formatContractTermRange(
              { starts_at: invoice.period_start, ends_at: invoice.period_end },
              locale,
            )}
          />
          <QuickFact
            label={copy.detail.paymentTermsTitle}
            value={
              invoice.payment_terms_days
                ? formatMessage(copy.detail.paymentTermsValue, { days: invoice.payment_terms_days })
                : "—"
            }
          />
          <QuickFact label={copy.detail.issuedTitle} value={formatDate(invoice.issued_at, locale)} />
          <QuickFact label={copy.detail.dueTitle} value={formatDate(invoice.due_at, locale)} />
          <QuickFact label={copy.detail.paidTitle} value={formatDate(invoice.paid_at, locale)} />
          {invoice.status === "void" ? (
            <QuickFact label={copy.detail.voidedTitle} value={formatDate(invoice.voided_at, locale)} />
          ) : null}
          <QuickFact
            label={copy.detail.subtotal}
            value={formatMoney(invoice.subtotal, invoice.currency, locale)}
          />
          <QuickFact
            label={copy.detail.total}
            value={formatMoney(invoice.total_amount, invoice.currency, locale)}
          />
        </div>
        {invoice.notes ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {copy.detail.notesTitle}
            </p>
            <p className="mt-2 text-sm text-slate-700">{invoice.notes}</p>
          </div>
        ) : null}
      </section>

      <section className={cn(adminCardClass, "overflow-hidden")}>
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            icon={FileText}
            title={copy.detail.lineItemsTitle}
            description={copy.detail.lineItemsDescription}
          />
        </div>
        {invoice.line_items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.lineItemTrip}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.lineItemCompleted}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.lineItemAmount}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoice.line_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-800">{item.description}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.ride_request.pickup_address} → {item.ride_request.dropoff_address}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {formatDate(item.ride_request.completed_at, locale)}
                    </td>
                    <td className="px-4 py-3 align-top text-right font-medium text-slate-800">
                      {formatMoney(item.line_total, invoice.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  icon: typeof Receipt;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={adminIconBoxClass}>
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

function QuickFact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
