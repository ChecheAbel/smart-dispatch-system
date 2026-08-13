"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarRange, CircleCheckBig, CircleDollarSign, Clock3, ExternalLink, Eye, FileText, History, Receipt, Route } from "lucide-react";
import type { ContractStatus, CustomerContractEnrollment, CustomerContractSummary, CustomerVisibleInvoiceStatus } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { adminBadgeGoldClass, adminBadgeSuccessClass, adminHeadingClass } from "@/lib/admin-theme";
import { fetchMyContractEnrollments, fetchMyContractSummary } from "@/lib/customer-billing-api";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";
import { PERMISSIONS } from "@/lib/permissions";
import {
  formatMessage,
  getAdminContractsMessages,
  getCustomerContractsMessages,
  getCustomerInvoicesMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";

const CONTRACT_STATUS_CLASS: Record<ContractStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
  active: adminBadgeSuccessClass,
  expired: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  cancelled: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
};

const INVOICE_STATUS_CLASS: Record<CustomerVisibleInvoiceStatus, string> = {
  issued: adminBadgeGoldClass,
  paid: adminBadgeSuccessClass,
  void: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
};

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function SheetFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-3">
      <span className="mt-0.5 text-[var(--brand-accent)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function MyContractsPage() {
  const { locale } = useLocale();
  const copy = getCustomerContractsMessages(locale);
  const contractCopy = getAdminContractsMessages(locale);
  const invoiceCopy = getCustomerInvoicesMessages(locale);
  const canRead = usePermission(PERMISSIONS.customer.contracts);
  const [summary, setSummary] = useState<CustomerContractSummary | null>();
  const [selectedEnrollment, setSelectedEnrollment] = useState<CustomerContractEnrollment | null>(null);

  useEffect(() => {
    if (!canRead) return;

    let cancelled = false;
    void fetchMyContractSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [canRead]);

  const columns = useMemo<DataTableColumn<CustomerContractEnrollment>[]>(
    () => [
      {
        id: "contract",
        header: copy.columns.contract,
        cell: (row) => (
          <div>
            <p className="font-medium text-[#1C3A34]">{row.contract.title}</p>
            <p className="text-xs text-slate-500">{row.contract.reference_number}</p>
          </div>
        ),
      },
      {
        id: "period",
        header: copy.columns.period,
        cellClassName: "text-slate-600",
        cell: (row) => formatContractTermRange(row, locale),
      },
      {
        id: "billing",
        header: copy.columns.billingInterval,
        cellClassName: "text-slate-600",
        cell: (row) => contractCopy.billingIntervals[row.contract.billing_interval],
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (row) => (
          <Badge className={cn("text-xs", CONTRACT_STATUS_CLASS[row.contract.status])}>
            {contractCopy.status[row.contract.status]}
          </Badge>
        ),
      },
      {
        id: "paymentTerms",
        header: copy.columns.paymentTerms,
        cellClassName: "text-slate-600",
        cell: (row) =>
          row.contract.billing_interval === "per_trip"
            ? copy.paymentTermsPerTrip
            : row.contract.payment_terms_days
              ? formatMessage(copy.paymentTermsValue, { days: row.contract.payment_terms_days })
              : "—",
      },
      {
        id: "invoice",
        header: copy.columns.invoice,
        cell: (row) =>
          row.invoice ? (
            <Link
              href={`/dashboard/my-invoices/${row.invoice.id}`}
              className="block hover:text-[#1C3A34]"
            >
              <p className="font-medium text-slate-800">{row.invoice.reference_number}</p>
              <p className="text-xs text-slate-500">
                {formatMoney(row.invoice.total_amount, row.invoice.currency, locale)}
              </p>
            </Link>
          ) : (
            <span className="text-sm text-slate-400">{copy.invoiceNone}</span>
          ),
      },
    ],
    [contractCopy.billingIntervals, contractCopy.status, copy, locale],
  );

  const loadEnrollments = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchMyContractEnrollments({ page, limit, search: search || undefined }),
    [],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} fallbackPath={USER_DASHBOARD_PATH} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={copy.stats.total}
          value={summary?.total ?? 0}
          description={copy.stats.totalDescription}
          icon={FileText}
          loading={summary === undefined}
        />
        <StatCard
          title={copy.stats.active}
          value={summary?.active ?? 0}
          description={copy.stats.activeDescription}
          icon={CircleCheckBig}
          loading={summary === undefined}
        />
        <StatCard
          title={copy.stats.perTrip}
          value={summary?.per_trip ?? 0}
          description={copy.stats.perTripDescription}
          icon={Route}
          loading={summary === undefined}
        />
        <StatCard
          title={copy.stats.inactive}
          value={summary?.inactive ?? 0}
          description={copy.stats.inactiveDescription}
          icon={History}
          loading={summary === undefined}
        />
      </div>

      <DataTable<CustomerContractEnrollment>
      eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
      title={copy.title}
      titleClassName={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}
      description={copy.description}
      searchPlaceholder={copy.searchPlaceholder}
      itemLabel={copy.itemLabel}
      columns={columns}
      fetchData={loadEnrollments}
      getRowKey={(row) => row.id}
      showIndexColumn
      renderRowActions={(row) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
          onClick={() => setSelectedEnrollment(row)}
          aria-label={`${copy.detail.view} ${row.contract.reference_number}`}
        >
          <Eye className="size-4" />
        </Button>
      )}
      emptyTitle={copy.empty.title}
      emptyDescription={copy.empty.description}
      emptySearchDescription={copy.empty.searchDescription}
      emptyIcon={FileText}
      />

      <Sheet
        open={Boolean(selectedEnrollment)}
        onOpenChange={(open) => {
          if (!open) setSelectedEnrollment(null);
        }}
      >
        <SheetContent className="flex flex-col gap-0 overflow-hidden border-l-slate-200 bg-slate-50 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[36rem] data-[side=right]:sm:max-w-[calc(100vw-2rem)] dark:border-l-border dark:bg-background">
          {selectedEnrollment ? (
            <>
              <SheetHeader className="relative overflow-hidden bg-[var(--brand-primary)] px-5 py-6 pr-14 text-white sm:px-7 dark:bg-card">
                <div className="pointer-events-none absolute -top-20 -right-14 size-60 rounded-full bg-[var(--brand-accent)]/15 blur-3xl" />
                <div className="relative flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[var(--brand-accent)] ring-1 ring-white/15">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--brand-accent)] uppercase">{copy.eyebrow}</p>
                      <span className="text-white/30">•</span>
                      <p className="font-mono text-xs text-white/60">{selectedEnrollment.contract.reference_number}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <SheetTitle className="text-xl font-extrabold leading-tight text-white sm:text-2xl">
                        {selectedEnrollment.contract.title}
                      </SheetTitle>
                      <Badge className={CONTRACT_STATUS_CLASS[selectedEnrollment.contract.status]}>
                        {contractCopy.status[selectedEnrollment.contract.status]}
                      </Badge>
                    </div>
                    <SheetDescription className="mt-2 text-sm leading-relaxed text-white/65">
                      {copy.detail.summaryDescription}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <section className="border-b border-slate-200 px-5 py-5 sm:px-7 dark:border-border">
                  <div className="mb-4 flex items-center gap-2">
                    <CalendarRange className="size-4 text-[var(--brand-accent)]" />
                    <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">{copy.detail.summaryTitle}</h3>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-card dark:ring-border">
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{copy.detail.startDate}</p>
                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-foreground">{formatDate(selectedEnrollment.starts_at, locale)}</p>
                    </div>
                    <span className="flex size-8 items-center justify-center rounded-full bg-slate-50 text-[var(--brand-accent)] ring-1 ring-slate-200 dark:bg-muted dark:ring-border">
                      <ArrowRight className="size-4" />
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{copy.detail.endDate}</p>
                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-foreground">{formatDate(selectedEnrollment.ends_at, locale)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid divide-y divide-slate-200 dark:divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <SheetFact
                      icon={<Clock3 className="size-4" />}
                      label={copy.detail.billingInterval}
                      value={contractCopy.billingIntervals[selectedEnrollment.contract.billing_interval]}
                    />
                    <div className="sm:px-4">
                      <SheetFact
                        icon={<CircleDollarSign className="size-4" />}
                        label={copy.detail.paymentTerms}
                        value={
                          selectedEnrollment.contract.billing_interval === "per_trip"
                            ? copy.paymentTermsPerTrip
                            : selectedEnrollment.contract.payment_terms_days
                              ? formatMessage(copy.paymentTermsValue, { days: selectedEnrollment.contract.payment_terms_days })
                              : "—"
                        }
                      />
                    </div>
                    <div className="sm:pl-4">
                      <SheetFact
                        icon={<CalendarRange className="size-4" />}
                        label={copy.detail.enrolledOn}
                        value={formatDate(selectedEnrollment.created_at, locale)}
                      />
                    </div>
                  </div>
                </section>

                <section className="px-5 py-5 sm:px-7">
                  <div className="mb-4 flex items-center gap-2">
                    <Receipt className="size-4 text-[var(--brand-accent)]" />
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">{copy.detail.invoiceTitle}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">{copy.detail.invoiceDescription}</p>
                    </div>
                  </div>
                  {selectedEnrollment.invoice ? (
                    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-card dark:ring-border">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-sm font-semibold text-slate-800 dark:text-foreground">{selectedEnrollment.invoice.reference_number}</p>
                        <Badge className={INVOICE_STATUS_CLASS[selectedEnrollment.invoice.status]}>
                          {invoiceCopy.status[selectedEnrollment.invoice.status]}
                        </Badge>
                      </div>
                      <p className="mt-4 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{copy.detail.invoiceAmount}</p>
                      <p className="mt-1 text-2xl font-extrabold text-[var(--brand-primary)] dark:text-foreground">
                        {formatMoney(selectedEnrollment.invoice.total_amount, selectedEnrollment.invoice.currency, locale)}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-border">
                        <SheetFact
                          icon={<CalendarRange className="size-4" />}
                          label={copy.detail.invoiceIssued}
                          value={selectedEnrollment.invoice.issued_at ? formatDate(selectedEnrollment.invoice.issued_at, locale) : "—"}
                        />
                        <SheetFact
                          icon={<Clock3 className="size-4" />}
                          label={copy.detail.invoiceDue}
                          value={selectedEnrollment.invoice.due_at ? formatDate(selectedEnrollment.invoice.due_at, locale) : "—"}
                        />
                      </div>
                      <Button className="mt-4 w-full" render={<Link href={`/dashboard/my-invoices/${selectedEnrollment.invoice.id}`} />} nativeButton={false}>
                        {copy.detail.openInvoice}
                        <ExternalLink className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 dark:border-border dark:bg-card/60">
                      <Receipt className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-foreground">{copy.detail.noInvoiceTitle}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">{copy.detail.noInvoiceDescription}</p>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
