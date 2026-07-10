"use client";

import { useState } from "react";
import { Eye, Fuel, Plus } from "lucide-react";
import type { Vehicle, VehicleFuelLog } from "@smart-dispatch/types";
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
import { FuelLogDetailSheet } from "@/app/admin/fleet/vehicles/[id]/_components/fuel-log-detail-sheet";
import {
  formatFuelDateTime,
  formatFuelEfficiency,
  formatFuelQuantity,
  fuelEfficiencyClass,
  fuelTypeIcon,
} from "./vehicle-detail-shared";

type VehicleDetailFuelTabProps = {
  vehicle: Vehicle;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  canWrite: boolean;
  fuelLogs: VehicleFuelLog[];
  fuelLoading: boolean;
  onOpenCreateSheet: () => void;
};

function getRefillTitle(log: VehicleFuelLog, fuelCopy: ReturnType<typeof getAdminVehiclesMessages>["detail"]["fuel"]) {
  if (log.station_name?.trim()) {
    return log.station_name.trim();
  }

  return formatMessage(fuelCopy.refillFallback, {
    quantity: formatFuelQuantity(log.quantity_liters),
  });
}

function getRefillSubtitle(log: VehicleFuelLog) {
  if (log.receipt_reference?.trim()) {
    return log.receipt_reference.trim();
  }

  return log.notes?.trim() || null;
}

export function VehicleDetailFuelTab({
  vehicle,
  detail,
  canWrite,
  fuelLogs,
  fuelLoading,
  onOpenCreateSheet,
}: VehicleDetailFuelTabProps) {
  const { locale } = useLocale();
  const fuelCopy = detail.fuel;
  const columns = fuelCopy.tableColumns;
  const [detailLog, setDetailLog] = useState<VehicleFuelLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(log: VehicleFuelLog) {
    setDetailLog(log);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{fuelCopy.listTitle}</h2>
          {fuelLogs.length > 0 ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {formatMessage(fuelCopy.logCount, { count: String(fuelLogs.length) })}
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
            {fuelCopy.openForm}
          </Button>
        ) : null}
      </div>

      <section className={cn(adminCardClass, "overflow-hidden rounded-2xl p-0")}>
        {fuelLoading ? (
          <div className="space-y-0 p-4 sm:p-5">
            {[0, 1, 2, 3].map((key) => (
              <div
                key={key}
                className="mb-2 h-11 animate-pulse rounded-lg bg-slate-100 last:mb-0"
              />
            ))}
          </div>
        ) : fuelLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:px-6">
            <div className={adminIconBoxClass}>
              <Fuel className="size-5" />
            </div>
            <div className="space-y-1">
              <p className={cn("text-base", adminHeadingClass)}>{fuelCopy.emptyTitle}</p>
              <p className="max-w-sm text-sm text-slate-500">{fuelCopy.emptyHint}</p>
            </div>
            {canWrite ? (
              <Button
                type="button"
                variant="outline"
                className="mt-1 border-[#1C3A34]/20 text-[#1C3A34] hover:bg-[#1C3A34]/5"
                onClick={onOpenCreateSheet}
              >
                <Plus className="size-4" />
                {fuelCopy.openForm}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full text-left text-sm" style={{ minWidth: "720px" }}>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">{columns.fuelType}</th>
                  <th className="px-4 py-3">{columns.refill}</th>
                  <th className="px-4 py-3">{columns.quantity}</th>
                  <th className="px-4 py-3">{columns.efficiency}</th>
                  <th className="px-4 py-3">{columns.loggedBy}</th>
                  <th className="px-4 py-3">{columns.loggedOn}</th>
                  <th className="w-28 px-4 py-3 text-right">{columns.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {fuelLogs.map((log) => {
                  const TypeIcon = fuelTypeIcon(log.fuel_type);
                  const refillTitle = getRefillTitle(log, fuelCopy);
                  const refillSubtitle = getRefillSubtitle(log);
                  const loggedByName = log.created_by?.name ?? fuelCopy.loggedByUnknown;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/[0.06] text-[#1C3A34]">
                            <TypeIcon className="size-3.5" />
                          </span>
                          <span className="font-medium">{detail.fuelTypes[log.fuel_type]}</span>
                        </span>
                      </td>
                      <td className="max-w-[12rem] px-4 py-2.5">
                        <p className="truncate font-medium text-slate-900" title={refillTitle}>
                          {refillTitle}
                        </p>
                        {refillSubtitle ? (
                          <p
                            className="mt-0.5 truncate text-xs text-slate-500"
                            title={refillSubtitle}
                          >
                            {refillSubtitle}
                          </p>
                        ) : (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {formatMessage(fuelCopy.kmValue, { count: String(log.odometer_km) })}
                            {log.total_cost !== null
                              ? ` · ${formatMessage(fuelCopy.costValue, { amount: String(log.total_cost) })}`
                              : null}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                          {formatFuelQuantity(log.quantity_liters)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={fuelEfficiencyClass(log.consumption_km_per_liter)}
                        >
                          {formatFuelEfficiency(log.consumption_km_per_liter, fuelCopy)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{loggedByName}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {formatFuelDateTime(log.logged_at, locale)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 text-slate-600 hover:text-[#1C3A34]"
                            onClick={() => openDetail(log)}
                            title={fuelCopy.viewDetails}
                          >
                            <Eye className="size-4" />
                            <span className="sr-only">{fuelCopy.viewDetails}</span>
                          </Button>
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

      <FuelLogDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={detailLog}
        vehicle={vehicle}
      />
    </div>
  );
}
