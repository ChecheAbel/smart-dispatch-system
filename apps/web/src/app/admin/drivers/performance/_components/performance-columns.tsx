import { useMemo } from "react";
import { Eye } from "lucide-react";
import type { User } from "@smart-dispatch/types";
import type { DataTableColumn, DataTableRowContext } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatMessage, type AdminDriversMessages } from "@/translations";
import { DriverRatingCell } from "../../_components/driver-rating";
import {
  formatDriverName,
  formatPercent,
  getDriverInitials,
} from "../../_components/driver-helpers";

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export function DriverPerformanceRowActions({
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
    <div className="flex items-center justify-end">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onView(user)}
        className="size-8 text-slate-500 hover:bg-[#1C3A34]/8 hover:text-[#1C3A34] dark:hover:bg-accent dark:hover:text-foreground"
        title={viewLabel}
        aria-label={formatMessage(menuLabel, { name })}
      >
        <Eye className="size-4" />
      </Button>
    </div>
  );
}

type UsePerformanceColumnsProps = {
  copy: AdminDriversMessages;
  openDetail: (user: User) => void;
};

export function usePerformanceColumns({
  copy,
  openDetail,
}: UsePerformanceColumnsProps): {
  columns: DataTableColumn<User>[];
  renderRowActions: (user: User, context: DataTableRowContext<User>) => React.ReactNode;
} {
  const performanceCopy = copy.performance;

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "name",
        header: performanceCopy.columns.name,
        cellClassName: "whitespace-nowrap",
        cell: (user) => {
          const name = formatDriverName(user);
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1C3A34]/8 text-xs font-bold text-[#1C3A34] dark:bg-[var(--brand-accent)]/15 dark:text-[var(--brand-accent)]">
                {getDriverInitials(user)}
              </div>
              <button
                type="button"
                onClick={() => openDetail(user)}
                className="truncate font-semibold text-slate-800 transition-colors hover:text-[#1C3A34] hover:underline dark:text-foreground dark:hover:text-[var(--brand-accent)]"
              >
                {name}
              </button>
            </div>
          );
        },
      },
      {
        id: "rating",
        header: performanceCopy.columns.rating,
        cellClassName: "whitespace-nowrap",
        cell: (user) => (
          <DriverRatingCell
            rating={user.driver?.rating}
            unratedLabel={copy.directory.ratingUnrated}
            countTemplate={copy.directory.ratingCount}
            compact
          />
        ),
      },
      {
        id: "completed",
        header: performanceCopy.columns.completed,
        cellClassName: "whitespace-nowrap tabular-nums text-slate-700 dark:text-foreground",
        cell: (user) => dash(user.driver?.performance.trips_completed ?? 0),
      },
      {
        id: "completionRate",
        header: performanceCopy.columns.completionRate,
        cellClassName: "whitespace-nowrap tabular-nums font-semibold text-slate-800 dark:text-foreground",
        cell: (user) => dash(formatPercent(user.driver?.performance.completion_rate)),
      },
      {
        id: "noShows",
        header: performanceCopy.columns.noShows,
        cellClassName: "whitespace-nowrap tabular-nums text-slate-700 dark:text-foreground",
        cell: (user) => dash(user.driver?.performance.trips_no_show ?? 0),
      },
      {
        id: "onTime",
        header: performanceCopy.columns.onTime,
        cellClassName: "whitespace-nowrap tabular-nums text-slate-700 dark:text-foreground",
        cell: (user) => dash(formatPercent(user.driver?.performance.on_time_rate)),
      },
      {
        id: "complaints",
        header: performanceCopy.columns.complaints,
        cellClassName: "whitespace-nowrap tabular-nums text-slate-700 dark:text-foreground",
        cell: (user) => dash(user.driver?.performance.complaints ?? 0),
      },
      {
        id: "attendance",
        header: performanceCopy.columns.attendance,
        cellClassName: "whitespace-nowrap tabular-nums text-slate-700 dark:text-foreground",
        cell: (user) => dash(formatPercent(user.driver?.performance.attendance_rate)),
      },
    ],
    [copy.directory.ratingCount, copy.directory.ratingUnrated, openDetail, performanceCopy],
  );

  const renderRowActions = (user: User) => (
    <DriverPerformanceRowActions
      user={user}
      viewLabel={copy.directory.actions.view}
      menuLabel={copy.directory.actions.menuLabel}
      onView={openDetail}
    />
  );

  return { columns, renderRowActions };
}
