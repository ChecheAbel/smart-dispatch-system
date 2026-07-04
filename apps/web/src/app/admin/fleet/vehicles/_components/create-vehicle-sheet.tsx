"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Vehicle, VehicleStatus } from "@smart-dispatch/types";
import { createVehicle, fetchVehicleById, fetchVehicleDriverOptions, updateVehicle } from "@/lib/vehicle-api";
import { fetchActiveVehicleTypes } from "@/lib/vehicle-type-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const VEHICLE_STATUSES: VehicleStatus[] = ["active", "maintenance", "retired"];

type VehicleFormSheetMode = "create" | "edit";

type CreateVehicleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: VehicleFormSheetMode;
  vehicleId?: string | null;
  onSuccess?: () => void;
};

type VehicleFormState = {
  plateNumber: string;
  vehicleTypeId: string;
  assignedDriverUserId: string;
  make: string;
  model: string;
  year: string;
  status: VehicleStatus;
  notes: string;
};

type FieldErrors = Partial<Record<keyof VehicleFormState, string>>;

const emptyForm: VehicleFormState = {
  plateNumber: "",
  vehicleTypeId: "",
  assignedDriverUserId: "",
  make: "",
  model: "",
  year: "",
  status: "active",
  notes: "",
};

function mapVehicleToForm(vehicle: Vehicle): VehicleFormState {
  return {
    plateNumber: vehicle.plate_number,
    vehicleTypeId: vehicle.vehicle_type_id,
    assignedDriverUserId: vehicle.assigned_driver_user_id ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year != null ? String(vehicle.year) : "",
    status: vehicle.status,
    notes: vehicle.notes ?? "",
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";
const selectTriggerClassName = "h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm";

export function CreateVehicleSheet({
  open,
  onOpenChange,
  mode = "create",
  vehicleId = null,
  onSuccess,
}: CreateVehicleSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehiclesMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<VehicleFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [driverOptions, setDriverOptions] = useState<Array<{ label: string; value: string }>>([]);

  const vehicleTypeItems = useMemo(
    () => [{ label: formCopy.vehicleTypePlaceholder, value: "" }, ...vehicleTypeOptions],
    [formCopy.vehicleTypePlaceholder, vehicleTypeOptions],
  );

  const driverItems = useMemo(
    () => [{ label: formCopy.noDriver, value: "" }, ...driverOptions],
    [formCopy.noDriver, driverOptions],
  );

  const statusItems = useMemo(
    () =>
      VEHICLE_STATUSES.map((status) => ({
        label: copy.status[status],
        value: status,
      })),
    [copy.status],
  );

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      setOptionsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      setOptionsLoading(true);

      try {
        const [vehicleTypes, drivers] = await Promise.all([
          fetchActiveVehicleTypes(locale),
          fetchVehicleDriverOptions(),
        ]);
        if (!cancelled) {
          setVehicleTypeOptions(
            vehicleTypes.map((vehicleType) => ({
              label: vehicleType.name,
              value: vehicleType.id,
            })),
          );
          setDriverOptions(
            drivers.map((driver) => ({
              label: `${driver.name} (${driver.email})`,
              value: driver.id,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setVehicleTypeOptions([]);
          setDriverOptions([]);
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    if (!isEdit) {
      setForm(emptyForm);
      return () => {
        cancelled = true;
      };
    }

    if (!vehicleId) {
      return () => {
        cancelled = true;
      };
    }

    const editingId = vehicleId;

    async function loadVehicle() {
      setLoading(true);
      setError(null);

      try {
        const vehicle = await fetchVehicleById(editingId, locale);
        if (!cancelled) {
          setForm(mapVehicleToForm(vehicle));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : formCopy.errors.loadFailed;
          setError(message);
          showErrorToast({
            title: toastCopy.loadFailed.title,
            description: message,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadVehicle();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, vehicleId, locale, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const plateNumber = form.plateNumber.trim();
    const vehicleTypeId = form.vehicleTypeId;

    const nextErrors: FieldErrors = {};

    if (!plateNumber) {
      nextErrors.plateNumber = formCopy.errors.plateRequired;
    }

    if (!vehicleTypeId) {
      nextErrors.vehicleTypeId = formCopy.errors.typeRequired;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const yearValue = form.year.trim();
    const year = yearValue ? Number(yearValue) : null;

    const payload = {
      plate_number: plateNumber,
      vehicle_type_id: vehicleTypeId,
      assigned_driver_user_id: form.assignedDriverUserId || null,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);

    try {
      if (isEdit && vehicleId) {
        const vehicle = await updateVehicle(vehicleId, payload);
        showSuccessToast({
          title: toastCopy.updateSuccess.title,
          description: formatMessage(toastCopy.updateSuccess.description, {
            name: vehicle.plate_number,
          }),
        });
      } else {
        const vehicle = await createVehicle(payload);
        showSuccessToast({
          title: toastCopy.createSuccess.title,
          description: formatMessage(toastCopy.createSuccess.description, {
            name: vehicle.plate_number,
          }),
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const failedMessage = isEdit ? formCopy.errors.updateFailed : formCopy.errors.createFailed;
      const message = err instanceof Error ? err.message : failedMessage;
      setError(message);
      showErrorToast({
        title: failedMessage,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "vehicle-form-sheet";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className={adminHeadingClass}>
            {isEdit ? formCopy.editTitle : formCopy.createTitle}
          </SheetTitle>
          <SheetDescription>
            {isEdit ? formCopy.editDescription : formCopy.createDescription}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="px-4 py-8 text-sm text-slate-500">{formCopy.loading}</div>
        ) : (
          <form id={formId} onSubmit={handleSubmit} className="space-y-5 px-4">
            <div className="space-y-2">
              <Label
                htmlFor="vehicle-plate-number"
                className={fieldErrors.plateNumber ? "text-red-700" : undefined}
              >
                {formCopy.plateNumber}
              </Label>
              <Input
                id="vehicle-plate-number"
                value={form.plateNumber}
                onChange={(event) => updateField("plateNumber", event.target.value)}
                placeholder={formCopy.platePlaceholder}
                className={cn(fieldClassName, fieldErrors.plateNumber && fieldErrorClassName)}
                aria-invalid={Boolean(fieldErrors.plateNumber)}
                autoComplete="off"
              />
              {fieldErrors.plateNumber ? (
                <p className="text-xs text-red-600">{fieldErrors.plateNumber}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="vehicle-type-id"
                className={fieldErrors.vehicleTypeId ? "text-red-700" : undefined}
              >
                {formCopy.vehicleType}
              </Label>
              <Select
                items={vehicleTypeItems}
                value={form.vehicleTypeId || null}
                onValueChange={(value) => updateField("vehicleTypeId", value ?? "")}
                disabled={optionsLoading}
              >
                <SelectTrigger
                  id="vehicle-type-id"
                  className={cn(
                    selectTriggerClassName,
                    fieldErrors.vehicleTypeId && fieldErrorClassName,
                  )}
                  aria-invalid={Boolean(fieldErrors.vehicleTypeId)}
                >
                  <SelectValue placeholder={formCopy.vehicleTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {vehicleTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldErrors.vehicleTypeId ? (
                <p className="text-xs text-red-600">{fieldErrors.vehicleTypeId}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-driver-id">{formCopy.assignedDriver}</Label>
              <Select
                items={driverItems}
                value={form.assignedDriverUserId || null}
                onValueChange={(value) => updateField("assignedDriverUserId", value ?? "")}
                disabled={optionsLoading}
              >
                <SelectTrigger id="vehicle-driver-id" className={selectTriggerClassName}>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle-make">{formCopy.make}</Label>
                <Input
                  id="vehicle-make"
                  value={form.make}
                  onChange={(event) => updateField("make", event.target.value)}
                  placeholder={formCopy.makePlaceholder}
                  className={fieldClassName}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-model">{formCopy.model}</Label>
                <Input
                  id="vehicle-model"
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  placeholder={formCopy.modelPlaceholder}
                  className={fieldClassName}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-year">
                {formCopy.year}
                <span className="ml-2 text-xs font-normal text-slate-500">{formCopy.optional}</span>
              </Label>
              <Input
                id="vehicle-year"
                type="number"
                min={1900}
                max={2100}
                value={form.year}
                onChange={(event) => updateField("year", event.target.value)}
                placeholder={formCopy.yearPlaceholder}
                className={fieldClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-status">{formCopy.status}</Label>
              <Select
                items={statusItems}
                value={form.status}
                onValueChange={(value) => updateField("status", (value ?? "active") as VehicleStatus)}
              >
                <SelectTrigger id="vehicle-status" className={selectTriggerClassName}>
                  <SelectValue placeholder={formCopy.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {VEHICLE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {copy.status[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-notes">
                {formCopy.notes}
                <span className="ml-2 text-xs font-normal text-slate-500">{formCopy.optional}</span>
              </Label>
              <textarea
                id="vehicle-notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder={formCopy.notesPlaceholder}
                rows={3}
                className={cn(
                  "flex w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  fieldClassName,
                )}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </form>
        )}

        <SheetFooter className="flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || loading}
            className="border-slate-200"
          >
            {formCopy.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting || loading || optionsLoading}
            className={adminPrimaryButtonClass}
          >
            {submitting
              ? isEdit
                ? formCopy.saving
                : formCopy.creating
              : isEdit
                ? formCopy.save
                : formCopy.create}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
