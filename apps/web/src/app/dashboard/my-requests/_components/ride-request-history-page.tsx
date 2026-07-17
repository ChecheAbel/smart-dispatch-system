"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Route, Trash2 } from "lucide-react";
import type { RideRequest, RideRequestStatus } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { USER_REQUESTS_PATH } from "@/lib/auth-paths";
import { adminBadgeGoldClass, adminFilterLabelClass, adminHeadingClass } from "@/lib/admin-theme";
import { cancelRideRequest, fetchRideRequests } from "@/lib/ride-request-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  formatMessage,
  getCustomerRequestHistoryMessages,
  getCustomerRequestsMessages,
  getAdminContractsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { RideRequestStats } from "./ride-request-stats";
import { RideRequestContractBadge } from "@/app/dashboard/_components/ride-requests/ride-request-contract-info";
import { EditRideRequestSheet } from "@/app/dashboard/_components/ride-requests/edit-ride-request-sheet";
import { RideRequestDetailSheet } from "@/app/dashboard/_components/ride-requests/ride-request-detail-sheet";
import {
  formatScheduledAt,
  formatSubmittedAt,
  statusBadgeClass,
} from "@/app/dashboard/_components/ride-requests/ride-request-utils";

const STATUS_FILTER_ALL = "all";

const STATUS_FILTER_OPTIONS: RideRequestStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

type StatusFilterValue = RideRequestStatus | typeof STATUS_FILTER_ALL;

function StatusFilterSelect({
  value,
  onChange,
  statusLabel,
  statusAll,
  statusLabels,
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  statusLabel: string;
  statusAll: string;
  statusLabels: Record<RideRequestStatus, string>;
}) {
  const options: Array<{ value: StatusFilterValue; label: string }> = [
    { value: STATUS_FILTER_ALL, label: statusAll },
    ...STATUS_FILTER_OPTIONS.map((status) => ({
      value: status,
      label: statusLabels[status],
    })),
  ];

  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => onChange((next as StatusFilterValue | null) ?? STATUS_FILTER_ALL)}
    >
      <SelectTrigger
        id="ride-request-status-filter"
        aria-label={statusLabel}
        className="h-10 min-w-[9.5rem] rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm"
      >
        <span className={cn("mr-1.5 shrink-0 text-slate-500", adminFilterLabelClass)}>
          {statusLabel}:
        </span>
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
  );
}

