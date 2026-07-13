"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleDollarSign, Fuel, Gauge, Plus, Store } from "lucide-react";
import type { Vehicle, VehicleFuelType, FuelLocationType } from "@smart-dispatch/types";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { createVehicleFuelLog } from "@/lib/vehicle-api";
import { showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FUEL_TYPES,
  formatDateInputValue,
  fuelTypeIcon,
  parseDateInputValue,
  textareaClassName,
} from "./vehicle-detail-shared";

const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

type FuelFieldErrors = {
  odometer_km?: string;
  quantity_liters?: string;
  station_name?: string;
  total_cost?: string;
};

type FuelFormState = {
  logged_at: string;
  odometer_km: string;
  quantity_liters: string;
  total_cost: string;
  fuel_type: VehicleFuelType;
  location_type: FuelLocationType;
  station_name: string;
  receipt_reference: string;
  notes: string;
};

function emptyFuelForm(): FuelFormState {
  return {
    logged_at: formatDateInputValue(new Date()),
    odometer_km: "",
    quantity_liters: "",
    total_cost: "",
    fuel_type: "diesel",
    location_type: "external",
    station_name: "",
    receipt_reference: "",
    notes: "",
  };
}

type CreateFuelSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSuccess?: () => void;
};

export function CreateFuelSheet({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: CreateFuelSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehiclesMessages(locale);
  const detail = copy.detail;
  const fuelCopy = detail.fuel;

  const fuelTypeLabel = fuelCopy.fuelType;
  const locationTypeLabel = locale === "am" ? "የነዳጅ መሙያ ቦታ" : "Location Type";
  const internalLabel = locale === "am" ? "ውስጣዊ (Internal)" : "Internal";
  const externalLabel = locale === "am" ? "ውጫዊ (External)" : "External";

  const fuelTypeItems = useMemo(
    () =>
      FUEL_TYPES.map((type) => ({
        label: detail.fuelTypes[type],
        value: type,
      })),
    [detail.fuelTypes]
  );

  const locationTypeItems = useMemo(
    () => [
      { label: internalLabel, value: "internal" },
      { label: externalLabel, value: "external" },
    ],
    [internalLabel, externalLabel]
  );

  const [form, setForm] = useState<FuelFormState>(emptyFuelForm());
  const [fieldErrors, setFieldErrors] = useState<FuelFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setForm(emptyFuelForm());
      setFieldErrors({});
      setError(null);
    }
  }, [open]);

  function updateForm(updater: (current: FuelFormState) => FuelFormState) {
    setForm((current) => updater(current));
    setFieldErrors({});
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) return;

    setFieldErrors({});
    setError(null);

    const odometerKm = Number(form.odometer_km);
    const quantityLiters = Number(form.quantity_liters);
    const totalCost = Number(form.total_cost);
    const stationName = form.station_name.trim();
    const nextErrors: FuelFieldErrors = {};

    if (!Number.isFinite(odometerKm) || odometerKm <= 0) {
      nextErrors.odometer_km = fuelCopy.odometerRequired;
    }

    if (!Number.isFinite(quantityLiters) || quantityLiters <= 0) {
      nextErrors.quantity_liters = fuelCopy.quantityRequired;
    }

    if (!stationName) {
      nextErrors.station_name = fuelCopy.stationRequired;
    }

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      nextErrors.total_cost = fuelCopy.costRequired;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createVehicleFuelLog(vehicle.id, {
        logged_at: form.logged_at || undefined,
        odometer_km: Math.trunc(odometerKm),
        quantity_liters: quantityLiters,
        total_cost: totalCost,
        fuel_type: form.fuel_type,
        location_type: form.location_type,
        station_name: stationName,
        receipt_reference: form.receipt_reference.trim() || null,
        notes: form.notes.trim() || null,
      });

      showSuccessToast(detail.toast.fuelCreated);
      onSuccess?.();
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : detail.toast.fuelFailed.description,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "create-fuel-form";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{fuelCopy.createTitle}</SheetTitle>
          <SheetDescription className="leading-relaxed">
            {vehicle
              ? formatMessage(fuelCopy.createSubtitle, { plate: vehicle.plate_number })
              : fuelCopy.emptyHint}
          </SheetDescription>
        </SheetHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {vehicle ? (
            <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4">
                <div className={cn(adminIconBoxClass, "shrink-0 bg-[#1C3A34] text-white")}>
                  <Fuel className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    {copy.columns.plate}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-wide text-[#1C3A34]">
                    {vehicle.plate_number}
                  </p>
                </div>
              </div>

              <div className="space-y-5 px-4 py-4">
                <AdminDatePicker
                  id="fuel-sheet-logged-at"
                  label={fuelCopy.loggedAt}
                  placeholder={detail.overview.pickDate}
                  clearLabel={detail.overview.clearDate}
                  todayLabel={detail.overview.today}
                  disabled={submitting}
                  value={parseDateInputValue(form.logged_at)}
                  onChange={(date) =>
                    updateForm((current) => ({
                      ...current,
                      logged_at: formatDateInputValue(date),
                    }))
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fuel-sheet-odometer" className="inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5 text-slate-400" />
                      {fuelCopy.odometer}
                    </Label>
                    <Input
                      id="fuel-sheet-odometer"
                      type="number"
                      min={1}
                      value={form.odometer_km}
                      disabled={submitting}
                      onChange={(event) =>
                        updateForm((current) => ({ ...current, odometer_km: event.target.value }))
                      }
                      placeholder={fuelCopy.odometerPlaceholder}
                      className={cn(
                        adminInputClass,
                        "bg-white",
                        fieldErrors.odometer_km && fieldErrorClassName,
                      )}
                      required
                    />
                    {fieldErrors.odometer_km ? (
                      <p className="text-xs text-red-600">{fieldErrors.odometer_km}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fuel-sheet-quantity" className="inline-flex items-center gap-1.5">
                      <Fuel className="size-3.5 text-slate-400" />
                      {fuelCopy.quantity}
                    </Label>
                    <Input
                      id="fuel-sheet-quantity"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={form.quantity_liters}
                      disabled={submitting}
                      onChange={(event) =>
                        updateForm((current) => ({
                          ...current,
                          quantity_liters: event.target.value,
                        }))
                      }
                      placeholder={fuelCopy.quantityPlaceholder}
                      className={cn(
                        adminInputClass,
                        "bg-white",
                        fieldErrors.quantity_liters && fieldErrorClassName,
                      )}
                      required
                    />
                    {fieldErrors.quantity_liters ? (
                      <p className="text-xs text-red-600">{fieldErrors.quantity_liters}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel-sheet-type" className="text-sm font-semibold text-slate-800">
                    {fuelTypeLabel}
                  </Label>
                  <Select
                    items={fuelTypeItems}
                    value={form.fuel_type}
                    onValueChange={(value) =>
                      updateForm((current) => ({
                        ...current,
                        fuel_type: (value ?? "diesel") as VehicleFuelType,
                      }))
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger
                      id="fuel-sheet-type"
                      className={cn(adminInputClass, "w-full bg-white text-left font-normal flex items-center justify-between")}
                    >
                      <SelectValue placeholder={fuelTypeLabel} />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start">
                      <SelectGroup>
                        {FUEL_TYPES.map((fuelType) => (
                          <SelectItem key={fuelType} value={fuelType}>
                            {detail.fuelTypes[fuelType]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel-sheet-location-type" className="text-sm font-semibold text-slate-800">
                    {locationTypeLabel}
                  </Label>
                  <Select
                    items={locationTypeItems}
                    value={form.location_type}
                    onValueChange={(value) =>
                      updateForm((current) => ({
                        ...current,
                        location_type: (value ?? "external") as FuelLocationType,
                      }))
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger
                      id="fuel-sheet-location-type"
                      className={cn(adminInputClass, "w-full bg-white text-left font-normal flex items-center justify-between")}
                    >
                      <SelectValue placeholder={locationTypeLabel} />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start">
                      <SelectGroup>
                        <SelectItem value="internal">{internalLabel}</SelectItem>
                        <SelectItem value="external">{externalLabel}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-2.5">
                    <span className={adminIconBoxClass}>
                      <Store className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{fuelCopy.stationAndCost}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{fuelCopy.stationAndCostHint}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="fuel-sheet-station"
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <Store className="size-3.5 text-slate-400" />
                        {fuelCopy.station}
                      </Label>
                      <Input
                        id="fuel-sheet-station"
                        value={form.station_name}
                        disabled={submitting}
                        onChange={(event) =>
                          updateForm((current) => ({
                            ...current,
                            station_name: event.target.value,
                          }))
                        }
                        placeholder={fuelCopy.stationPlaceholder}
                        className={cn(
                          adminInputClass,
                          "bg-white",
                          fieldErrors.station_name && fieldErrorClassName,
                        )}
                        required
                      />
                      {fieldErrors.station_name ? (
                        <p className="text-xs text-red-600">{fieldErrors.station_name}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="fuel-sheet-cost"
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <CircleDollarSign className="size-3.5 text-slate-400" />
                        {fuelCopy.cost}
                      </Label>
                      <Input
                        id="fuel-sheet-cost"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={form.total_cost}
                        disabled={submitting}
                        onChange={(event) =>
                          updateForm((current) => ({
                            ...current,
                            total_cost: event.target.value,
                          }))
                        }
                        placeholder={fuelCopy.costPlaceholder}
                        className={cn(
                          adminInputClass,
                          "bg-white",
                          fieldErrors.total_cost && fieldErrorClassName,
                        )}
                        required
                      />
                      {fieldErrors.total_cost ? (
                        <p className="text-xs text-red-600">{fieldErrors.total_cost}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fuel-sheet-receipt" className="text-sm font-medium">
                      {fuelCopy.receipt}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {fuelCopy.optional}
                      </span>
                    </Label>
                    <Input
                      id="fuel-sheet-receipt"
                      value={form.receipt_reference}
                      disabled={submitting}
                      onChange={(event) =>
                        updateForm((current) => ({
                          ...current,
                          receipt_reference: event.target.value,
                        }))
                      }
                      placeholder={fuelCopy.receiptPlaceholder}
                      className={cn(adminInputClass, "bg-white")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                  <Label htmlFor="fuel-sheet-notes" className="text-sm font-semibold">
                    {fuelCopy.notes}
                  </Label>
                  <textarea
                    id="fuel-sheet-notes"
                    value={form.notes}
                    disabled={submitting}
                    onChange={(event) =>
                      updateForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    rows={4}
                    placeholder={fuelCopy.notesPlaceholder}
                    className={textareaClassName}
                  />
                </div>
              </div>
            </Card>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
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
            {fuelCopy.closeForm}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting || !vehicle}
            className={adminPrimaryButtonClass}
          >
            <Plus className="size-4" />
            {submitting ? fuelCopy.saving : fuelCopy.create}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
