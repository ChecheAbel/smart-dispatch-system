"use client";

import { useCallback, useState } from "react";
import { IdCard, RotateCcw } from "lucide-react";
import type { User } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminDriversMessages } from "@/translations";
import { fetchUsers } from "@/lib/user-api";
import { PERMISSIONS } from "@/lib/permissions";
import { adminEyebrowClass, adminSelectTriggerClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { DriverDetailSheet } from "./driver-detail-sheet";
import { DriverStats } from "./driver-stats";
import { useDriverColumns } from "./driver-columns";
import type { DriverAssignmentFilter, DriverStatusFilter } from "./driver-helpers";

const STATUS_FILTERS: DriverStatusFilter[] = ["all", "active", "suspended", "deactivated"];
const ASSIGNMENT_FILTERS: DriverAssignmentFilter[] = ["all", "assigned", "unassigned"];

export function DriversPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDriversMessages(locale);
  const canRead = hasPermission(PERMISSIONS.drivers.read);
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<DriverAssignmentFilter>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [refreshKey] = useState(0);

  const openDetail = useCallback((user: User) => {
    setDetailUserId(user.id);
    setDetailOpen(true);
  }, []);

  const handleStatFilterChange = useCallback(
    (status: DriverStatusFilter, assignment: DriverAssignmentFilter) => {
      setStatusFilter(status);
      setAssignmentFilter(assignment);
    },
    [],
  );

  const handleResetFilters = useCallback(() => {
    setStatusFilter("all");
    setAssignmentFilter("all");
  }, []);

  const isFiltered = statusFilter !== "all" || assignmentFilter !== "all";

  const { columns, renderRowActions } = useDriverColumns({
    copy,
    openDetail,
  });

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

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const statusItems = STATUS_FILTERS.map((status) => ({
    label: copy.directory.filters.statusOptions[status],
    value: status,
  }));

  const assignmentItems = ASSIGNMENT_FILTERS.map((assignment) => ({
    label: copy.directory.filters.assignmentOptions[assignment],
    value: assignment,
  }));

  return (
    <div className="space-y-6">
      <DriverStats
        locale={locale}
        refreshKey={refreshKey}
        activeStatus={statusFilter}
        activeAssignment={assignmentFilter}
        onFilterChange={handleStatFilterChange}
      />

      <DataTable
        key={`${locale}-${statusFilter}-${assignmentFilter}`}
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{copy.directory.eyebrow}</p>}
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
        minTableWidth="980px"
        emptyIcon={IdCard}
        emptyTitle={copy.directory.empty.title}
        emptyDescription={copy.directory.empty.description}
        emptySearchDescription={copy.directory.empty.searchDescription}
        refreshDeps={[locale, refreshKey, statusFilter, assignmentFilter]}
        toolbarActions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select
              items={statusItems}
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter((value as DriverStatusFilter | null) ?? "all");
              }}
            >
              <SelectTrigger
                id="driver-status-filter"
                aria-label={copy.directory.filters.status}
                className={cn(adminSelectTriggerClass, "w-full min-w-[11rem] sm:w-[11rem]")}
              >
                <SelectValue placeholder={copy.directory.filters.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              items={assignmentItems}
              value={assignmentFilter}
              onValueChange={(value) => {
                setAssignmentFilter((value as DriverAssignmentFilter | null) ?? "all");
              }}
            >
              <SelectTrigger
                id="driver-assignment-filter"
                aria-label={copy.directory.filters.assignment}
                className={cn(adminSelectTriggerClass, "w-full min-w-[13rem] sm:w-[13rem]")}
              >
                <SelectValue placeholder={copy.directory.filters.assignment} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {assignmentItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {isFiltered && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-border dark:bg-card dark:text-muted-foreground"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">{copy.directory.filters.statusOptions.all}</span>
              </Button>
            )}
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
