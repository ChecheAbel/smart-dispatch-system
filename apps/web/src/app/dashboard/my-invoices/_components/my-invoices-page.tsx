"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Receipt } from "lucide-react";
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
} from "@/lib/admin-theme";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";
import { fetchMyInvoices } from "@/lib/customer-billing-api";
import { PERMISSIONS } from "@/lib/permissions";
import { formatMessage, getCustomerInvoicesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
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
  const [refreshKey] = useState(0);

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
        cellClassName: "text-slate-500",
        cell: (invoice) => formatDate(invoice.due_at, locale),
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
        refreshDeps={[statusFilter]}
        toolbarActions={
          <StatusFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
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
    </div>
  );
}
