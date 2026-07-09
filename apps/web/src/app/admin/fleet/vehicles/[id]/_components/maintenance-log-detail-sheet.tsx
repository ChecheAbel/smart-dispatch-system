"use client";

import type { ComponentType } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Store,
  UserRound,
  Wrench,
} from "lucide-react";
import type { Vehicle, VehicleMaintenanceLog } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  adminCardClass,
  adminHeadingClass,
} from "@/lib/admin-theme";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  formatMaintenanceDate,
  formatMaintenanceDateTime,
  maintenanceStatusClass,
  maintenanceTypeIcon,
} from "./vehicle-detail-shared";

type MaintenanceLogDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: VehicleMaintenanceLog | null;
  vehicle: Vehicle | null;
  canWrite: boolean;
  onComplete?: (log: VehicleMaintenanceLog) => void;
};

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {Icon ? (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="size-3.5" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-800 break-words">{value}</p>
      </div>
    </div>
  );
}

export function MaintenanceLogDetailSheet({
  open,
  onOpenChange,
  log,
  vehicle,
  canWrite,
  onComplete,
}: MaintenanceLogDetailSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehiclesMessages(locale);
  const detail = copy.detail;
  const maintenanceCopy = detail.maintenance;
  const sheetCopy = maintenanceCopy.detailSheet;

  if (!log) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full data-[side=right]:sm:max-w-lg" />
      </Sheet>
    );
  }

  const TypeIcon = maintenanceTypeIcon(log.work_type.slug);
  const canComplete = canWrite && (log.status === "open" || log.status === "in_progress");
  const notSet = sheetCopy.notSet;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{sheetCopy.title}</SheetTitle>
          <SheetDescription className="leading-relaxed">{sheetCopy.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-6 py-5">
          <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
            <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-[#1C3A34]/[0.04] to-transparent px-4 py-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1C3A34] text-white shadow-sm">
                <TypeIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-lg font-bold tracking-tight text-slate-900">{log.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={maintenanceStatusClass(log.status)}>
                    {detail.maintenanceStatuses[log.status]}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                    {log.work_type.name}
                  </Badge>
                </div>
                {vehicle ? (
                  <p className="font-mono text-sm font-semibold text-[#1C3A34]">
                    {vehicle.plate_number}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-slate-100 px-4">
              <section className="py-4">
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.overview}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {log.description?.trim() || maintenanceCopy.noDescription}
                </p>
              </section>

              <section className="py-4">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.request}
                </h3>
                <DetailRow
                  icon={UserRound}
                  label={maintenanceCopy.requestedByLabel}
                  value={
                    log.created_by?.name
                      ? log.created_by.name
                      : maintenanceCopy.requestedByUnknown
                  }
                />
                <DetailRow
                  icon={CalendarClock}
                  label={maintenanceCopy.loggedOnLabel}
                  value={formatMaintenanceDateTime(log.created_at, locale)}
                />
                {log.updated_at !== log.created_at ? (
                  <DetailRow
                    icon={Wrench}
                    label={sheetCopy.lastUpdated}
                    value={formatMaintenanceDateTime(log.updated_at, locale)}
                  />
                ) : null}
              </section>

              <section className="py-4">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.schedule}
                </h3>
                <DetailRow
                  icon={CalendarClock}
                  label={maintenanceCopy.startedAt}
                  value={formatMaintenanceDate(log.started_at, locale) ?? notSet}
                />
                <DetailRow
                  icon={CheckCircle2}
                  label={sheetCopy.completedAt}
                  value={formatMaintenanceDate(log.completed_at, locale) ?? notSet}
                />
                <DetailRow
                  icon={CalendarClock}
                  label={maintenanceCopy.nextDueAt}
                  value={formatMaintenanceDate(log.next_due_at, locale) ?? notSet}
                />
                <DetailRow
                  icon={Gauge}
                  label={sheetCopy.nextDueKm}
                  value={
                    log.next_due_km != null
                      ? formatMessage(sheetCopy.kmValue, { count: String(log.next_due_km) })
                      : notSet
                  }
                />
                <DetailRow
                  icon={Gauge}
                  label={maintenanceCopy.odometer}
                  value={
                    log.odometer_km != null
                      ? formatMessage(sheetCopy.kmValue, { count: String(log.odometer_km) })
                      : notSet
                  }
                />
              </section>

              <section className="py-4">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.workshop}
                </h3>
                <DetailRow
                  icon={Store}
                  label={maintenanceCopy.vendor}
                  value={log.vendor?.trim() || notSet}
                />
                <DetailRow
                  icon={CircleDollarSign}
                  label={maintenanceCopy.cost}
                  value={
                    log.cost_amount != null
                      ? formatMessage(sheetCopy.costValue, { amount: String(log.cost_amount) })
                      : notSet
                  }
                />
              </section>
            </div>
          </Card>
        </div>

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-200"
          >
            {sheetCopy.close}
          </Button>
          {canComplete ? (
            <Button
              type="button"
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              onClick={() => {
                onComplete?.(log);
                onOpenChange(false);
              }}
            >
              <CheckCircle2 className="size-4" />
              {maintenanceCopy.markCompleted}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
