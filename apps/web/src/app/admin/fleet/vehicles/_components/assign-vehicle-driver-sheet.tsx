"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { UserRound } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { fetchVehicleDriverOptions, updateVehicle } from "@/lib/vehicle-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const [driverOptions, setDriverOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const driverItems = useMemo(
    () => [{ label: formCopy.noDriver, value: "" }, ...driverOptions],
    [driverOptions, formCopy.noDriver],
  );

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
        const drivers = await fetchVehicleDriverOptions();
        if (!cancelled) {
          setDriverOptions(
            drivers.map((driver) => ({
              label: `${driver.name} (${driver.email})`,
              value: driver.id,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setDriverOptions([]);
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
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{sheetCopy.title}</SheetTitle>
          <SheetDescription className="leading-relaxed">{sheetCopy.description}</SheetDescription>
        </SheetHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {vehicle ? (
            <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {sheetCopy.vehicleLabel}
                </p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wide text-[#1C3A34]">
                  {vehicle.plate_number}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {[vehicle.vehicle_type?.name, vehicle.vehicle_class?.name].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div className="flex items-start gap-3 rounded-lg border border-[#C9B87A]/25 bg-[#f8fafb] px-3 py-3">
                  <div className={cn(adminIconBoxClass, "shrink-0")}>
                    <UserRound className="size-4" />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{sheetCopy.hint}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assign-vehicle-driver">{formCopy.assignedDriver}</Label>
                  <Select
                    items={driverItems}
                    value={driverId || null}
                    onValueChange={(value) => setDriverId(value ?? "")}
                    disabled={loadingOptions}
                  >
                    <SelectTrigger id="assign-vehicle-driver" className="h-10 w-full">
                      <SelectValue placeholder={formCopy.assignedDriverPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="">{formCopy.noDriver}</SelectItem>
                        {driverOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ) : null}
        </form>

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
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
            disabled={submitting || loadingOptions || !vehicle}
            className={adminPrimaryButtonClass}
          >
            {submitting ? sheetCopy.saving : sheetCopy.save}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
