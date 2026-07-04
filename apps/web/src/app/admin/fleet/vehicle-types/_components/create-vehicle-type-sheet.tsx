"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { VehicleType } from "@smart-dispatch/types";
import {
  createVehicleType,
  fetchVehicleTypeById,
  updateVehicleType,
} from "@/lib/vehicle-type-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminVehicleTypesMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
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
  slug: string;
  enName: string;
  enDescription: string;
  amName: string;
  amDescription: string;
  passengerCapacity: string;
  isActive: boolean;
};

type FieldErrors = Partial<Record<keyof VehicleTypeFormState, string>>;

const emptyForm: VehicleTypeFormState = {
  slug: "",
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
    slug: vehicleType.slug,
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      return;
    }

    if (!isEdit) {
      setForm(emptyForm);
      return;
    }

    if (!vehicleTypeId) {
      return;
    }

    const editingId = vehicleTypeId;
    let cancelled = false;

    async function loadVehicleType() {
      setLoading(true);
      setError(null);

      try {
        const vehicleType = await fetchVehicleTypeById(editingId);
        if (!cancelled) {
          setForm(mapVehicleTypeToForm(vehicleType));
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
  }, [open, isEdit, vehicleTypeId, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const slug = form.slug.trim();
    const enName = form.enName.trim();
    const amName = form.amName.trim();

    const nextErrors: FieldErrors = {};

    if (!slug) {
      nextErrors.slug = formCopy.errors.slugRequired;
    }

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
          slug,
          translations,
          passenger_capacity,
          is_active: form.isActive,
        });
        showSuccessToast({
          title: toastCopy.updateSuccess.title,
          description: formatMessage(toastCopy.updateSuccess.description, {
            name: vehicleType.name,
          }),
        });
      } else {
        const vehicleType = await createVehicleType({
          slug,
          translations,
          passenger_capacity,
          is_active: form.isActive,
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

  const formId = "vehicle-type-form-sheet";
  const enLabel = LOCALE_OPTIONS.find((option) => option.value === "en")?.label ?? "English";
  const amLabel = LOCALE_OPTIONS.find((option) => option.value === "am")?.nativeLabel ?? "Amharic";

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
          <form id={formId} onSubmit={handleSubmit} className="space-y-6 px-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-type-slug" className={fieldErrors.slug ? "text-red-700" : undefined}>
                {formCopy.slug}
              </Label>
              <Input
                id="vehicle-type-slug"
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                placeholder={formCopy.slugPlaceholder}
                className={cn(fieldClassName, fieldErrors.slug && fieldErrorClassName)}
                aria-invalid={Boolean(fieldErrors.slug)}
                autoComplete="off"
              />
              {fieldErrors.slug ? <p className="text-xs text-red-600">{fieldErrors.slug}</p> : null}
            </div>

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
