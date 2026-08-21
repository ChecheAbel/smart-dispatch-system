"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Clock3 } from "lucide-react";
import type { DriverAttendanceRosterItem } from "@smart-dispatch/types";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { useAuth, useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminBadgeGoldClass, adminSelectTriggerClass } from "@/lib/admin-theme";
import {
  fetchDriverAttendanceRoster,
  type DriverAttendanceStatusFilter,
} from "@/lib/driver-attendance-api";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getAdminDriversMessages } from "@/translations";
import { AttendanceStats } from "./attendance-stats";
import {
  ATTENDANCE_STATUS_FILTERS,
  addisToday,
  attendanceStatusClass,
  attendanceStatusDotClass,
  formatAssignedVehicle,
  formatAttendanceTime,
  type AttendanceStatusFilter,
} from "./attendance-helpers";

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function DriverAttendancePage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDriversMessages(locale);
  const attendanceCopy = copy.attendance;
  const canRead = hasPermission(PERMISSIONS.drivers.read);
  const [workDate, setWorkDate] = useState(addisToday);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>("all");

  const columns = useMemo<DataTableColumn<DriverAttendanceRosterItem>[]>(
    () => [
      {
        id: "name",
        header: attendanceCopy.columns.name,
        cellClassName: "font-medium text-slate-800",
        cell: (row) => row.driver.name,
      },
      {
        id: "mobile",
        header: attendanceCopy.columns.mobile,
        cellClassName: "text-slate-500",
        cell: (row) => row.driver.mobile_number,
      },
      {
        id: "vehicle",
        header: attendanceCopy.columns.vehicle,
        cellClassName: "text-slate-600",
        cell: (row) => formatAssignedVehicle(row.driver.assigned_vehicle) ?? "—",
      },
      {
        id: "status",
        header: attendanceCopy.columns.status,
        cell: (row) => {
          const status = row.attendance?.status ?? "unmarked";
          return (
            <Badge variant="outline" className={cn("text-xs", attendanceStatusClass(status))}>
              {attendanceCopy.status[status]}
            </Badge>
          );
        },
      },
      {
        id: "checkIn",
        header: attendanceCopy.columns.checkIn,
        cellClassName: "tabular-nums text-slate-600",
        cell: (row) => formatAttendanceTime(row.attendance?.check_in_at ?? null, locale),
      },
      {
        id: "checkOut",
        header: attendanceCopy.columns.checkOut,
        cellClassName: "tabular-nums text-slate-600",
        cell: (row) => formatAttendanceTime(row.attendance?.check_out_at ?? null, locale),
      },
      {
        id: "notes",
        header: attendanceCopy.columns.notes,
        cellClassName: "max-w-[220px] truncate text-slate-500",
        cell: (row) => row.attendance?.notes || "—",
      },
    ],
    [attendanceCopy, locale],
  );

  const loadRoster = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchDriverAttendanceRoster({
        page,
        limit,
        search: search || undefined,
        date: workDate,
        status: statusFilter === "all" ? undefined : (statusFilter as DriverAttendanceStatusFilter),
      }),
    [statusFilter, workDate],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <AttendanceStats locale={locale} workDate={workDate} />

      <DataTable
        key={`${locale}-${workDate}-${statusFilter}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{attendanceCopy.eyebrow}</Badge>}
        title={attendanceCopy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={attendanceCopy.description}
        searchPlaceholder={attendanceCopy.searchPlaceholder}
        itemLabel={attendanceCopy.itemLabel}
        columns={columns}
        fetchData={loadRoster}
        getRowKey={(row) => row.driver.id}
        showIndexColumn
        minTableWidth="1080px"
        emptyIcon={Clock3}
        emptyTitle={attendanceCopy.empty.title}
        emptyDescription={attendanceCopy.empty.description}
        emptySearchDescription={attendanceCopy.empty.searchDescription}
        refreshDeps={[locale, workDate, statusFilter]}
        filterBar={
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDatePicker
              id="attendance-date-filter"
              label={attendanceCopy.filters.date}
              placeholder={attendanceCopy.filters.pickDate}
              value={parseLocalDate(workDate)}
              onChange={(date) => setWorkDate(date ? format(date, "yyyy-MM-dd") : addisToday())}
            />
            <div className="space-y-2">
              <Label
                htmlFor="attendance-status-filter"
                className="text-sm font-medium text-[#1C3A34] dark:text-foreground"
              >
                {attendanceCopy.filters.status}
              </Label>
              <Select
                items={ATTENDANCE_STATUS_FILTERS.map((status) => ({
                  label: attendanceCopy.filters.statusOptions[status],
                  value: status,
                }))}
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter((value as AttendanceStatusFilter | null) ?? "all");
                }}
              >
                <SelectTrigger
                  id="attendance-status-filter"
                  aria-label={attendanceCopy.filters.status}
                  className={cn(adminSelectTriggerClass, "w-full")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {ATTENDANCE_STATUS_FILTERS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status !== "all" ? (
                          <span className={cn("size-1.5 shrink-0 rounded-full", attendanceStatusDotClass(status))} />
                        ) : null}
                        {attendanceCopy.filters.statusOptions[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />
    </div>
  );
}
