"use client";

import { RotateCcw } from "lucide-react";
import type { Vehicle, VehicleMaintenanceStatus } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFilterLabelClass, adminSelectTriggerClass } from "@/lib/admin-theme";

export const ALL_FILTER = "all";

type MaintenanceFilterBarProps = {
  vehicles: Vehicle[];
  vehicleStatuses: VehicleMaintenanceStatus[];
  vehicleFilter: string;
  statusFilter: string;
  onVehicleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onReset: () => void;
  copy: {
    vehicleLabel: string;
    allVehicles: string;
    statusLabel: string;
    allStatuses: string;
    resetLabel: string;
  };
  statusLabels: Record<VehicleMaintenanceStatus, string>;
};

export function MaintenanceFilterBar({
  vehicles,
  vehicleStatuses,
  vehicleFilter,
  statusFilter,
  onVehicleChange,
  onStatusChange,
  onReset,
  copy,
  statusLabels,
}: MaintenanceFilterBarProps) {
  const isFiltered = vehicleFilter !== ALL_FILTER || statusFilter !== ALL_FILTER;

  const vehicleItems = [
    { value: ALL_FILTER, label: copy.allVehicles },
    ...vehicles.map((v) => ({ value: v.id, label: v.plate_number })),
  ];

  const statusItems = [
    { value: ALL_FILTER, label: copy.allStatuses },
    ...vehicleStatuses.map((s) => ({ value: s, label: statusLabels[s] })),
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="w-full space-y-1.5 sm:w-64">
        <Label className={adminFilterLabelClass}>{copy.vehicleLabel}</Label>
        <Select
          items={vehicleItems}
          value={vehicleFilter}
          onValueChange={(val) => onVehicleChange(val ?? ALL_FILTER)}
        >
          <SelectTrigger className={adminSelectTriggerClass}>
            <SelectValue placeholder={copy.allVehicles} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {vehicleItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full space-y-1.5 sm:w-56">
        <Label className={adminFilterLabelClass}>{copy.statusLabel}</Label>
        <Select
          items={statusItems}
          value={statusFilter}
          onValueChange={(val) => onStatusChange(val ?? ALL_FILTER)}
        >
          <SelectTrigger className={adminSelectTriggerClass}>
            <SelectValue placeholder={copy.allStatuses} />
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
      </div>

      {isFiltered ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-9 gap-1.5 border-dashed border-slate-300 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-border dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          <span>{copy.resetLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}
