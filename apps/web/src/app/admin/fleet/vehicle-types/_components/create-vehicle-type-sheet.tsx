"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { VehicleClass, VehicleType } from "@smart-dispatch/types";
import {
  createVehicleType,
  fetchVehicleTypeById,
  updateVehicleType,
} from "@/lib/vehicle-type-api";
import { fetchActiveVehicleClasses } from "@/lib/vehicle-class-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminVehicleTypesMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type VehicleTypeFormSheetMode = "create" | "edit";

type CreateVehicleTypeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: VehicleTypeFormSheetMode;
  vehicleTypeId?: string | null;
  onSuccess?: () => void;
};

type VehicleTypeFormState = {
  enName: string;
  enDescription: string;
  amName: string;
  amDescription: string;
  passengerCapacity: string;
  isActive: boolean;
};

type FieldErrors = Partial<Record<keyof VehicleTypeFormState, string>>;

const emptyForm: VehicleTypeFormState = {
  enName: "",
  enDescription: "",
  amName: "",
  amDescription: "",
  passengerCapacity: "",
  isActive: true,
};

function mapVehicleTypeToForm(vehicleType: VehicleType): VehicleTypeFormState {
  const en = vehicleType.translations?.find((translation) => translation.locale === "en");
  const am = vehicleType.translations?.find((translation) => translation.locale === "am");

  return {
    enName: en?.name ?? vehicleType.name,
    enDescription: en?.description ?? vehicleType.description ?? "",
    amName: am?.name ?? "",
    amDescription: am?.description ?? "",
    passengerCapacity:
      vehicleType.passenger_capacity != null ? String(vehicleType.passenger_capacity) : "",
    isActive: vehicleType.is_active,
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

export function CreateVehicleTypeSheet({
  open,
  onOpenChange,
  mode = "create",
  vehicleTypeId = null,
  onSuccess,
}: CreateVehicleTypeSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehicleTypesMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<VehicleTypeFormState>(emptyForm);
  const [allowedClassIds, setAllowedClassIds] = useState<string[]>([]);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setAllowedClassIds([]);
      setVehicleClasses([]);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadVehicleClasses() {
      try {
        const classes = await fetchActiveVehicleClasses(locale);
        if (!cancelled) {
          setVehicleClasses(classes);
        }
      } catch {
        if (!cancelled) {
          setVehicleClasses([]);
        }
      }
    }

    void loadVehicleClasses();

    if (!isEdit) {
      setForm(emptyForm);
      setAllowedClassIds([]);
      return () => {
        cancelled = true;
      };
    }

    if (!vehicleTypeId) {
      return () => {
        cancelled = true;
      };
    }

    const editingId = vehicleTypeId;

    async function loadVehicleType() {
      setLoading(true);
      setError(null);

      try {
        const vehicleType = await fetchVehicleTypeById(editingId);
        if (!cancelled) {
          setForm(mapVehicleTypeToForm(vehicleType));
          setAllowedClassIds(vehicleType.allowed_class_ids ?? []);
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

    void loadVehicleType();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    isEdit,
    vehicleTypeId,
    locale,
    formCopy.errors.loadFailed,
    toastCopy.loadFailed.title,
  ]);

  function updateField<K extends keyof VehicleTypeFormState>(
    key: K,
    value: VehicleTypeFormState[K],
  ) {
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

  function toggleAllowedClass(classId: string, checked: boolean) {
    setAllowedClassIds((current) => {
      if (checked) {
        return current.includes(classId) ? current : [...current, classId];
      }

      return current.filter((id) => id !== classId);
    });
    setError(null);
  }

  function mapAllowedClassError(message: string) {
    if (message.includes("not available")) {
      return formCopy.errors.allowedClassesInvalid;
    }

    if (message.includes("still used")) {
      return formCopy.errors.allowedClassesInUse;
    }

    return message;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const enName = form.enName.trim();
    const amName = form.amName.trim();

    const nextErrors: FieldErrors = {};

    if (!enName) {
      nextErrors.enName = formCopy.errors.enNameRequired;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const translations = [
      {
        locale: "en",
        name: enName,
        description: form.enDescription.trim() || null,
      },
    ];

    if (amName) {
      translations.push({
        locale: "am",
        name: amName,
        description: form.amDescription.trim() || null,
      });
    }

    const capacityValue = form.passengerCapacity.trim();
    const passenger_capacity = capacityValue ? Number(capacityValue) : null;

    setSubmitting(true);

    try {
      if (isEdit && vehicleTypeId) {
        const vehicleType = await updateVehicleType(vehicleTypeId, {
          translations,
          passenger_capacity,
          is_active: form.isActive,
          allowed_class_ids: allowedClassIds,
        });
        showSuccessToast({
          title: toastCopy.updateSuccess.title,
          description: formatMessage(toastCopy.updateSuccess.description, {
            name: vehicleType.name,
          }),
        });
      } else {
        const vehicleType = await createVehicleType({
          translations,
          passenger_capacity,
          is_active: form.isActive,
          allowed_class_ids: allowedClassIds,
        });
        showSuccessToast({
          title: toastCopy.createSuccess.title,
          description: formatMessage(toastCopy.createSuccess.description, {
            name: vehicleType.name,
          }),
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const failedMessage = isEdit ? formCopy.errors.updateFailed : formCopy.errors.createFailed;
      const message = mapAllowedClassError(
        err instanceof Error ? err.message : failedMessage,
      );
      setError(message);
      showErrorToast({
        title: failedMessage,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "vehicle-type-form-sheet";
  const enLabel = LOCALE_OPTIONS.find((option) => option.value === "en")?.label ?? "English";
  const amLabel = LOCALE_OPTIONS.find((option) => option.value === "am")?.nativeLabel ?? "Amharic";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-y-auto data-[side=right]:sm:max-w-xl"
      >
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
          <form id={formId} onSubmit={handleSubmit} className="space-y-6 px-4">
            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <p className={`text-sm font-semibold ${adminHeadingClass}`}>{enLabel}</p>

              <div className="space-y-2">
                <Label
                  htmlFor="vehicle-type-en-name"
                  className={fieldErrors.enName ? "text-red-700" : undefined}
                >
                  {formCopy.name}
                </Label>
                <Input
                  id="vehicle-type-en-name"
                  value={form.enName}
                  onChange={(event) => updateField("enName", event.target.value)}
                  placeholder={formCopy.namePlaceholderEn}
                  className={cn(fieldClassName, fieldErrors.enName && fieldErrorClassName)}
                  aria-invalid={Boolean(fieldErrors.enName)}
                />
                {fieldErrors.enName ? (
                  <p className="text-xs text-red-600">{fieldErrors.enName}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-type-en-description">{formCopy.description}</Label>
                <textarea
                  id="vehicle-type-en-description"
                  value={form.enDescription}
                  onChange={(event) => updateField("enDescription", event.target.value)}
                  placeholder={formCopy.descriptionPlaceholder}
                  rows={3}
                  className={cn(
                    "flex w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    fieldClassName,
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <p className={`text-sm font-semibold ${adminHeadingClass}`}>
                {amLabel}
                <span className="ml-2 text-xs font-normal text-slate-500">{formCopy.optional}</span>
              </p>

              <div className="space-y-2">
                <Label htmlFor="vehicle-type-am-name">{formCopy.name}</Label>
                <Input
                  id="vehicle-type-am-name"
                  value={form.amName}
                  onChange={(event) => updateField("amName", event.target.value)}
                  placeholder={formCopy.namePlaceholderAm}
                  className={fieldClassName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-type-am-description">{formCopy.description}</Label>
                <textarea
                  id="vehicle-type-am-description"
                  value={form.amDescription}
                  onChange={(event) => updateField("amDescription", event.target.value)}
                  placeholder={formCopy.descriptionPlaceholder}
                  rows={3}
                  className={cn(
                    "flex w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    fieldClassName,
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-type-capacity">{formCopy.capacity}</Label>
              <Input
                id="vehicle-type-capacity"
                type="number"
                min={0}
                value={form.passengerCapacity}
                onChange={(event) => updateField("passengerCapacity", event.target.value)}
                placeholder={formCopy.capacityPlaceholder}
                className={fieldClassName}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <div className="space-y-1">
                <p className={`text-sm font-semibold ${adminHeadingClass}`}>
                  {formCopy.allowedClasses}
                </p>
                <p className="text-xs leading-relaxed text-slate-500">
                  {formCopy.allowedClassesDescription}
                </p>
              </div>

              {vehicleClasses.length === 0 ? (
                <p className="text-sm text-slate-500">{formCopy.allowedClassesEmpty}</p>
              ) : (
                <div className="space-y-2">
                  {vehicleClasses.map((vehicleClass) => {
                    const checkboxId = `vehicle-type-class-${vehicleClass.id}`;

                    return (
                      <div
                        key={vehicleClass.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={allowedClassIds.includes(vehicleClass.id)}
                          onCheckedChange={(checked) =>
                            toggleAllowedClass(vehicleClass.id, checked === true)
                          }
                          disabled={submitting || loading}
                          className="mt-0.5 data-checked:border-[#1C3A34] data-checked:bg-[#1C3A34] data-checked:text-white"
                        />
                        <Label htmlFor={checkboxId} className="min-w-0 cursor-pointer space-y-0.5">
                          <span className="block text-sm font-medium text-[#1C3A34]">
                            {vehicleClass.name}
                          </span>
                          {vehicleClass.description ? (
                            <span className="block text-xs leading-relaxed text-slate-500">
                              {vehicleClass.description}
                            </span>
                          ) : null}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f8fafb]/60 px-4 py-3">
              <Label htmlFor="vehicle-type-active" className="text-sm font-medium text-slate-700">
                {formCopy.active}
              </Label>
              <Switch
                id="vehicle-type-active"
                checked={form.isActive}
                onCheckedChange={(checked) => updateField("isActive", checked)}
                disabled={submitting || loading}
                aria-label={formCopy.active}
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
            disabled={submitting || loading}
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