export function RideRequestHistoryPage() {
  const { locale } = useLocale();
  const historyCopy = getCustomerRequestHistoryMessages(locale);
  const requestCopy = getCustomerRequestsMessages(locale);
  const contractCopy = getAdminContractsMessages(locale);
  const canWrite = usePermission("customer_requests.write");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(STATUS_FILTER_ALL);
  const [detailRequest, setDetailRequest] = useState<RideRequest | null>(null);
  const [editRequest, setEditRequest] = useState<RideRequest | null>(null);
  const [cancelRequest, setCancelRequest] = useState<RideRequest | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  const fetchData = useCallback(
    async ({ page, limit, search }: DataTableFetchParams) =>
      fetchRideRequests({
        locale,
        page,
        limit,
        search,
        status: statusFilter === STATUS_FILTER_ALL ? "" : statusFilter,
      }),
    [locale, statusFilter],
  );

  const columns = useMemo<DataTableColumn<RideRequest>[]>(
    () => [
      {
        id: "submitted",
        header: historyCopy.submittedAt,
        cell: (row) => (
          <span className="text-sm text-slate-600">{formatSubmittedAt(row.created_at, locale)}</span>
        ),
      },
      {
        id: "route",
        header: historyCopy.routeColumn,
        cell: (row) => (
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium text-[#1C3A34]">{row.pickup_address}</p>
            <p className="truncate text-sm text-slate-500">{row.dropoff_address}</p>
            {row.contract ? (
              <RideRequestContractBadge
                contract={row.contract}
                billingIntervalLabels={contractCopy.billingIntervals}
              />
            ) : null}
          </div>
        ),
      },
      {
        id: "status",
        header: historyCopy.statusFilter,
        cell: (row) => (
          <Badge variant="outline" className={cn("text-xs", statusBadgeClass(row.status))}>
            {requestCopy.status[row.status]}
          </Badge>
        ),
      },
      {
        id: "scheduled",
        header: historyCopy.scheduledColumn,
        cell: (row) => (
          <span className="text-sm text-slate-600">
            {formatScheduledAt(row.scheduled_at, locale)}
            {row.scheduled_return_at && ` - ${formatScheduledAt(row.scheduled_return_at, locale)}`}
          </span>
        ),
      },
    ],
    [contractCopy.billingIntervals, historyCopy, locale, requestCopy],
  );

  async function handleCancel() {
    if (!cancelRequest) return;

    try {
      await cancelRideRequest(cancelRequest.id, locale);
      showSuccessToast({ title: historyCopy.toast.cancelled });
      setCancelRequest(null);
      refresh();
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : historyCopy.errors.cancelFailed,
      });
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge className={adminBadgeGoldClass}>{historyCopy.eyebrow}</Badge>
          <h2 className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}>
            {historyCopy.title}
          </h2>
          <p className="max-w-3xl text-sm text-slate-500">{historyCopy.description}</p>
        </div>
        <Link
          href={USER_REQUESTS_PATH}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#1C3A34] hover:bg-[#f8fafb]"
        >
          <Route className="size-4" />
          {requestCopy.title}
        </Link>
      </div>

      <RideRequestStats locale={locale} refreshKey={refreshToken} />

      <DataTable
        title={historyCopy.tableTitle}
        description={historyCopy.tableDescription}
        searchPlaceholder={historyCopy.searchPlaceholder}
        itemLabel={historyCopy.itemLabel}
        columns={columns}
        fetchData={fetchData}
        getRowKey={(row) => row.id}
        showIndexColumn
        emptyIcon={Route}
        emptyTitle={historyCopy.emptyTitle}
        emptyDescription={historyCopy.emptyDescription}
        emptySearchDescription={historyCopy.emptySearchDescription}
        refreshDeps={[refreshToken, statusFilter]}
        minTableWidth="900px"
        actionsColumnHeader={historyCopy.actions}
        toolbarActions={
          <StatusFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            statusLabel={historyCopy.statusFilter}
            statusAll={historyCopy.statusAll}
            statusLabels={requestCopy.status}
          />
        }
        renderRowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
                  aria-label={historyCopy.actions}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setDetailRequest(row)}>
                  <Eye className="size-4" />
                  {historyCopy.view}
                </DropdownMenuItem>
                {canWrite && row.can_edit ? (
                  <DropdownMenuItem onClick={() => setEditRequest(row)}>
                    <Pencil className="size-4" />
                    {historyCopy.edit}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
              {canWrite && row.can_cancel ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setCancelRequest(row)}
                  >
                    <Trash2 className="size-4" />
                    {historyCopy.cancel}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <RideRequestDetailSheet
        request={detailRequest}
        open={Boolean(detailRequest)}
        locale={locale}
        onOpenChange={(open: boolean) => !open && setDetailRequest(null)}
        requester={detailRequest?.requester ?? undefined}
        requesterLabels={{
          section: historyCopy.detailRequesterSection,
          description: historyCopy.detailRequesterDescription,
          email: historyCopy.detailRequesterEmail,
          mobile: historyCopy.detailRequesterMobile,
          organization: historyCopy.detailOrganization,
          governmentEntityType: historyCopy.detailGovernmentEntityType,
          segmentLabels: historyCopy.detailRequesterSegment,
        }}
      />

      <EditRideRequestSheet
        request={editRequest}
        open={Boolean(editRequest)}
        locale={locale}
        onOpenChange={(open: boolean) => !open && setEditRequest(null)}
        onUpdated={() => refresh()}
      />

      <DeleteConfirmModal
        open={Boolean(cancelRequest)}
        onOpenChange={(open) => !open && setCancelRequest(null)}
        title={historyCopy.cancelTitle}
        description={historyCopy.cancelDescription}
        confirmLabel={historyCopy.cancelConfirm}
        deletingLabel={historyCopy.cancelling}
        onConfirm={handleCancel}
      />
    </div>
  );
}
