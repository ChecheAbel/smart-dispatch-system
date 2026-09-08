"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Receipt,
  Send,
} from "lucide-react";
import type { Invoice, InvoiceStatus } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminEyebrowClass } from "@/lib/admin-theme";
import { fetchInvoices, issueInvoice, markInvoicePaid, voidInvoice } from "@/lib/invoice-api";
import { invoiceListedAmount } from "@/lib/invoice-amounts";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminInvoicesMessages } from "@/translations";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { InvoiceStats } from "./invoice-stats";
import { formatGlobalDate } from "@/lib/ethiopian-calendar";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    badgeClass: string;
    dotClass: string;
  }
> = {
  draft: {
    badgeClass:
      "border-slate-200 bg-slate-50/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300",
    dotClass: "bg-slate-400",
  },
  issued: {
    badgeClass:
      "border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300",
    dotClass: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]",
  },
  paid: {
    badgeClass:
      "border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300",
    dotClass: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
  },
  void: {
    badgeClass:
      "border-red-200/90 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300",
    dotClass: "bg-red-500",
  },
};

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
  return formatGlobalDate(parsed, locale);
}

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "ETB",
    maximumFractionDigits: 2,
  }).format(amount);
}

function InvoiceRowActions({
  invoice,
  labels,
  toastCopy,
  canWrite,
  canDelete,
  onAction,
}: {
  invoice: Invoice;
  labels: ReturnType<typeof getAdminInvoicesMessages>["actions"];
  toastCopy: ReturnType<typeof getAdminInvoicesMessages>["toast"];
  canWrite: boolean;
  canDelete: boolean;
  onAction: () => void;
}) {
  async function handleIssue() {
    try {
      const updated = await issueInvoice(invoice.id);
      showSuccessToast({
        title: toastCopy.issueSuccess.title,
        description: formatMessage(toastCopy.issueSuccess.description, {
          reference: updated.reference_number,
        }),
      });
      onAction();
    } catch {
      showErrorToast({
        title: toastCopy.actionFailed.title,
        description: toastCopy.actionFailed.description,
      });
    }
  }

  async function handleMarkPaid() {
    try {
      const updated = await markInvoicePaid(invoice.id);
      showSuccessToast({
        title: toastCopy.markPaidSuccess.title,
        description: formatMessage(toastCopy.markPaidSuccess.description, {
          reference: updated.reference_number,
        }),
      });
      onAction();
    } catch {
      showErrorToast({
        title: toastCopy.actionFailed.title,
        description: toastCopy.actionFailed.description,
      });
    }
  }

  async function handleVoid() {
    try {
      const updated = await voidInvoice(invoice.id);
      showSuccessToast({
        title: toastCopy.voidSuccess.title,
        description: formatMessage(toastCopy.voidSuccess.description, {
          reference: updated.reference_number,
        }),
      });
      onAction();
    } catch {
      showErrorToast({
        title: toastCopy.actionFailed.title,
        description: toastCopy.actionFailed.description,
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] dark:hover:bg-accent dark:hover:text-foreground"
            aria-label={formatMessage(labels.menuLabel, { name: invoice.reference_number })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            render={<Link href={`/admin/billing/invoices/${invoice.id}`} />}
          >
            <Eye className="size-4 text-slate-500" />
            <span>{labels.view}</span>
          </DropdownMenuItem>

          {canWrite && invoice.status === "draft" ? (
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleIssue}
            >
              <Send className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
              <span>{labels.issue}</span>
            </DropdownMenuItem>
          ) : null}

          {canWrite && invoice.status === "issued" ? (
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleMarkPaid}
            >
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{labels.markPaid}</span>
            </DropdownMenuItem>
          ) : null}

          {canDelete && invoice.status !== "paid" && invoice.status !== "void" ? (
            <DropdownMenuItem
              variant="destructive"
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleVoid}
            >
              <Ban className="size-4 text-red-600 dark:text-red-400" />
              <span>{labels.void}</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InvoicesPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminInvoicesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.invoices.read);
  const canWrite = hasPermission(PERMISSIONS.invoices.write);
  const canDelete = hasPermission(PERMISSIONS.invoices.delete);

  const isAm = locale === "am";
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | "">("");

  const statusFilterItems: Array<{ value: InvoiceStatus | ""; label: string }> = useMemo(
    () => [
      { value: "", label: isAm ? "ሁሉም ደረሰኞች" : "All Invoices" },
      { value: "draft", label: copy.status.draft },
      { value: "issued", label: copy.status.issued },
      { value: "paid", label: copy.status.paid },
      { value: "void", label: copy.status.void },
    ],
    [copy.status, isAm],
  );

  const columns = useMemo<DataTableColumn<Invoice>[]>(
    () => [
      {
        id: "reference",
        header: copy.columns.reference,
        cellClassName: "font-semibold text-slate-800 dark:text-foreground",
        cell: (invoice) => (
          <Link
            href={`/admin/billing/invoices/${invoice.id}`}
            className="group inline-flex items-center gap-2 font-mono text-xs font-bold text-slate-900 hover:text-[var(--brand-primary)] dark:text-foreground dark:hover:text-[var(--brand-accent)]"
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-[var(--brand-primary)] group-hover:text-white dark:bg-muted dark:text-muted-foreground dark:group-hover:bg-[var(--brand-accent)] dark:group-hover:text-[#171a1f]">
              <Receipt className="size-3.5" />
            </div>
            <span className="underline-offset-2 group-hover:underline">
              {invoice.reference_number}
            </span>
          </Link>
        ),
      },
      {
        id: "contract",
        header: copy.columns.contract,
        cell: (invoice) => (
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-foreground line-clamp-1">
              {invoice.contract.title}
            </p>
            <p className="font-mono text-[11px] text-slate-400 dark:text-muted-foreground">
              {invoice.contract.reference_number}
            </p>
          </div>
        ),
      },
      {
        id: "customer",
        header: copy.columns.customer,
        cell: (invoice) => (
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-foreground">
              {invoice.requester.name}
            </p>
            {invoice.requester.email ? (
              <p className="text-xs text-slate-400 dark:text-muted-foreground line-clamp-1">
                {invoice.requester.email}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "period",
        header: copy.columns.period,
        cellClassName: "text-slate-600 dark:text-muted-foreground text-xs",
        cell: (invoice) => (
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-slate-400 shrink-0" />
            <span>
              {formatContractTermRange(
                { starts_at: invoice.period_start, ends_at: invoice.period_end },
                locale,
              )}
            </span>
          </div>
        ),
      },
      {
        id: "total",
        header: copy.columns.total,
        cellClassName: "font-medium text-slate-800 dark:text-foreground",
        cell: (invoice) => {
          const hasPenalty = invoice.status === "issued" && invoice.penalty_amount > 0;
          return (
            <div className="space-y-0.5">
              <p className="font-bold tabular-nums text-slate-900 dark:text-foreground">
                {formatMoney(invoiceListedAmount(invoice), invoice.currency, locale)}
              </p>
              {hasPenalty ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30">
                  <AlertCircle className="size-2.5" />
                  {copy.columns.includesPenalty}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (invoice) => {
          const config = STATUS_CONFIG[invoice.status];
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                config.badgeClass,
              )}
            >
              <span className={cn("size-1.5 rounded-full", config.dotClass)} />
              {copy.status[invoice.status]}
            </span>
          );
        },
      },
      {
        id: "due",
        header: copy.columns.due,
        cellClassName: "text-slate-500 text-xs",
        cell: (invoice) => {
          const isOverdue =
            invoice.is_overdue && invoice.status !== "paid" && invoice.status !== "void";
          return (
            <div className="flex items-center gap-1.5">
              {isOverdue ? (
                <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <CalendarClock className="size-3.5 shrink-0 text-slate-400" />
              )}
              <span
                className={cn(
                  "font-medium",
                  isOverdue
                    ? "font-bold text-amber-700 dark:text-amber-400"
                    : "text-slate-600 dark:text-muted-foreground",
                )}
              >
                {formatDate(invoice.due_at, locale)}
              </span>
            </div>
          );
        },
      },
    ],
    [copy, locale],
  );

  const loadInvoices = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchInvoices({
        page,
        limit,
        search: search || undefined,
        status: selectedStatus || undefined,
        locale,
      }),
    [locale, selectedStatus],
  );

  const renderRowActions = useCallback(
    (invoice: Invoice, _context: DataTableRowContext<Invoice>) => (
      <InvoiceRowActions
        invoice={invoice}
        labels={copy.actions}
        toastCopy={copy.toast}
        canWrite={canWrite}
        canDelete={canDelete}
        onAction={() => setRefreshKey((current) => current + 1)}
      />
    ),
    [canDelete, canWrite, copy.actions, copy.toast],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const filterBar = (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100/90 p-1 dark:bg-muted/60">
      {statusFilterItems.map((item) => {
        const isActive = selectedStatus === item.value;
        return (
          <button
            key={item.value || "all"}
            type="button"
            onClick={() => setSelectedStatus(item.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              isActive
                ? "bg-white text-[var(--brand-primary)] shadow-sm dark:bg-card dark:text-foreground"
                : "text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <InvoiceStats
        locale={locale}
        refreshKey={refreshKey}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />

      <DataTable<Invoice>
        key={`${locale}-${refreshKey}`}
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>}
        title={copy.title}
        titleClassName="text-2xl font-black tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadInvoices}
        getRowKey={(invoice) => invoice.id}
        showIndexColumn
        refreshDeps={[selectedStatus, locale, refreshKey]}
        filterBar={filterBar}
        actionsColumnHeader={copy.columns.actions}
        renderRowActions={canWrite || canDelete ? renderRowActions : undefined}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        emptyIcon={Receipt}
      />
    </div>
  );
}
