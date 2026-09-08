import { useMemo } from "react";
import Link from "next/link";
import { Car, Phone } from "lucide-react";
import type { DriverAttendanceRosterItem } from "@smart-dispatch/types";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdminDriversMessages } from "@/translations";
import {
  attendanceStatusClass,
  attendanceStatusDotClass,
  driverInitials,
  formatAssignedVehicle,
  formatAttendanceTime,
} from "./attendance-helpers";

type UseAttendanceColumnsProps = {
  copy: AdminDriversMessages;
  locale: string;
};

export function useAttendanceColumns({
  copy,
  locale,
}: UseAttendanceColumnsProps): {
  columns: DataTableColumn<DriverAttendanceRosterItem>[];
} {
  const attendanceCopy = copy.attendance;

  const columns = useMemo<DataTableColumn<DriverAttendanceRosterItem>[]>(
    () => [
      {
        id: "name",
        header: attendanceCopy.columns.name,
        cellClassName: "whitespace-nowrap",
        cell: (row) => (
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1C3A34]/8 text-xs font-bold text-[#1C3A34] dark:bg-[var(--brand-accent)]/15 dark:text-[var(--brand-accent)]">
              {driverInitials(row.driver.name)}
            </div>
            <span className="font-semibold text-slate-800 dark:text-foreground">
              {row.driver.name}
            </span>
          </div>
        ),
      },
      {
        id: "mobile",
        header: attendanceCopy.columns.mobile,
        cellClassName: "whitespace-nowrap",
        cell: (row) =>
          row.driver.mobile_number ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-muted-foreground">
              <Phone className="size-3.5 shrink-0 text-slate-400" />
              <span className="font-mono">{row.driver.mobile_number}</span>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "vehicle",
        header: attendanceCopy.columns.vehicle,
        cellClassName: "whitespace-nowrap",
        cell: (row) => {
          const vehicle = row.driver.assigned_vehicle;
          if (!vehicle) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/60 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-500" />
                {copy.assignment.unassigned}
              </span>
            );
          }

          return (
            <Link
              href={`/admin/fleet/vehicles/${vehicle.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-[#1C3A34] transition-colors hover:border-[#1C3A34]/30 hover:bg-[#1C3A34]/8 dark:border-border dark:bg-muted/50 dark:text-foreground dark:hover:bg-accent"
            >
              <Car className="size-3.5 text-slate-400" />
              <span>{formatAssignedVehicle(vehicle)}</span>
            </Link>
          );
        },
      },
      {
        id: "status",
        header: attendanceCopy.columns.status,
        cellClassName: "whitespace-nowrap",
        cell: (row) => {
          const status = row.attendance?.status ?? "unmarked";
          return (
            <Badge
              variant="outline"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                attendanceStatusClass(status),
              )}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  attendanceStatusDotClass(status),
                  status === "absent" && "animate-pulse",
                )}
              />
              <span>{attendanceCopy.status[status]}</span>
            </Badge>
          );
        },
      },
      {
        id: "checkIn",
        header: attendanceCopy.columns.checkIn,
        cellClassName: "whitespace-nowrap tabular-nums text-slate-600 dark:text-muted-foreground",
        cell: (row) => formatAttendanceTime(row.attendance?.check_in_at ?? null, locale),
      },
      {
        id: "checkOut",
        header: attendanceCopy.columns.checkOut,
        cellClassName: "whitespace-nowrap tabular-nums text-slate-600 dark:text-muted-foreground",
        cell: (row) => formatAttendanceTime(row.attendance?.check_out_at ?? null, locale),
      },
      {
        id: "notes",
        header: attendanceCopy.columns.notes,
        cellClassName: "max-w-[240px] truncate text-slate-500 dark:text-muted-foreground",
        cell: (row) => row.attendance?.notes || "—",
      },
    ],
    [attendanceCopy, copy.assignment.unassigned, locale],
  );

  return { columns };
}
