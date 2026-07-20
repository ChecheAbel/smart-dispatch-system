"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CarFront, Loader2, UserRound } from "lucide-react";
import type { Vehicle, VehicleDriverOption } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import {
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { fetchVehicleDriverOptions, updateVehicle } from "@/lib/vehicle-api";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AssignVehicleDriverSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSuccess?: () => void;
};

function driverInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function AssignVehicleDriverSheet({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: AssignVehicleDriverSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehiclesMessages(locale);
  const sheetCopy = copy.assignDriverSheet;
  const formCopy = copy.form;

  const [driverId, setDriverId] = useState("");
  const [drivers, setDrivers] = useState<VehicleDriverOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const driverItems = useMemo(
    () => [
      { label: formCopy.noDriver, value: "" },
      ...drivers.map((driver) => ({
        label: `${driver.name} (${driver.email})`,
        value: driver.id,
      })),
    ],
    [drivers, formCopy.noDriver],
  );

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === driverId) ?? null,
    [drivers, driverId],
  );

  const vehicleMeta = useMemo(() => {
    if (!vehicle) return "";
    return [vehicle.vehicle_type?.name, vehicle.vehicle_class?.name].filter(Boolean).join(" · ");
  }, [vehicle]);

  const vehiclePhoto = vehicle?.images?.[0]
    ? getVehiclePhotoUrl(vehicle.images[0])
    : null;

  const hasCurrentAssignment = Boolean(vehicle?.assigned_driver);
  const assignmentChanged =
    (driverId || null) !== (vehicle?.assigned_driver_user_id ?? null);

  useEffect(() => {
    if (!open) {
      setDriverId("");
      setSubmitting(false);
      return;
    }

    setDriverId(vehicle?.assigned_driver_user_id ?? "");

    let cancelled = false;

    async function loadDrivers() {
      setLoadingOptions(true);

      try {
        const options = await fetchVehicleDriverOptions();
        if (!cancelled) {
          setDrivers(options);
        }
      } catch {
        if (!cancelled) {
          setDrivers([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadDrivers();

    return () => {
      cancelled = true;
    };
  }, [open, vehicle?.assigned_driver_user_id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!vehicle) {
      return;
    }

    setSubmitting(true);

    try {
      const updated = await updateVehicle(vehicle.id, {
        assigned_driver_user_id: driverId || null,
      });

      showSuccessToast({
        title: sheetCopy.success.title,
        description: formatMessage(sheetCopy.success.description, {
          plate: updated.plate_number,
        }),
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : sheetCopy.errors.saveFailed;
      showErrorToast({
        title: sheetCopy.errors.saveFailed,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "assign-vehicle-driver-form";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-4 border-b border-slate-200/80 px-6 py-5 text-left">
          <div className={cn(adminIconBoxClass, "w-fit")}>
            <UserRound className="size-4" />
          </div>
          <div className="space-y-1.5">
            <p className={adminEyebrowClass}>{sheetCopy.eyebrow}</p>
            <SheetTitle className={cn("text-xl", adminHeadingClass)}>{sheetCopy.title}</SheetTitle>
            <SheetDescription className="text-sm leading-relaxed text-slate-500">
              {sheetCopy.description}
            </SheetDescription>
          </div>
        </SheetHeader>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6"
        >
          {vehicle ? (
            <>
              <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-[#f8fafb]">
                <div className="flex gap-3 p-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {vehiclePhoto ? (
                      <img
                        src={vehiclePhoto}
                        alt={vehicle.plate_number}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                        <CarFront className="size-6 text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={adminEyebrowClass}>{sheetCopy.vehicleLabel}</p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-wide text-[#1C3A34]">
                      {vehicle.plate_number}
                    </p>
                    {vehicleMeta ? (
                      <p className="mt-0.5 truncate text-sm text-slate-500">{vehicleMeta}</p>
                    ) : null}
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-2 text-[10px] font-medium",
                        hasCurrentAssignment
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800",
                      )}
                    >
                      {hasCurrentAssignment
                        ? copy.driverStatus.assigned
                        : copy.driverStatus.unassigned}
                    </Badge>
                  </div>
                </div>

                {vehicle.assigned_driver ? (
                  <div className="flex items-center gap-3 border-t border-slate-200/80 bg-white/70 px-4 py-3">
                    <Avatar size="sm" className="bg-[#1C3A34]/8">
                      <AvatarFallback className="bg-[#1C3A34]/10 text-[10px] font-bold text-[#1C3A34]">
                        {driverInitials(vehicle.assigned_driver.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {sheetCopy.currentDriver}
                      </p>
                      <p className="truncate text-sm font-semibold text-[#1C3A34]">
                        {vehicle.assigned_driver.name}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="assign-vehicle-driver">{sheetCopy.selectDriver}</Label>
                  <Select
                    items={driverItems}
                    value={driverId || null}
                    onValueChange={(value) => setDriverId(value ?? "")}
                    disabled={loadingOptions || submitting}
                  >
                    <SelectTrigger id="assign-vehicle-driver" className="h-11 w-full">
                      <SelectValue placeholder={formCopy.assignedDriverPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="">{formCopy.noDriver}</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                            <span className="text-slate-400"> · {driver.email}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  className={cn(
                    "rounded-xl border px-4 py-3.5 transition-colors",
                    selectedDriver
                      ? "border-[#C9B87A]/35 bg-[#C9B87A]/8"
                      : "border-dashed border-slate-200 bg-slate-50/80",
                  )}
                >
                  {loadingOptions ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="size-4 animate-spin" />
                      {sheetCopy.loadingDrivers}
                    </div>
                  ) : selectedDriver ? (
                    <div className="flex items-start gap-3">
                      <Avatar size="lg" className="bg-[#1C3A34]">
                        <AvatarFallback className="bg-[#1C3A34] text-xs font-bold text-white">
                          {driverInitials(selectedDriver.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8f7d45]">
                          {sheetCopy.selectedDriver}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[#1C3A34]">
                          {selectedDriver.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{selectedDriver.email}</p>
                        {selectedDriver.mobile_number ? (
                          <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                            {selectedDriver.mobile_number}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-200 bg-white text-slate-300">
                        <UserRound className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {sheetCopy.noDriverSelected}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {sheetCopy.noDriverSelectedHint}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <p className="text-xs leading-relaxed text-slate-500">{sheetCopy.hint}</p>
            </>
          ) : null}
        </form>

        <SheetFooter className="shrink-0 flex-row gap-2 border-t border-slate-200/80 bg-white px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200"
          >
            {formCopy.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting || loadingOptions || !vehicle || !assignmentChanged}
            className={cn(adminPrimaryButtonClass, "min-w-[9.5rem]")}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {sheetCopy.saving}
              </>
            ) : (
              sheetCopy.save
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
