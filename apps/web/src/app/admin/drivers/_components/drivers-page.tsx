"use client";

import { useCallback, useMemo, useState } from "react";
import { Eye, IdCard, MoreHorizontal } from "lucide-react";
import type { User } from "@smart-dispatch/types";
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
import { formatMessage, getAdminDriversMessages } from "@/translations";
import { fetchUsers } from "@/lib/user-api";
import { PERMISSIONS } from "@/lib/permissions";
import { adminBadgeGoldClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { DriverDetailSheet } from "./driver-detail-sheet";
import { DriverRatingCell } from "./driver-rating";
import { DriverStats } from "./driver-stats";
import {
  formatAssignedVehicle,
  formatDriverName,
  statusBadgeClass,
  type DriverAssignmentFilter,
  type DriverStatusFilter,
} from "./driver-helpers";

const STATUS_FILTERS: DriverStatusFilter[] = ["all", "active", "suspended", "deactivated"];
const ASSIGNMENT_FILTERS: DriverAssignmentFilter[] = ["all", "assigned", "unassigned"];

function DriverRowActions({
  user,
  viewLabel,
  menuLabel,
  onView,
}: {
  user: User;
  viewLabel: string;
  menuLabel: string;
  onView: (user: User) => void;
}) {
  const name = formatDriverName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(menuLabel, { name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onView(user)}>
            <Eye />
            {viewLabel}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DriversPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDriversMessages(locale);
  const canRead = hasPermission(PERMISSIONS.drivers.read);
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<DriverAssignmentFilter>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openDetail = useCallback((user: User) => {
    setDetailUserId(user.id);
    setDetailOpen(true);
  }, []);

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "name",
        header: copy.directory.columns.name,
        cellClassName: "font-medium text-slate-800",
        cell: (user) => formatDriverName(user),
      },
      {
        id: "email",
        header: copy.directory.columns.email,
        cellClassName: "text-slate-500",
        cell: (user) => user.email,
      },
      {
        id: "mobile",
        header: copy.directory.columns.mobile,
        cellClassName: "text-slate-500",
        cell: (user) => user.mobile_number,
      },
      {
        id: "license",
        header: copy.directory.columns.license,
        cellClassName: "font-mono text-xs tracking-wide text-slate-600",
        cell: (user) => user.driver?.license_number || "—",
      },
      {
        id: "rating",
        header: copy.directory.columns.rating,
        cell: (user) => (
          <DriverRatingCell
            rating={user.driver?.rating}
            unratedLabel={copy.directory.ratingUnrated}
            countTemplate={copy.directory.ratingCount}
          />
        ),
      },
      {
        id: "vehicle",
        header: copy.directory.columns.vehicle,
        cellClassName: "text-slate-600",
        cell: (user) => formatAssignedVehicle(user.assigned_vehicle) ?? copy.assignment.unassigned,
      },
      {
        id: "status",
        header: copy.directory.columns.status,
        cell: (user) => (
          <Badge variant="outline" className={cn("text-xs", statusBadgeClass(user.account_status))}>
            {copy.status[user.account_status]}
          </Badge>
        ),
      },
    ],
    [copy],
  );

  const loadDrivers = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchUsers({
        page,
        limit,
        search: search || undefined,
        role_slug: "driver",
        account_activation: "activated",
        account_status: statusFilter === "all" ? undefined : statusFilter,
        has_assigned_vehicle:
          assignmentFilter === "all" ? undefined : assignmentFilter === "assigned",
      }),
    [assignmentFilter, statusFilter],
  );

  const renderRowActions = useCallback(
    (user: User, _context: DataTableRowContext<User>) => (
      <DriverRowActions
        user={user}
        viewLabel={copy.directory.actions.view}
        menuLabel={copy.directory.actions.menuLabel}
        onView={openDetail}
      />
    ),
    [copy.directory.actions.menuLabel, copy.directory.actions.view, openDetail],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <DriverStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={`${locale}-${statusFilter}-${assignmentFilter}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.directory.eyebrow}</Badge>}
        title={copy.directory.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.directory.description}
        searchPlaceholder={copy.directory.searchPlaceholder}
        itemLabel={copy.directory.itemLabel}
        columns={columns}
        fetchData={loadDrivers}
        getRowKey={(user) => user.id}
        showIndexColumn
        renderRowActions={renderRowActions}
        actionsColumnHeader={copy.directory.columns.actions}
        minTableWidth="1180px"
        emptyIcon={IdCard}
        emptyTitle={copy.directory.empty.title}
        emptyDescription={copy.directory.empty.description}
        emptySearchDescription={copy.directory.empty.searchDescription}
        refreshDeps={[locale, refreshKey, statusFilter, assignmentFilter]}
        toolbarActions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select
              items={STATUS_FILTERS.map((status) => ({
                label: copy.directory.filters.statusOptions[status],
                value: status,
              }))}
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter((value as DriverStatusFilter | null) ?? "all");
              }}
            >
              <SelectTrigger
                id="driver-status-filter"
                aria-label={copy.directory.filters.status}
                className="h-10 w-full min-w-[11rem] rounded-lg border-slate-200 bg-white shadow-sm sm:w-[11rem]"
              >
                <SelectValue placeholder={copy.directory.filters.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS_FILTERS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {copy.directory.filters.statusOptions[status]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={ASSIGNMENT_FILTERS.map((assignment) => ({
                label: copy.directory.filters.assignmentOptions[assignment],
                value: assignment,
              }))}
              value={assignmentFilter}
              onValueChange={(value) => {
                setAssignmentFilter((value as DriverAssignmentFilter | null) ?? "all");
              }}
            >
              <SelectTrigger
                id="driver-assignment-filter"
                aria-label={copy.directory.filters.assignment}
                className="h-10 w-full min-w-[13rem] rounded-lg border-slate-200 bg-white shadow-sm sm:w-[13rem]"
              >
                <SelectValue placeholder={copy.directory.filters.assignment} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ASSIGNMENT_FILTERS.map((assignment) => (
                    <SelectItem key={assignment} value={assignment}>
                      {copy.directory.filters.assignmentOptions[assignment]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DriverDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userId={detailUserId}
        locale={locale}
      />
    </div>
  );
}
