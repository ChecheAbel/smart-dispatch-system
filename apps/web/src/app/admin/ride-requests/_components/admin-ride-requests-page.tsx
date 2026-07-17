"use client";

import { useCallback, useMemo, useState } from "react";
import { ClipboardList, Eye, MoreHorizontal } from "lucide-react";
import type { AdminRideRequest, RideRequestRequesterSummary, RideRequestStatus } from "@smart-dispatch/types";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatScheduledAt,
  formatSubmittedAt,
  statusBadgeClass,
} from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { RideRequestContractBadge } from "@/app/dashboard/_components/ride-requests/ride-request-contract-info";
import { fetchAdminRideRequests } from "@/lib/admin-ride-request-api";
import { PERMISSIONS } from "@/lib/permissions";
import { adminBadgeGoldClass, adminFilterLabelClass } from "@/lib/admin-theme";
import {
  formatMessage,
  getAdminContractsMessages,
  getAdminRideRequestsMessages,
  getCustomerRequestsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { AdminRideRequestStats, type AdminRideRequestListFilter } from "./admin-ride-request-stats";
import { AdminRideRequestReviewSheet } from "./admin-ride-request-review-sheet";

const STATUS_FILTER_ALL = "all";
const STATUS_FILTER_UPCOMING = "upcoming";

const STATUS_FILTER_OPTIONS: RideRequestStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

function formatRequesterName(requester?: RideRequestRequesterSummary) {
  if (!requester) {
    return "—";
  }

  return [requester.first_name, requester.middle_name, requester.last_name].filter(Boolean).join(" ");
}

function formatRoute(request: AdminRideRequest) {
  const pickup = request.pickup_location?.name ?? request.pickup_address;
  const dropoff = request.dropoff_location?.name ?? request.dropoff_address;
  return `${pickup} → ${dropoff}`;
}

function formatAssignment(request: AdminRideRequest) {
  const plate = request.assigned_vehicle?.plate_number;
  const driver = request.assigned_driver?.name;

  if (plate && driver) {
    return `${plate} · ${driver}`;
  }

  return plate ?? driver ?? "—";
}

function RideRequestRowActions({
  reviewLabel,
  menuLabel,
  onReview,
}: {
  reviewLabel: string;
  menuLabel: string;
  onReview: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={menuLabel}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onReview}>
            <Eye />
            {reviewLabel}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminRideRequestsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminRideRequestsMessages(locale);
  const requestCopy = getCustomerRequestsMessages(locale);
  const contractCopy = getAdminContractsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.ride_requests.read);
  const canWrite = hasPermission(PERMISSIONS.ride_requests.write);
  const [statusFilter, setStatusFilter] = useState<AdminRideRequestListFilter>(STATUS_FILTER_ALL);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function bumpRefresh() {
    setRefreshKey((value) => value + 1);
  }

  function handleReviewSuccess(result?: { status: RideRequestStatus }) {
    bumpRefresh();

    if (result?.status === "cancelled") {
      setStatusFilter("cancelled");
      return;
    }

    if (result?.status === "confirmed") {
      setStatusFilter("confirmed");
      return;
    }

    if (result?.status === "in_progress") {
      setStatusFilter("in_progress");
      return;
    }

    if (result?.status === "completed") {
      setStatusFilter("completed");
    }
  }

  const openReview = useCallback((request: AdminRideRequest) => {
    setReviewRequestId(request.id);
    setReviewOpen(true);
  }, []);

  const columns = useMemo<DataTableColumn<AdminRideRequest>[]>(
    () => [
      {
        id: "requester",
        header: copy.columns.requester,
        cellClassName: "font-medium text-slate-800",
        cell: (request) => formatRequesterName(request.requester),
      },
      {
        id: "route",
        header: copy.columns.route,
        cellClassName: "max-w-[12rem] truncate text-slate-600",
        cell: (request) => formatRoute(request),
      },
      {
        id: "contract",
        header: copy.columns.contract,
        cellClassName: "max-w-[8.5rem]",
        cell: (request) =>
          request.contract ? (
            <RideRequestContractBadge
              contract={request.contract}
              billingIntervalLabels={contractCopy.billingIntervals}
              compact
            />
          ) : (
            <span className="text-sm text-slate-400">{copy.columns.oneTimeBilling}</span>
          ),
      },
      {
        id: "scheduled",
        header: copy.columns.scheduled,
        cellClassName: "text-slate-500",
        cell: (request) =>
          request.scheduled_at
            ? formatScheduledAt(request.scheduled_at, locale) +
              (request.scheduled_return_at ? ` - ${formatScheduledAt(request.scheduled_return_at, locale)}` : "")
            : "—",
      },
      {
        id: "assignment",
        header: copy.columns.assignment,
        cellClassName: "max-w-[11rem] truncate text-slate-600",
        cell: (request) => formatAssignment(request),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (request) => (
          <Badge variant="outline" className={cn("text-xs", statusBadgeClass(request.status))}>
            {requestCopy.status[request.status]}
          </Badge>
        ),
      },
      {
        id: "submitted",
        header: copy.columns.submitted,
        cellClassName: "text-slate-500",
        cell: (request) => formatSubmittedAt(request.created_at, locale),
      },
    ],
    [contractCopy.billingIntervals, copy.columns, locale, requestCopy],
  );

  const loadRideRequests = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchAdminRideRequests({
        locale,
        page,
        limit,
        search: search || undefined,
        ...(statusFilter === STATUS_FILTER_UPCOMING
          ? { upcoming: true }
          : { status: statusFilter === STATUS_FILTER_ALL ? "" : statusFilter }),
      }),
    [locale, statusFilter],
  );

  const renderRowActions = useCallback(
    (request: AdminRideRequest, _context: DataTableRowContext<AdminRideRequest>) => (
      <RideRequestRowActions
        reviewLabel={copy.actions.review}
        menuLabel={copy.actions.menuLabel}
        onReview={() => openReview(request)}
      />
    ),
    [copy.actions.menuLabel, copy.actions.review, openReview],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const statusOptions: Array<{ value: AdminRideRequestListFilter; label: string }> = [
    { value: STATUS_FILTER_ALL, label: copy.filters.statusAll },
    { value: STATUS_FILTER_UPCOMING, label: copy.filters.upcoming },
    ...STATUS_FILTER_OPTIONS.map((status) => ({
      value: status,
      label: requestCopy.status[status],
    })),
  ];

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <AdminRideRequestStats
        locale={locale}
        refreshKey={refreshKey}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <DataTable
        key={`${locale}-${statusFilter}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadRideRequests}
        getRowKey={(request) => request.id}
        showIndexColumn
        renderRowActions={renderRowActions}
        actionsColumnHeader={copy.columns.actions}
        minTableWidth="1240px"
        emptyIcon={ClipboardList}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey, statusFilter]}
        toolbarActions={
          <Select
            items={statusOptions}
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter((value as AdminRideRequestListFilter | null) ?? STATUS_FILTER_ALL);
            }}
          >
            <SelectTrigger
              id="admin-ride-request-status-filter"
              aria-label={copy.filters.status}
              className="h-10 w-full min-w-[11rem] rounded-lg border-slate-200 bg-white shadow-sm sm:w-[11rem]"
            >
              <span className={cn("mr-1.5 shrink-0 text-slate-500", adminFilterLabelClass)}>
                {copy.filters.status}:
              </span>
              <SelectValue placeholder={copy.filters.status} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        }
      />

      <AdminRideRequestReviewSheet
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) {
            setReviewRequestId(null);
          }
        }}
        requestId={reviewRequestId}
        locale={locale}
        canWrite={canWrite}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}
