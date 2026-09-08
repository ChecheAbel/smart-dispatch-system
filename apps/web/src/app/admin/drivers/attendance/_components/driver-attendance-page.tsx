"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Clock3 } from "lucide-react";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import {
  DataTable,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { useAuth, useLocale } from "@/components/shared/providers";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminEyebrowClass,
  adminSelectTriggerClass,
} from "@/lib/admin-theme";
import {
  fetchDriverAttendanceRoster,
  type DriverAttendanceStatusFilter,
} from "@/lib/driver-attendance-api";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getAdminDriversMessages } from "@/translations";
import { AttendanceStats } from "./attendance-stats";
import { useAttendanceColumns } from "./attendance-columns";
import {
  ATTENDANCE_STATUS_FILTERS,
  addisToday,
  attendanceStatusDotClass,
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

  const { columns } = useAttendanceColumns({ copy, locale });

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
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{attendanceCopy.eyebrow}</p>}
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
