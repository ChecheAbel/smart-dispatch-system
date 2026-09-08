import { useMemo } from "react";
import { Car, Eye, MoreHorizontal, Pencil, Trash2, Truck, UserRound } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
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
import { formatMessage, type AdminVehiclesMessages } from "@/translations";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import { VehicleStatusBadge } from "./vehicle-status-badge";

export function VehicleRowActions({
  vehicle,
  labels,
  onView,
  onEdit,
  onAssignDriver,
  onDelete,
  canEdit,
  canAssignDriver,
  canDelete,
}: {
  vehicle: Vehicle;
  labels: AdminVehiclesMessages["actions"];
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onAssignDriver: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  canEdit: boolean;
  canAssignDriver: boolean;
  canDelete: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(labels.menuLabel, { name: vehicle.plate_number })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onView(vehicle)}>
            <Eye />
            {labels.view}
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(vehicle)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canAssignDriver ? (
            <DropdownMenuItem onClick={() => onAssignDriver(vehicle)}>
              <UserRound />
              {labels.assignDriver}
            </DropdownMenuItem>
          ) : null}
          {(canEdit || canAssignDriver) && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(vehicle)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type UseVehicleColumnsProps = {
  copy: AdminVehiclesMessages;
  openVehicleDetail: (vehicle: Vehicle) => void;
};

export function useVehicleColumns({
  copy,
  openVehicleDetail,
}: UseVehicleColumnsProps): DataTableColumn<Vehicle>[] {
  return useMemo<DataTableColumn<Vehicle>[]>(() => {
    const empty = copy.columnEmpty;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    function emptyCellLabel(text: string) {
      return <span className="text-xs text-slate-400 italic">{text}</span>;
    }

    return [
      {
        id: "image",
        header: "",
        cellClassName: "w-14",
        cell: (vehicle) => {
          const preview = vehicle.images?.[0];

          if (!preview) {
            return (
              <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 dark:border-border dark:from-muted/50 dark:to-muted/20">
                <Truck className="size-4.5 text-slate-400" />
              </div>
            );
          }

          const photoUrl = getVehiclePhotoUrl(preview, apiBaseUrl);

          return (
            <div className="size-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs dark:border-border dark:bg-card">
              <img
                src={photoUrl ?? preview}
                alt={vehicle.plate_number}
                className="h-full w-full object-cover"
              />
            </div>
          );
        },
      },
      {
        id: "plate",
        header: copy.columns.plate,
        cellClassName: "text-slate-700",
        cell: (vehicle) => (
          <button
            type="button"
            onClick={() => openVehicleDetail(vehicle)}
            className="group inline-flex items-center gap-1.5 rounded-md border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-[#1C3A34] transition-all hover:border-[#1C3A34]/30 hover:bg-[#1C3A34]/8 dark:border-border dark:bg-muted/50 dark:text-foreground dark:hover:bg-accent"
          >
            <Car className="size-3 text-slate-400 group-hover:text-[#1C3A34] dark:group-hover:text-[var(--brand-accent)] transition-colors" />
            {vehicle.plate_number}
          </button>
        ),
      },
      {
        id: "chassis",
        header: copy.columns.chassis,
        cellClassName: "font-mono text-xs text-slate-600 tracking-wide",
        cell: (vehicle) =>
          vehicle.chassis_number ? vehicle.chassis_number : emptyCellLabel(empty.chassis),
      },
      {
        id: "type",
        header: copy.columns.type,
        cellClassName: "text-slate-600",
        cell: (vehicle) =>
          vehicle.vehicle_type?.name ? (
            <span className="font-medium text-slate-800 dark:text-foreground">
              {vehicle.vehicle_type.name}
            </span>
          ) : (
            emptyCellLabel(empty.type)
          ),
      },
      {
        id: "class",
        header: copy.columns.class,
        cellClassName: "text-slate-600",
        cell: (vehicle) =>
          vehicle.vehicle_class?.name ? (
            <span className="text-xs text-slate-600 dark:text-muted-foreground">
              {vehicle.vehicle_class.name}
            </span>
          ) : (
            emptyCellLabel(empty.class)
          ),
      },
      {
        id: "driver",
        header: copy.columns.driver,
        cellClassName: "align-top",
        cell: (vehicle) => {
          const driver = vehicle.assigned_driver;

          return (
            <div className="flex w-full min-w-[9.5rem] max-w-[12rem] flex-col items-start gap-1 py-0.5">
              {driver ? (
                <>
                  <div className="min-w-0 w-full">
                    <p className="truncate text-xs font-semibold leading-snug text-slate-800 dark:text-foreground">
                      {driver.name}
                    </p>
                    {driver.email ? (
                      <p className="truncate text-[11px] leading-snug text-slate-400 dark:text-muted-foreground">
                        {driver.email}
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <span className="size-1 rounded-full bg-emerald-500" />
                    {copy.driverStatus.assigned}
                  </span>
                </>
              ) : (
                <>
                  <p className="text-xs leading-snug text-slate-400">{empty.driver}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50/80 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    <span className="size-1 rounded-full bg-amber-500" />
                    {copy.driverStatus.unassigned}
                  </span>
                </>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (vehicle) => (
          <VehicleStatusBadge status={vehicle.status} label={copy.status[vehicle.status]} />
        ),
      },
    ];
  }, [copy, openVehicleDetail]);
}
