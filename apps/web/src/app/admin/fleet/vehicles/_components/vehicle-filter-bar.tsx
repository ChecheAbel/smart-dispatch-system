import { RotateCcw } from "lucide-react";
import type { VehicleClass, VehicleStatus, VehicleType } from "@smart-dispatch/types";
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
import type { AdminVehiclesMessages } from "@/translations";

const VEHICLE_STATUSES: VehicleStatus[] = ["active", "maintenance", "retired"];

type VehicleFilterBarProps = {
  copy: AdminVehiclesMessages;
  vehicleTypes: VehicleType[];
  vehicleClasses: VehicleClass[];
  typeFilter: string;
  classFilter: string;
  statusFilter: string;
  assignmentFilter: string;
  onTypeChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAssignmentChange: (value: string) => void;
  onReset: () => void;
};

export function VehicleFilterBar({
  copy,
  vehicleTypes,
  vehicleClasses,
  typeFilter,
  classFilter,
  statusFilter,
  assignmentFilter,
  onTypeChange,
  onClassChange,
  onStatusChange,
  onAssignmentChange,
  onReset,
}: VehicleFilterBarProps) {
  const isFiltered =
    typeFilter !== "all" ||
    classFilter !== "all" ||
    statusFilter !== "all" ||
    assignmentFilter !== "all";

  const typeItems = [
    { label: copy.filters.typeAll, value: "all" },
    ...vehicleTypes.map((t) => ({ label: t.name, value: t.id })),
  ];

  const classItems = [
    { label: copy.filters.classAll, value: "all" },
    ...vehicleClasses.map((c) => ({ label: c.name, value: c.id })),
  ];

  const statusItems = [
    { label: copy.filters.statusAll, value: "all" },
    ...VEHICLE_STATUSES.map((status) => ({
      label: copy.status[status],
      value: status,
    })),
  ];

  const assignmentItems = [
    { label: copy.filters.all, value: "all" },
    { label: copy.filters.assigned, value: "assigned" },
    { label: copy.filters.unassigned, value: "unassigned" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Vehicle Type Filter */}
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="vehicle-type-filter" className={adminFilterLabelClass}>
            {copy.filters.type}
          </Label>
          <Select
            items={typeItems}
            value={typeFilter}
            onValueChange={(val) => onTypeChange(val ?? "all")}
          >
            <SelectTrigger id="vehicle-type-filter" className={adminSelectTriggerClass}>
              <SelectValue placeholder={copy.filters.type} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {typeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Vehicle Class Filter */}
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="vehicle-class-filter" className={adminFilterLabelClass}>
            {copy.filters.class}
          </Label>
          <Select
            items={classItems}
            value={classFilter}
            onValueChange={(val) => onClassChange(val ?? "all")}
          >
            <SelectTrigger id="vehicle-class-filter" className={adminSelectTriggerClass}>
              <SelectValue placeholder={copy.filters.class} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {classItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="vehicle-status-filter" className={adminFilterLabelClass}>
            {copy.filters.status}
          </Label>
          <Select
            items={statusItems}
            value={statusFilter}
            onValueChange={(val) => onStatusChange(val ?? "all")}
          >
            <SelectTrigger id="vehicle-status-filter" className={adminSelectTriggerClass}>
              <SelectValue placeholder={copy.filters.status} />
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

        {/* Driver Assignment Filter */}
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="vehicle-assignment-filter" className={adminFilterLabelClass}>
            {copy.filters.assignment}
          </Label>
          <Select
            items={assignmentItems}
            value={assignmentFilter}
            onValueChange={(val) => onAssignmentChange(val ?? "all")}
          >
            <SelectTrigger id="vehicle-assignment-filter" className={adminSelectTriggerClass}>
              <SelectValue placeholder={copy.filters.assignment} />
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
        </div>
      </div>

      {isFiltered && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 dark:border-border dark:bg-card dark:text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            <span>{copy.filters.typeAll}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
