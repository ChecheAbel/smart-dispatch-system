import { useMemo } from "react";
import Link from "next/link";
import { Car, Eye, Mail, Phone } from "lucide-react";
import type { User } from "@smart-dispatch/types";
import type { DataTableColumn, DataTableRowContext } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatMessage, type AdminDriversMessages } from "@/translations";
import { DriverRatingCell } from "./driver-rating";
import { DriverStatusBadge } from "./driver-status-badge";
import {
  formatAssignedVehicle,
  formatDriverName,
  getDriverInitials,
} from "./driver-helpers";

export function DriverRowActions({
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

type UseDriverColumnsProps = {
  copy: AdminDriversMessages;
  openDetail: (user: User) => void;
};

export function useDriverColumns({
  copy,
  openDetail,
}: UseDriverColumnsProps): {
  columns: DataTableColumn<User>[];
  renderRowActions: (user: User, context: DataTableRowContext<User>) => React.ReactNode;
} {
  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "name",
        header: copy.directory.columns.name,
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
        id: "email",
        header: copy.directory.columns.email,
        cellClassName: "whitespace-nowrap",
        cell: (user) =>
          user.email ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-muted-foreground">
              <Mail className="size-3.5 shrink-0 text-slate-400" />
              <span>{user.email}</span>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "mobile",
        header: copy.directory.columns.mobile,
        cellClassName: "whitespace-nowrap",
        cell: (user) =>
          user.mobile_number ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-muted-foreground">
              <Phone className="size-3.5 shrink-0 text-slate-400" />
              <span className="font-mono">{user.mobile_number}</span>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "license",
        header: copy.directory.columns.license,
        cellClassName: "whitespace-nowrap",
        cell: (user) =>
          user.driver?.license_number ? (
            <span className="inline-block rounded border border-slate-200/80 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
              {user.driver.license_number}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "rating",
        header: copy.directory.columns.rating,
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
        id: "vehicle",
        header: copy.directory.columns.vehicle,
        cellClassName: "whitespace-nowrap",
        cell: (user) => {
          const vehicle = user.assigned_vehicle;
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
        header: copy.directory.columns.status,
        cellClassName: "whitespace-nowrap",
        cell: (user) => (
          <DriverStatusBadge
            status={user.account_status}
            label={copy.status[user.account_status]}
          />
        ),
      },
    ],
    [copy, openDetail],
  );

  const renderRowActions = (user: User) => (
    <DriverRowActions
      user={user}
      viewLabel={copy.directory.actions.view}
      menuLabel={copy.directory.actions.menuLabel}
      onView={openDetail}
    />
  );

  return { columns, renderRowActions };
}
