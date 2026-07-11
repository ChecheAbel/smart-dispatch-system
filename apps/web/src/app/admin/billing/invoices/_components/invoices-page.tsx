"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Receipt } from "lucide-react";
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
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
} from "@/lib/admin-theme";
import { fetchInvoices, issueInvoice, markInvoicePaid, voidInvoice } from "@/lib/invoice-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminInvoicesMessages } from "@/translations";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { InvoiceStats } from "./invoice-stats";

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

function InvoiceRowActions({
  invoice,
  labels,
  canWrite,
  canDelete,
  onAction,
}: {
  invoice: Invoice;
  labels: ReturnType<typeof getAdminInvoicesMessages>["actions"];
  canWrite: boolean;
  canDelete: boolean;
  onAction: () => void;
}) {
  async function handleIssue() {
    try {
      const updated = await issueInvoice(invoice.id);
      showSuccessToast({
        title: labels.issue,
        description: updated.reference_number,
      });
      onAction();
    } catch {
      showErrorToast({ title: labels.issue, description: "Failed" });
    }
  }

  async function handleMarkPaid() {
    try {
      const updated = await markInvoicePaid(invoice.id);
      showSuccessToast({
        title: labels.markPaid,
        description: updated.reference_number,
      });
      onAction();
    } catch {
      showErrorToast({ title: labels.markPaid, description: "Failed" });
    }
  }

  async function handleVoid() {
    try {
      const updated = await voidInvoice(invoice.id);
      showSuccessToast({
        title: labels.void,
        description: updated.reference_number,
      });
      onAction();
    } catch {
      showErrorToast({ title: labels.void, description: "Failed" });
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
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(labels.menuLabel, { name: invoice.reference_number })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={`/admin/billing/invoices/${invoice.id}`} />}>
            <Eye />
            {labels.view}
          </DropdownMenuItem>
          {canWrite && invoice.status === "draft" ? (
            <DropdownMenuItem onClick={handleIssue}>{labels.issue}</DropdownMenuItem>
          ) : null}
          {canWrite && invoice.status === "issued" ? (
            <DropdownMenuItem onClick={handleMarkPaid}>{labels.markPaid}</DropdownMenuItem>
          ) : null}
          {canDelete && invoice.status !== "paid" && invoice.status !== "void" ? (
            <DropdownMenuItem variant="destructive" onClick={handleVoid}>
              {labels.void}
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
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = useMemo<DataTableColumn<Invoice>[]>(
    () => [
      {
        id: "reference",
        header: copy.columns.reference,
        cellClassName: "font-semibold text-slate-800",
        cell: (invoice) => (
          <Link
            href={`/admin/billing/invoices/${invoice.id}`}
            className="hover:text-[#1C3A34] hover:underline"
          >
            {invoice.reference_number}
          </Link>
        ),
      },
      {
        id: "contract",
        header: copy.columns.contract,
        cell: (invoice) => (
          <div>
            <p className="font-medium text-slate-800">{invoice.contract.title}</p>
            <p className="text-xs text-slate-500">{invoice.contract.reference_number}</p>
          </div>
        ),
      },
      {
        id: "customer",
        header: copy.columns.customer,
        cellClassName: "text-slate-600",
        cell: (invoice) => invoice.requester.name,
      },
      {
        id: "period",
        header: copy.columns.period,
        cellClassName: "text-slate-600",
        cell: (invoice) =>
          formatContractTermRange(
            { starts_at: invoice.period_start, ends_at: invoice.period_end },
            locale,
          ),
      },
      {
        id: "total",
        header: copy.columns.total,
        cellClassName: "font-medium text-slate-800",
        cell: (invoice) => formatMoney(invoice.total_amount, invoice.currency, locale),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (invoice) => (
          <Badge className={STATUS_BADGE_CLASS[invoice.status]}>{copy.status[invoice.status]}</Badge>
        ),
      },
      {
        id: "due",
        header: copy.columns.due,
        cellClassName: "text-slate-500",
        cell: (invoice) => formatDate(invoice.due_at, locale),
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
        locale,
      }),
    [locale],
  );

  const renderRowActions = useCallback(
    (invoice: Invoice, _context: DataTableRowContext<Invoice>) => (
      <InvoiceRowActions
        invoice={invoice}
        labels={copy.actions}
        canWrite={canWrite}
        canDelete={canDelete}
        onAction={() => setRefreshKey((current) => current + 1)}
      />
    ),
    [canDelete, canWrite, copy.actions],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <InvoiceStats locale={locale} refreshKey={refreshKey} />

      <DataTable<Invoice>
        key={`${locale}-${refreshKey}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadInvoices}
        getRowKey={(invoice) => invoice.id}
        renderRowActions={canWrite || canDelete ? renderRowActions : undefined}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        emptyIcon={Receipt}
      />
    </div>
  );
}
