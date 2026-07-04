"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Region } from "@smart-dispatch/types";
import { createRegion, fetchRegionById, updateRegion } from "@/lib/region-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminRegionsMessages } from "@/translations";
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

type RegionFormSheetMode = "create" | "edit";

type CreateRegionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: RegionFormSheetMode;
  regionId?: string | null;
  onSuccess?: () => void;
};

type RegionFormState = {
  enName: string;
  enDescription: string;
  amName: string;
  amDescription: string;
  isActive: boolean;
};

type FieldErrors = Partial<Record<keyof RegionFormState, string>>;

const emptyForm: RegionFormState = {
  enName: "",
  enDescription: "",
  amName: "",
  amDescription: "",
  isActive: true,
};

function mapRegionToForm(region: Region): RegionFormState {
  const en = region.translations?.find((translation) => translation.locale === "en");
  const am = region.translations?.find((translation) => translation.locale === "am");

  return {
    enName: en?.name ?? region.name,
    enDescription: en?.description ?? region.description ?? "",
    amName: am?.name ?? "",
    amDescription: am?.description ?? "",
    isActive: region.is_active,
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

export function CreateRegionSheet({
  open,
  onOpenChange,
  mode = "create",
  regionId = null,
  onSuccess,
}: CreateRegionSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminRegionsMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<RegionFormState>(emptyForm);
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

    if (!regionId) {
      return;
    }

    const editingId = regionId;
    let cancelled = false;

    async function loadRegion() {
      setLoading(true);
      setError(null);

      try {
        const region = await fetchRegionById(editingId);
        if (!cancelled) {
          setForm(mapRegionToForm(region));
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

    void loadRegion();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, regionId, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof RegionFormState>(key: K, value: RegionFormState[K]) {
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

    setSubmitting(true);

    try {
      if (isEdit && regionId) {
        const region = await updateRegion(regionId, {
          translations,
          is_active: form.isActive,
        });
        showSuccessToast({
          title: toastCopy.updateSuccess.title,
          description: formatMessage(toastCopy.updateSuccess.description, {
            name: region.name,
          }),
        });
      } else {
        const region = await createRegion({
          translations,
          is_active: form.isActive,
        });
        showSuccessToast({
          title: toastCopy.createSuccess.title,
          description: formatMessage(toastCopy.createSuccess.description, {
            name: region.name,
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

  const formId = "region-form-sheet";
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
            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <p className={`text-sm font-semibold ${adminHeadingClass}`}>{enLabel}</p>

              <div className="space-y-2">
                <Label
                  htmlFor="region-en-name"
                  className={fieldErrors.enName ? "text-red-700" : undefined}
                >
                  {formCopy.name}
                </Label>
                <Input
                  id="region-en-name"
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
                <Label htmlFor="region-en-description">{formCopy.description}</Label>
                <textarea
                  id="region-en-description"
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
                <Label htmlFor="region-am-name">{formCopy.name}</Label>
                <Input
                  id="region-am-name"
                  value={form.amName}
                  onChange={(event) => updateField("amName", event.target.value)}
                  placeholder={formCopy.namePlaceholderAm}
                  className={fieldClassName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region-am-description">{formCopy.description}</Label>
                <textarea
                  id="region-am-description"
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

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f8fafb]/60 px-4 py-3">
              <Label htmlFor="region-active" className="text-sm font-medium text-slate-700">
                {formCopy.active}
              </Label>
              <Switch
                id="region-active"
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
