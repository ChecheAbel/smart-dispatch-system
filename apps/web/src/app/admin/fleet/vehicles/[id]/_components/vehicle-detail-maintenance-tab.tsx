import { CheckCircle2, Plus, Wrench } from "lucide-react";
import type { Vehicle, VehicleMaintenanceLog } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { maintenanceStatusClass } from "./vehicle-detail-shared";

type VehicleDetailMaintenanceTabProps = {
  vehicle: Vehicle;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  canWrite: boolean;
  maintenance: VehicleMaintenanceLog[];
  maintenanceLoading: boolean;
  onOpenCreateSheet: () => void;
  onCompleteMaintenance: (log: VehicleMaintenanceLog) => void;
};

export function VehicleDetailMaintenanceTab({
  vehicle,
  detail,
  canWrite,
  maintenance,
  maintenanceLoading,
  onOpenCreateSheet,
  onCompleteMaintenance,
}: VehicleDetailMaintenanceTabProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{detail.maintenance.listTitle}</h2>
          {vehicle.open_maintenance_count ? (
            <p className="mt-0.5 text-sm text-amber-700">
              {formatMessage(detail.maintenance.openCount, {
                count: String(vehicle.open_maintenance_count),
              })}
            </p>
          ) : null}
        </div>
        {canWrite ? (
          <Button
            type="button"
            className={cn("w-full shrink-0 sm:w-auto", adminPrimaryButtonClass)}
            onClick={onOpenCreateSheet}
          >
            <Plus className="size-4" />
            {detail.maintenance.openForm}
          </Button>
        ) : null}
      </div>

      <section className={cn(adminCardClass, "rounded-2xl p-4 sm:p-5 lg:p-6")}>
        {maintenanceLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : maintenance.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className={adminIconBoxClass}>
              <Wrench className="size-5" />
            </div>
            <div className="space-y-1">
              <p className={cn("text-base", adminHeadingClass)}>{detail.maintenance.emptyTitle}</p>
              <p className="max-w-sm text-sm text-slate-500">{detail.maintenance.emptyHint}</p>
            </div>
            {canWrite ? (
              <Button
                type="button"
                variant="outline"
                className="mt-1 border-[#1C3A34]/20 text-[#1C3A34] hover:bg-[#1C3A34]/5"
                onClick={onOpenCreateSheet}
              >
                <Plus className="size-4" />
                {detail.maintenance.openForm}
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {maintenance.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-slate-100 bg-slate-50/30 p-3.5 transition hover:border-slate-200 hover:bg-white sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={maintenanceStatusClass(log.status)}>
                        {detail.maintenanceStatuses[log.status]}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                        {log.work_type.name}
                      </Badge>
                    </div>
                    <p className="text-base font-semibold text-slate-800">{log.title}</p>
                    {log.description ? (
                      <p className="text-sm leading-relaxed text-slate-600">{log.description}</p>
                    ) : null}
                  </div>
                  {canWrite && (log.status === "open" || log.status === "in_progress") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50 sm:w-auto"
                      onClick={() => onCompleteMaintenance(log)}
                    >
                      <CheckCircle2 className="size-3.5" />
                      {detail.maintenance.markCompleted}
                    </Button>
                  ) : null}
                </div>
                {(log.vendor ||
                  log.cost_amount != null ||
                  log.odometer_km != null ||
                  log.next_due_at) && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    {log.vendor ? (
                      <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                        {log.vendor}
                      </span>
                    ) : null}
                    {log.cost_amount != null ? (
                      <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                        {log.cost_amount}
                      </span>
                    ) : null}
                    {log.odometer_km != null ? (
                      <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                        {log.odometer_km} km
                      </span>
                    ) : null}
                    {log.next_due_at ? (
                      <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                        {detail.maintenance.nextDueAt}: {log.next_due_at}
                      </span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
