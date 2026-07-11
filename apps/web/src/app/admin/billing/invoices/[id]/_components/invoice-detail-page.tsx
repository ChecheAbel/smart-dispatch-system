"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Receipt } from "lucide-react";
import type { Invoice, InvoiceStatus } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
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
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  fetchInvoiceById,
  issueInvoice,
  markInvoicePaid,
  voidInvoice,
} from "@/lib/invoice-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminInvoicesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";

const STATUS_BADGE_CLASS: Record<InvoiceStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
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

export function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminInvoicesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.invoices.read);
  const canWrite = hasPermission(PERMISSIONS.invoices.write);
  const canDelete = hasPermission(PERMISSIONS.invoices.delete);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!canRead || !params.id) return;

    let cancelled = false;

    async function loadInvoice() {
      setLoading(true);
      try {
        const result = await fetchInvoiceById(params.id, locale);
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
  }, [canRead, copy.toast.loadFailed, locale, params.id, refreshKey]);

  async function handleIssue() {
    if (!invoice) return;
    try {
      const updated = await issueInvoice(invoice.id);
      setInvoice(updated);
      showSuccessToast({
        title: copy.toast.issueSuccess.title,
        description: formatMessage(copy.toast.issueSuccess.description, {
          reference: updated.reference_number,
        }),
      });
    } catch {
      showErrorToast({
        title: copy.toast.actionFailed.title,
        description: copy.toast.actionFailed.description,
      });
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    try {
      const updated = await markInvoicePaid(invoice.id);
      setInvoice(updated);
      showSuccessToast({
        title: copy.toast.markPaidSuccess.title,
        description: formatMessage(copy.toast.markPaidSuccess.description, {
          reference: updated.reference_number,
        }),
      });
    } catch {
      showErrorToast({
        title: copy.toast.actionFailed.title,
        description: copy.toast.actionFailed.description,
      });
    }
  }

  async function handleVoid() {
    if (!invoice) return;
    try {
      const updated = await voidInvoice(invoice.id);
      setInvoice(updated);
      showSuccessToast({
        title: copy.toast.voidSuccess.title,
        description: formatMessage(copy.toast.voidSuccess.description, {
          reference: updated.reference_number,
        }),
      });
    } catch {
      showErrorToast({
        title: copy.toast.actionFailed.title,
        description: copy.toast.actionFailed.description,
      });
    }
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (!invoice) {
    return <p className="text-sm text-slate-500">Invoice not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 text-slate-600" render={<Link href="/admin/billing/invoices" />}>
            <ArrowLeft className="size-4" />
            {copy.detail.back}
          </Button>
          <div>
            <p className={adminEyebrowClass}>{copy.eyebrow}</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className={adminHeadingClass}>{invoice.reference_number}</h1>
              <Badge className={STATUS_BADGE_CLASS[invoice.status]}>{copy.status[invoice.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {invoice.contract.title} · {invoice.requester.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canWrite && invoice.status === "draft" ? (
            <Button type="button" className={adminPrimaryButtonClass} onClick={handleIssue}>
              {copy.actions.issue}
            </Button>
          ) : null}
          {canWrite && invoice.status === "issued" ? (
            <Button type="button" className={adminPrimaryButtonClass} onClick={handleMarkPaid}>
              {copy.actions.markPaid}
            </Button>
          ) : null}
          {canDelete && invoice.status !== "paid" && invoice.status !== "void" ? (
            <Button type="button" variant="outline" onClick={handleVoid}>
              {copy.actions.void}
            </Button>
          ) : null}
        </div>
      </div>

      <section className={cn(adminCardClass, "space-y-4 p-5")}>
        <SectionHeader
          icon={Receipt}
          title={copy.detail.summary}
          description={copy.detail.summaryDescription}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickFact label={copy.detail.customer} value={invoice.requester.name} hint={invoice.requester.email} />
          <QuickFact
            label={copy.detail.contract}
            value={invoice.contract.reference_number}
            hint={invoice.contract.title}
          />
          <QuickFact
            label={copy.detail.period}
            value={formatContractTermRange(
              { starts_at: invoice.period_start, ends_at: invoice.period_end },
              locale,
            )}
          />
          <QuickFact
            label={copy.detail.paymentTerms}
            value={
              invoice.payment_terms_days
                ? formatMessage(copy.detail.paymentTermsValue, { days: invoice.payment_terms_days })
                : "—"
            }
          />
          <QuickFact label={copy.detail.subtotal} value={formatMoney(invoice.subtotal, invoice.currency, locale)} />
          <QuickFact label={copy.detail.total} value={formatMoney(invoice.total_amount, invoice.currency, locale)} />
          <QuickFact label={copy.detail.issuedAt} value={formatDate(invoice.issued_at, locale)} />
          <QuickFact label={copy.detail.dueAt} value={formatDate(invoice.due_at, locale)} />
        </div>
      </section>

      <section className={cn(adminCardClass, "overflow-hidden")}>
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            icon={FileText}
            title={copy.detail.lineItems}
            description={copy.detail.lineItemsDescription}
          />
        </div>
        {invoice.line_items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">{copy.detail.noLineItems}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.tripRoute}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.distance}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.duration}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.tripAmount}
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
                      {item.distance_km != null ? `${item.distance_km.toFixed(1)} km` : "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {item.duration_minutes != null ? `${item.duration_minutes} min` : "—"}
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
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
