"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Clock3, Eye, MoreHorizontal, Receipt, Wallet } from "lucide-react";
import type { CustomerInvoice, CustomerVisibleInvoiceStatus } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminFilterLabelClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";
import { fetchMyInvoices } from "@/lib/customer-billing-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast } from "@/lib/toast";
import { formatMessage, getCustomerInvoicesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { BulkInvoicePaymentSheet } from "./bulk-invoice-payment-sheet";
import { CustomerInvoiceStats } from "./customer-invoice-stats";

const STATUS_FILTER_ALL = "all";

const STATUS_FILTER_OPTIONS: CustomerVisibleInvoiceStatus[] = ["issued", "paid", "void"];

type StatusFilterValue = CustomerVisibleInvoiceStatus | typeof STATUS_FILTER_ALL;

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

type DueState =
  | { kind: "paid" }
  | { kind: "void" }
  | { kind: "none" }
  | { kind: "today" }
  | { kind: "upcoming"; days: number }
  | { kind: "overdue"; days: number };

function getDueState(invoice: CustomerInvoice): DueState {
  if (invoice.status === "paid") return { kind: "paid" };
  if (invoice.status === "void") return { kind: "void" };
  if (!invoice.due_at) return { kind: "none" };

  const dateOnly = invoice.due_at.includes("T") ? invoice.due_at.slice(0, 10) : invoice.due_at;
  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return { kind: "none" };

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const due = Date.UTC(year, month - 1, day);
  const days = Math.round((due - today) / 86_400_000);

  if (days === 0) return { kind: "today" };
  if (days < 0) return { kind: "overdue", days: Math.abs(days) };
  return { kind: "upcoming", days };
}

function StatusFilterSelect({
  value,
  onChange,
  label,
  allLabel,
  statusLabels,
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  label: string;
  allLabel: string;
  statusLabels: Record<CustomerVisibleInvoiceStatus, string>;
}) {
  const options: Array<{ value: StatusFilterValue; label: string }> = [
    { value: STATUS_FILTER_ALL, label: allLabel },
    ...STATUS_FILTER_OPTIONS.map((status) => ({
      value: status,
      label: statusLabels[status],
    })),
  ];

  return (
    <div className="flex items-center gap-2">
      <span className={adminFilterLabelClass}>{label}</span>
      <Select value={value} onValueChange={(next) => onChange(next as StatusFilterValue)}>
        <SelectTrigger className="h-9 w-[180px] bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function MyInvoicesPage() {
  const { locale } = useLocale();
  const copy = getCustomerInvoicesMessages(locale);
  const canRead = usePermission(PERMISSIONS.customer.invoices);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(STATUS_FILTER_ALL);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedById, setSelectedById] = useState<Map<string, CustomerInvoice>>(new Map());
  const [paySheetOpen, setPaySheetOpen] = useState(false);

  const selectedInvoices = useMemo(() => [...selectedById.values()], [selectedById]);
  const selectedKeys = useMemo(() => new Set(selectedById.keys()), [selectedById]);
  const selectedTotal = useMemo(
    () => selectedInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0),
    [selectedInvoices],
  );
  const selectedCurrency = selectedInvoices[0]?.currency ?? "ETB";

  const columns = useMemo<DataTableColumn<CustomerInvoice>[]>(
    () => [
      {
        id: "reference",
        header: copy.columns.reference,
        cellClassName: "font-semibold text-slate-800",
        cell: (invoice) => (
          <Link
            href={`/dashboard/my-invoices/${invoice.id}`}
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
        cell: (invoice) => {
          const dueState = getDueState(invoice);
          const state =
            dueState.kind === "paid"
              ? { label: copy.dueState.paid, icon: CircleCheck, className: "text-emerald-700 dark:text-emerald-300" }
              : dueState.kind === "void"
                ? { label: copy.dueState.void, icon: CircleCheck, className: "text-slate-500 dark:text-muted-foreground" }
                : dueState.kind === "none"
                  ? { label: copy.dueState.noDate, icon: Clock3, className: "text-slate-400 dark:text-muted-foreground" }
                  : dueState.kind === "today"
                    ? { label: copy.dueState.dueToday, icon: Clock3, className: "text-amber-700 dark:text-amber-300" }
                    : dueState.kind === "overdue"
                      ? { label: formatMessage(copy.dueState.overdue, { days: dueState.days }), icon: CircleAlert, className: "text-red-700 dark:text-red-300" }
                      : { label: formatMessage(copy.dueState.dueIn, { days: dueState.days }), icon: Clock3, className: "text-sky-700 dark:text-sky-300" };
          const StateIcon = state.icon;
          const hasActiveDueDate = ["today", "upcoming", "overdue"].includes(dueState.kind);

          return (
            <div className="space-y-1">
              {hasActiveDueDate ? (
                <p className="text-sm font-medium text-slate-700 dark:text-foreground">
                  {formatDate(invoice.due_at, locale)}
                </p>
              ) : null}
              <p className={cn("inline-flex items-center gap-1 font-medium", hasActiveDueDate ? "text-xs" : "text-sm", state.className)}>
                <StateIcon className="size-3.5" />
                {state.label}
              </p>
            </div>
          );
        },
      },
    ],
    [copy, locale],
  );

  const loadInvoices = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchMyInvoices({
        page,
        limit,
        search: search || undefined,
        locale,
        status: statusFilter === STATUS_FILTER_ALL ? "" : statusFilter,
      }),
    [locale, statusFilter],
  );

  function handleSelectionChange(nextKeys: Set<string>, rows: CustomerInvoice[]) {
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const next = new Map<string, CustomerInvoice>();

    for (const key of nextKeys) {
      const fromRows = rowById.get(key);
      const existing = selectedById.get(key);
      const invoice = fromRows ?? existing;
      if (!invoice || invoice.status !== "issued") continue;

      if (next.size > 0) {
        const first = next.values().next().value as CustomerInvoice;
        if (first.currency !== invoice.currency) {
          showErrorToast({ title: copy.bulkPay.currencyMismatch });
          return;
        }
      }

      next.set(invoice.id, invoice);
    }

    setSelectedById(next);
  }

  function clearSelection() {
    setSelectedById(new Map());
  }

  function handleStatusFilterChange(value: StatusFilterValue) {
    setStatusFilter(value);
    clearSelection();
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} fallbackPath={USER_DASHBOARD_PATH} />;
  }

  return (
    <div className="space-y-6">
      <CustomerInvoiceStats locale={locale} refreshKey={refreshKey} />

      <DataTable<CustomerInvoice>
        key={`${locale}-${statusFilter}-${refreshKey}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadInvoices}
        getRowKey={(invoice) => invoice.id}
        showIndexColumn
        refreshDeps={[statusFilter]}
        rowSelection={{
          selectedKeys,
          onChange: handleSelectionChange,
          isRowSelectable: (invoice) => invoice.status === "issued",
          selectAllLabel: copy.bulkPay.paySelected,
          selectRowLabel: (invoice) =>
            formatMessage(copy.actions.menuLabel, { name: invoice.reference_number }),
        }}
        toolbarActions={
          <StatusFilterSelect
            value={statusFilter}
            onChange={handleStatusFilterChange}
            label={copy.statusFilter}
            allLabel={copy.statusAll}
            statusLabels={copy.status}
          />
        }
        renderRowActions={(invoice) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
                  aria-label={formatMessage(copy.actions.menuLabel, {
                    name: invoice.reference_number,
                  })}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href={`/dashboard/my-invoices/${invoice.id}`} />}>
                  <Eye />
                  {copy.actions.view}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        emptyIcon={Receipt}
      />

      {selectedInvoices.length > 0 ? (
        <div className="sticky bottom-4 z-20">
          <div className="flex flex-col gap-3 rounded-xl border border-[#1C3A34]/15 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1C3A34]">
                {formatMessage(copy.bulkPay.selectedCount, { count: selectedInvoices.length })}
              </p>
              <p className="text-sm text-slate-600">
                {formatMessage(copy.bulkPay.selectedTotal, {
                  amount: formatMoney(selectedTotal, selectedCurrency, locale),
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={clearSelection}>
                {copy.bulkPay.clearSelection}
              </Button>
              <Button
                type="button"
                className={adminPrimaryButtonClass}
                onClick={() => setPaySheetOpen(true)}
              >
                <Wallet className="size-4" />
                {copy.bulkPay.paySelected}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <BulkInvoicePaymentSheet
        invoices={selectedInvoices}
        open={paySheetOpen}
        locale={locale}
        onOpenChange={setPaySheetOpen}
        onPaid={() => {
          clearSelection();
          setRefreshKey((value) => value + 1);
        }}
      />
    </div>
  );
}
