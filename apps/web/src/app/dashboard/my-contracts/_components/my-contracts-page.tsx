"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import type { ContractStatus, CustomerContractEnrollment } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminBadgeGoldClass, adminHeadingClass } from "@/lib/admin-theme";
import { fetchMyContractEnrollments } from "@/lib/customer-billing-api";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";
import { PERMISSIONS } from "@/lib/permissions";
import {
  formatMessage,
  getAdminContractsMessages,
  getCustomerContractsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";

const CONTRACT_STATUS_CLASS: Record<ContractStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  expired: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function MyContractsPage() {
  const { locale } = useLocale();
  const copy = getCustomerContractsMessages(locale);
  const contractCopy = getAdminContractsMessages(locale);
  const canRead = usePermission(PERMISSIONS.customer.contracts);

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
      renderRowActions={(row) =>
        row.invoice ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            render={<Link href={`/dashboard/my-invoices/${row.invoice!.id}`} />}
            nativeButton={false}
            aria-label={row.invoice.reference_number}
          >
            <Eye className="size-4" />
          </Button>
        ) : null
      }
      emptyTitle={copy.empty.title}
      emptyDescription={copy.empty.description}
      emptySearchDescription={copy.empty.searchDescription}
      emptyIcon={FileText}
    />
  );
}
