"use client";

import type { ComponentType } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Droplets,
  Fuel,
  Gauge,
  Store,
  UserRound,
} from "lucide-react";
import type { Vehicle, VehicleFuelLog } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { adminCardClass, adminHeadingClass } from "@/lib/admin-theme";
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
  formatFuelDateTime,
  formatFuelEfficiency,
  formatFuelQuantity,
  fuelEfficiencyClass,
} from "./vehicle-detail-shared";

type FuelLogDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: VehicleFuelLog | null;
  vehicle: Vehicle | null;
};

function FuelTypeGlyph({ fuelType, className }: { fuelType: VehicleFuelLog["fuel_type"]; className?: string }) {
  return fuelType === "diesel" ? (
    <Droplets className={className} />
  ) : (
    <Fuel className={className} />
  );
}

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
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
          <Icon className="size-3.5" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
        <p className="mt-1 text-sm font-medium break-words text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

export function FuelLogDetailSheet({
  open,
  onOpenChange,
  log,
  vehicle,
}: FuelLogDetailSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehiclesMessages(locale);
  const fuelCopy = copy.detail.fuel;
  const sheetCopy = fuelCopy.detailSheet;

  if (!log) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full data-[side=right]:sm:max-w-lg" />
      </Sheet>
    );
  }

  const notSet = sheetCopy.notSet;
  const refillTitle =
    log.station_name?.trim() ||
    formatMessage(fuelCopy.refillFallback, { quantity: formatFuelQuantity(log.quantity_liters) });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5 dark:border-border">
          <SheetTitle className={adminHeadingClass}>{sheetCopy.title}</SheetTitle>
          <SheetDescription className="leading-relaxed">{sheetCopy.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-6 py-5">
          <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
            <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-[#1C3A34]/[0.04] to-transparent px-4 py-4 dark:border-border dark:from-[#C9B87A]/10">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1C3A34] text-white shadow-sm dark:bg-[#C9B87A] dark:text-[#151a21]">
                <FuelTypeGlyph fuelType={log.fuel_type} className="size-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-foreground">{refillTitle}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-white/[0.06] dark:text-slate-300">
                    {copy.detail.fuelTypes[log.fuel_type]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={fuelEfficiencyClass(log.consumption_km_per_liter)}
                  >
                    {formatFuelEfficiency(log.consumption_km_per_liter, fuelCopy)}
                  </Badge>
                </div>
                {vehicle ? (
                  <p className="font-mono text-sm font-semibold text-[#1C3A34] dark:text-[#e1d49d]">
                    {vehicle.plate_number}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="divide-y divide-slate-100 px-4 dark:divide-border">
              <section className="py-4">
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.overview}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {log.notes?.trim() || fuelCopy.noNotes}
                </p>
              </section>

              <section className="py-4">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.request}
                </h3>
                <DetailRow
                  icon={UserRound}
                  label={fuelCopy.loggedByLabel}
                  value={log.created_by?.name ?? fuelCopy.loggedByUnknown}
                />
                <DetailRow
                  icon={CalendarClock}
                  label={fuelCopy.loggedOnLabel}
                  value={formatFuelDateTime(log.logged_at, locale)}
                />
                {log.updated_at !== log.created_at ? (
                  <DetailRow
                    icon={Fuel}
                    label={sheetCopy.lastUpdated}
                    value={formatFuelDateTime(log.updated_at, locale)}
                  />
                ) : null}
              </section>

              <section className="py-4">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.refillDetails}
                </h3>
                <DetailRow
                  icon={Gauge}
                  label={fuelCopy.odometer}
                  value={formatMessage(fuelCopy.kmValue, { count: String(log.odometer_km) })}
                />
                <DetailRow
                  icon={Fuel}
                  label={fuelCopy.quantity}
                  value={formatFuelQuantity(log.quantity_liters)}
                />
                <DetailRow
                  icon={Gauge}
                  label={fuelCopy.distanceSinceLast}
                  value={
                    log.distance_since_last_km !== null
                      ? formatMessage(fuelCopy.kmValue, {
                          count: String(log.distance_since_last_km),
                        })
                      : notSet
                  }
                />
              </section>

              <section className="py-4">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.costAndEfficiency}
                </h3>
                <DetailRow
                  icon={Store}
                  label={fuelCopy.station}
                  value={log.station_name?.trim() || notSet}
                />
                <DetailRow
                  icon={CircleDollarSign}
                  label={fuelCopy.cost}
                  value={
                    log.total_cost !== null
                      ? formatMessage(fuelCopy.costValue, { amount: String(log.total_cost) })
                      : notSet
                  }
                />
                <DetailRow
                  icon={CircleDollarSign}
                  label={fuelCopy.pricePerLiter}
                  value={
                    log.price_per_liter !== null
                      ? formatMessage(fuelCopy.costValue, { amount: String(log.price_per_liter) })
                      : notSet
                  }
                />
                <DetailRow
                  icon={Fuel}
                  label={fuelCopy.receipt}
                  value={log.receipt_reference?.trim() || notSet}
                />
              </section>
            </div>
          </Card>
        </div>

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-border dark:bg-[#171c24]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-200 dark:border-border dark:bg-[#202630] dark:text-foreground dark:hover:bg-white/[0.07]"
          >
            {sheetCopy.close}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
