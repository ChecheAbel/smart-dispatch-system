"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Calendar,
  CalendarClock,
  CarFront,
  Clock3,
  Eye,
  FileText,
  RotateCcw,
  Wallet,
} from "lucide-react";
import type {
  AdminRideRequest,
  RideRequestRequesterSummary,
  RideRequestStatus,
} from "@smart-dispatch/types";
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
import {
  adminEyebrowClass,
  adminFilterLabelClass,
  adminSelectTriggerClass,
} from "@/lib/admin-theme";
import {
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
  "no_show",
];

const STATUS_DOT_CLASS: Record<RideRequestStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  in_progress: "bg-violet-500 animate-pulse",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
  no_show: "bg-orange-500",
};

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
        cell: (request) => {
          const req = request.requester;
          if (!req) return <span className="text-slate-400">—</span>;

          const fullName = [req.first_name, req.middle_name, req.last_name]
            .filter(Boolean)
            .join(" ");
          const initial = req.first_name ? req.first_name.slice(0, 1).toUpperCase() : "?";
          const contact = req.mobile_number || req.email;

          return (
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-xs font-bold text-[var(--brand-primary)] dark:bg-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)] dark:text-[var(--brand-accent)]">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-foreground">
                  {fullName || "—"}
                </p>
                {contact ? (
                  <p className="truncate text-[11px] text-slate-400 dark:text-muted-foreground">
                    {contact}
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "route",
        header: copy.columns.route,
        cell: (request) => {
          const pickup = request.pickup_location?.name ?? request.pickup_address;
          const dropoff = request.dropoff_location?.name ?? request.dropoff_address;

          return (
            <div className="min-w-0 max-w-[14rem] space-y-1 text-xs">
              <div className="flex items-center gap-1.5 truncate text-slate-800 dark:text-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-2xs" />
                <span className="truncate font-medium">{pickup}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate text-slate-500 dark:text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-rose-500 shadow-2xs" />
                <span className="truncate">{dropoff}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "contract",
        header: copy.columns.contract,
        cell: (request) =>
          request.contract ? (
            <RideRequestContractBadge
              contract={request.contract}
              billingIntervalLabels={contractCopy.billingIntervals}
              compact
            />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
              <Wallet className="size-3 text-slate-400" />
              <span>{copy.columns.oneTimeBilling}</span>
            </span>
          ),
      },
      {
        id: "scheduled",
        header: copy.columns.scheduled,
        cell: (request) =>
          request.scheduled_at ? (
            <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-muted-foreground">
              <Clock3 className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <div className="whitespace-nowrap">
                <p className="font-medium">{formatScheduledAt(request.scheduled_at, locale)}</p>
                {request.scheduled_return_at ? (
                  <p className="text-[10px] text-slate-400 dark:text-muted-foreground">
                    ↩ {formatScheduledAt(request.scheduled_return_at, locale)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "assignment",
        header: copy.columns.assignment,
        cell: (request) => {
          const plate = request.assigned_vehicle?.plate_number;
          const driver = request.assigned_driver?.name;

          if (plate || driver) {
            return (
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-muted dark:text-foreground">
                  <CarFront className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-slate-900 dark:text-foreground">
                    {plate || "—"}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-muted-foreground">
                    {driver || "—"}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/70 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              <Clock3 className="size-3" />
              <span>{locale === "am" ? "ያልተመደበ" : "Unassigned"}</span>
            </span>
          );
        },
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (request) => {
          const status = request.status;
          const dotClass = STATUS_DOT_CLASS[status] || "bg-slate-400";

          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                statusBadgeClass(status),
                "dark:border-border dark:bg-muted/40 dark:text-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full shrink-0", dotClass)} />
              <span>{requestCopy.status[status] || status}</span>
            </span>
          );
        },
      },
      {
        id: "submitted",
        header: copy.columns.submitted,
        cell: (request) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground">
            <Calendar className="size-3.5 shrink-0 text-slate-400" />
            <span className="whitespace-nowrap">
              {formatSubmittedAt(request.created_at, locale)}
            </span>
          </div>
        ),
      },
    ],
    [contractCopy.billingIntervals, copy.columns, locale, requestCopy.status],
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
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] dark:text-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent)]/10"
        aria-label={copy.actions.review}
        onClick={() => openReview(request)}
      >
        <Eye className="size-3.5" />
        <span>{copy.actions.review}</span>
      </Button>
    ),
    [copy.actions.review, openReview],
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
      {/* Interactive Metric Filter Cards */}
      <AdminRideRequestStats
        locale={locale}
        refreshKey={refreshKey}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Main Ride Requests Table */}
      <DataTable
        key={`${locale}-${statusFilter}`}
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>}
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
        emptyIcon={FileText}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey, statusFilter]}
        toolbarActions={
          <div className="flex items-center gap-2">
            {statusFilter !== STATUS_FILTER_ALL ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 gap-1 px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
                onClick={() => setStatusFilter(STATUS_FILTER_ALL)}
              >
                <RotateCcw className="size-3.5" />
                <span>{locale === "am" ? "አጽዳ" : "Reset"}</span>
              </Button>
            ) : null}

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
                className={cn(adminSelectTriggerClass, "h-10 w-full min-w-[11.5rem] shadow-xs sm:w-[12rem]")}
              >
                <span className={cn("mr-1.5 shrink-0 text-slate-400 dark:text-muted-foreground", adminFilterLabelClass)}>
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
          </div>
        }
      />

      {/* Review & Reassignment Drawer */}
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

