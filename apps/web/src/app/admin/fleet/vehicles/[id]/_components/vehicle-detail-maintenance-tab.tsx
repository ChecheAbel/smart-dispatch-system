"use client";

import { useState } from "react";
import { CheckCircle2, Eye, Plus, Wrench } from "lucide-react";
import type { Vehicle, VehicleMaintenanceLog } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
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
import { MaintenanceLogDetailSheet } from "./maintenance-log-detail-sheet";
import {
  formatMaintenanceDateTime,
  maintenanceStatusClass,
  maintenanceTypeIcon,
} from "./vehicle-detail-shared";

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
  const { locale } = useLocale();
  const maintenanceCopy = detail.maintenance;
  const columns = maintenanceCopy.tableColumns;
  const [detailLog, setDetailLog] = useState<VehicleMaintenanceLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(log: VehicleMaintenanceLog) {
    setDetailLog(log);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{maintenanceCopy.listTitle}</h2>
          {vehicle.open_maintenance_count ? (
            <p className="mt-0.5 text-sm text-amber-700">
              {formatMessage(maintenanceCopy.openCount, {
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
            {maintenanceCopy.openForm}
          </Button>
        ) : null}
      </div>

      <section className={cn(adminCardClass, "overflow-hidden rounded-2xl p-0")}>
        {maintenanceLoading ? (
          <div className="space-y-0 p-4 sm:p-5">
            {[0, 1, 2, 3].map((key) => (
              <div
                key={key}
                className="mb-2 h-11 animate-pulse rounded-lg bg-slate-100 last:mb-0"
              />
            ))}
          </div>
        ) : maintenance.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:px-6">
            <div className={adminIconBoxClass}>
              <Wrench className="size-5" />
            </div>
            <div className="space-y-1">
              <p className={cn("text-base", adminHeadingClass)}>{maintenanceCopy.emptyTitle}</p>
              <p className="max-w-sm text-sm text-slate-500">{maintenanceCopy.emptyHint}</p>
            </div>
            {canWrite ? (
              <Button
                type="button"
                variant="outline"
                className="mt-1 border-[#1C3A34]/20 text-[#1C3A34] hover:bg-[#1C3A34]/5"
                onClick={onOpenCreateSheet}
              >
                <Plus className="size-4" />
                {maintenanceCopy.openForm}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ minWidth: "720px" }}>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">{columns.workType}</th>
                  <th className="px-4 py-3">{columns.title}</th>
                  <th className="px-4 py-3">{columns.status}</th>
                  <th className="px-4 py-3">{columns.requestedBy}</th>
                  <th className="px-4 py-3">{columns.loggedOn}</th>
                  <th className="w-28 px-4 py-3 text-right">{columns.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {maintenance.map((log) => {
                  const TypeIcon = maintenanceTypeIcon(log.work_type.slug);
                  const isOpen = log.status === "open" || log.status === "in_progress";
                  const requesterName = log.created_by?.name ?? maintenanceCopy.requestedByUnknown;

                  return (
                    <tr
                      key={log.id}
                      className={cn(
                        "hover:bg-slate-50/80",
                        isOpen && "bg-amber-50/30",
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/[0.06] text-[#1C3A34]">
                            <TypeIcon className="size-3.5" />
                          </span>
                          <span className="flex flex-col">
                            <span className="font-medium">{log.work_type.name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {log.location_type === "internal"
                                ? (locale === "am" ? "ውስጣዊ" : "Internal")
                                : (locale === "am" ? "ውጫዊ" : "External")}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="max-w-[12rem] px-4 py-2.5">
                        <p className="truncate font-medium text-slate-900" title={log.title}>
                          {log.title}
                        </p>
                        {log.description ? (
                          <p
                            className="mt-0.5 truncate text-xs text-slate-500"
                            title={log.description}
                          >
                            {log.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={maintenanceStatusClass(log.status)}>
                          {detail.maintenanceStatuses[log.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{requesterName}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {formatMaintenanceDateTime(log.created_at, locale)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-slate-600 hover:text-[#1C3A34]"
                            onClick={() => openDetail(log)}
                            title={maintenanceCopy.viewDetails}
                          >
                            <Eye className="size-4" />
                            <span className="sr-only">{maintenanceCopy.viewDetails}</span>
                          </Button>
                          {canWrite && isOpen ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => onCompleteMaintenance(log)}
                              title={maintenanceCopy.markCompleted}
                            >
                              <CheckCircle2 className="size-4" />
                              <span className="sr-only">{maintenanceCopy.markCompleted}</span>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <MaintenanceLogDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={detailLog}
        vehicle={vehicle}
        canWrite={canWrite}
        onComplete={onCompleteMaintenance}
      />
    </div>
  );
}
