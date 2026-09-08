"use client";

import Link from "next/link";
import { Car, CheckCircle2, Eye, MoreHorizontal } from "lucide-react";
import type {
  VehicleMaintenanceLog,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import type { DataTableColumn } from "@/components/shared/data-table";
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
  formatMaintenanceDateTime,
  maintenanceTypeIcon,
} from "@/app/admin/fleet/vehicles/[id]/_components/vehicle-detail-shared";
import { MaintenanceStatusBadge } from "./maintenance-status-badge";

type MaintenanceColumnsOptions = {
  locale: string;
  canWrite: boolean;
  onView: (log: VehicleMaintenanceLog) => void;
  onUpdateStatus: (log: VehicleMaintenanceLog, status: VehicleMaintenanceStatus) => void;
  copy: {
    vehicle: string;
    workType: string;
    titleColumn: string;
    status: string;
    driverAtRequest: string;
    unassignedDriver: string;
    notSet: string;
    requestedAt: string;
    actions: string;
    view: string;
    markOpen: string;
    markInProgress: string;
    markCompleted: string;
    markCancelled: string;
  };
  statusLabels: Record<VehicleMaintenanceStatus, string>;
};

export function getMaintenanceColumns({
  locale,
  canWrite,
  onView,
  onUpdateStatus,
  copy,
  statusLabels,
}: MaintenanceColumnsOptions): DataTableColumn<VehicleMaintenanceLog>[] {
  return [
    {
      id: "vehicle",
      header: copy.vehicle,
      cell: (log) => (
        <Link
          href={`/admin/fleet/vehicles/${log.vehicle_id}`}
          className="group inline-flex items-center gap-1.5 rounded-md border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-[#1C3A34] transition-all hover:border-[#1C3A34]/30 hover:bg-[#1C3A34]/8 dark:border-border dark:bg-muted/50 dark:text-foreground dark:hover:bg-accent"
        >
          <Car className="size-3 text-slate-400 transition-colors group-hover:text-[#1C3A34] dark:group-hover:text-[var(--brand-accent)]" />
          <span>{log.vehicle.plate_number}</span>
        </Link>
      ),
    },
    {
      id: "work_type",
      header: copy.workType,
      cell: (log) => {
        const Icon = maintenanceTypeIcon(log.work_type.slug);
        return (
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-muted dark:text-foreground">
              <Icon className="size-3.5" />
            </div>
            <span className="font-medium text-slate-800 dark:text-foreground">
              {log.work_type.name}
            </span>
          </div>
        );
      },
    },
    {
      id: "title",
      header: copy.titleColumn,
      cell: (log) => (
        <div className="max-w-64">
          <p className="truncate font-medium text-slate-800 dark:text-foreground">
            {log.title}
          </p>
          <p className="truncate text-xs text-slate-500">
            {log.vendor || log.description || copy.notSet}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: copy.status,
      cell: (log) => (
        <MaintenanceStatusBadge
          status={log.status}
          label={statusLabels[log.status]}
        />
      ),
    },
    {
      id: "driver",
      header: copy.driverAtRequest,
      cell: (log) =>
        log.driver_at_request?.name ?? (
          <span className="text-slate-400">{copy.unassignedDriver}</span>
        ),
    },
    {
      id: "requested_at",
      header: copy.requestedAt,
      cellClassName: "whitespace-nowrap text-slate-500 tabular-nums text-xs",
      cell: (log) => formatMaintenanceDateTime(log.created_at, locale),
    },
  ];
}

export function MaintenanceRowActions({
  log,
  canWrite,
  onView,
  onUpdateStatus,
  copy,
}: {
  log: VehicleMaintenanceLog;
  canWrite: boolean;
  onView: (log: VehicleMaintenanceLog) => void;
  onUpdateStatus: (log: VehicleMaintenanceLog, status: VehicleMaintenanceStatus) => void;
  copy: {
    actions: string;
    view: string;
    markOpen: string;
    markInProgress: string;
    markCompleted: string;
    markCancelled: string;
  };
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] dark:hover:bg-muted dark:hover:text-foreground"
        aria-label={copy.view}
        onClick={() => onView(log)}
      >
        <Eye className="size-4" />
      </Button>

      {canWrite ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] dark:hover:bg-muted"
                aria-label={copy.actions}
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onView(log)}>
                <Eye />
                {copy.view}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {log.status !== "open" ? (
                <DropdownMenuItem onClick={() => onUpdateStatus(log, "open")}>
                  {copy.markOpen}
                </DropdownMenuItem>
              ) : null}
              {log.status !== "in_progress" ? (
                <DropdownMenuItem onClick={() => onUpdateStatus(log, "in_progress")}>
                  {copy.markInProgress}
                </DropdownMenuItem>
              ) : null}
              {log.status !== "completed" ? (
                <DropdownMenuItem onClick={() => onUpdateStatus(log, "completed")}>
                  <CheckCircle2 />
                  {copy.markCompleted}
                </DropdownMenuItem>
              ) : null}
              {log.status !== "cancelled" ? (
                <DropdownMenuItem onClick={() => onUpdateStatus(log, "cancelled")}>
                  {copy.markCancelled}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
