"use client";

import Link from "next/link";
import { Car, Eye, Pencil } from "lucide-react";
import type { VehicleFuelLog, VehicleFuelType } from "@smart-dispatch/types";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatFuelDateTime,
  formatFuelEfficiency,
  formatFuelQuantity,
  fuelEfficiencyClass,
  fuelTypeIcon,
} from "@/app/admin/fleet/vehicles/[id]/_components/vehicle-detail-shared";

type FuelColumnsOptions = {
  locale: string;
  onView: (log: VehicleFuelLog) => void;
  onEdit: (log: VehicleFuelLog) => void;
  copy: {
    vehicle: string;
    refill: string;
    fuelType: string;
    quantity: string;
    cost: string;
    consumption: string;
    driverAtRefill: string;
    unassignedDriver: string;
    refilledAt: string;
    notSet: string;
    actions: string;
    view: string;
    edit: string;
  };
  fuelCopy: {
    efficiencyValue: string;
    notSet: string;
    efficiencyUnavailable: string;
  };
  fuelTypeLabels: Record<VehicleFuelType, string>;
};

export function getFuelColumns({
  locale,
  copy,
  fuelCopy,
  fuelTypeLabels,
}: FuelColumnsOptions): DataTableColumn<VehicleFuelLog>[] {
  const numberFormat = new Intl.NumberFormat(
    locale === "am" ? "am-ET" : "en-US",
    { maximumFractionDigits: 2 },
  );

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
      id: "refill",
      header: copy.refill,
      cell: (log) => (
        <div className="max-w-56">
          <p className="truncate font-medium text-slate-800 dark:text-foreground">
            {log.station_name || copy.notSet}
          </p>
          <p className="truncate text-xs text-slate-500">
            {log.receipt_reference || log.notes || copy.notSet}
          </p>
        </div>
      ),
    },
    {
      id: "fuel_type",
      header: copy.fuelType,
      cell: (log) => {
        const Icon = fuelTypeIcon(log.fuel_type);
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-slate-500" />
            <span className="font-medium text-slate-800 dark:text-foreground">
              {fuelTypeLabels[log.fuel_type]}
            </span>
          </div>
        );
      },
    },
    {
      id: "quantity",
      header: copy.quantity,
      cellClassName: "tabular-nums font-medium text-slate-700 dark:text-slate-300",
      cell: (log) => formatFuelQuantity(log.quantity_liters),
    },
    {
      id: "cost",
      header: copy.cost,
      cellClassName: "tabular-nums text-slate-700 dark:text-slate-300",
      cell: (log) =>
        log.total_cost == null
          ? copy.notSet
          : `${numberFormat.format(log.total_cost)} ETB`,
    },
    {
      id: "consumption",
      header: copy.consumption,
      cell: (log) => {
        const hasValue = log.consumption_km_per_liter !== null;
        return (
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
              fuelEfficiencyClass(log.consumption_km_per_liter),
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                hasValue ? "bg-emerald-500" : "bg-slate-400",
              )}
            />
            <span>{formatFuelEfficiency(log.consumption_km_per_liter, fuelCopy)}</span>
          </Badge>
        );
      },
    },
    {
      id: "driver",
      header: copy.driverAtRefill,
      cell: (log) =>
        log.driver_at_refill?.name ?? (
          <span className="text-slate-400">{copy.unassignedDriver}</span>
        ),
    },
    {
      id: "refilled_at",
      header: copy.refilledAt,
      cellClassName: "whitespace-nowrap text-slate-500 tabular-nums text-xs",
      cell: (log) => formatFuelDateTime(log.logged_at, locale),
    },
  ];
}

export function FuelRowActions({
  log,
  canWrite,
  onView,
  onEdit,
  viewLabel,
  editLabel,
}: {
  log: VehicleFuelLog;
  canWrite: boolean;
  onView: (log: VehicleFuelLog) => void;
  onEdit: (log: VehicleFuelLog) => void;
  viewLabel: string;
  editLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] dark:hover:bg-muted dark:hover:text-foreground"
        aria-label={viewLabel}
        onClick={() => onView(log)}
      >
        <Eye className="size-4" />
      </Button>
      {canWrite ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] dark:hover:bg-muted dark:hover:text-foreground"
          aria-label={editLabel}
          onClick={() => onEdit(log)}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
