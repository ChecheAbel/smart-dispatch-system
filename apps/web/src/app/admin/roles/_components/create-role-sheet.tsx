"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Role } from "@smart-dispatch/types";
import { createRole, fetchRoleById, updateRole } from "@/lib/role-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { getAdminRolesMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type RoleFormSheetMode = "create" | "edit";

type CreateRoleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: RoleFormSheetMode;
  roleId?: string | null;
  onSuccess?: () => void;
};

type RoleFormState = {
  slug: string;
  enName: string;
  enDescription: string;
  amName: string;
  amDescription: string;
};

type FieldErrors = Partial<Record<keyof RoleFormState, string>>;

const emptyForm: RoleFormState = {
  slug: "",
  enName: "",
  enDescription: "",
  amName: "",
  amDescription: "",
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapRoleToForm(role: Role): RoleFormState {
  const en = role.translations?.find((translation) => translation.locale === "en");
  const am = role.translations?.find((translation) => translation.locale === "am");

  return {
    slug: role.slug,
    enName: en?.name ?? "",
    enDescription: en?.description ?? "",
    amName: am?.name ?? "",
    amDescription: am?.description ?? "",
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

export function CreateRoleSheet({
  open,
  onOpenChange,
  mode = "create",
  roleId = null,
  onSuccess,
}: CreateRoleSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminRolesMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<RoleFormState>(emptyForm);
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

    if (!roleId) {
      return;
    }

    const editingId = roleId;
    let cancelled = false;

    async function loadRole() {
      setLoading(true);
      setError(null);

      try {
        const role = await fetchRoleById(editingId);
        if (!cancelled) {
          setForm(mapRoleToForm(role));
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

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, roleId, formCopy.errors.loadFailed]);

  function updateField<K extends keyof RoleFormState>(key: K, value: RoleFormState[K]) {
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

    const slug = normalizeSlug(form.slug);
    const enName = form.enName.trim();
    const amName = form.amName.trim();

    if (!slug) {
      setFieldErrors({ slug: formCopy.errors.slugRequired });
      return;
    }

    if (!enName) {
      setFieldErrors({ enName: formCopy.errors.enNameRequired });
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
      if (isEdit && roleId) {
        await updateRole(roleId, { slug, translations });
        showSuccessToast(toastCopy.updateSuccess);
      } else {
        await createRole({ slug, translations });
        showSuccessToast(toastCopy.createSuccess);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const failedCopy = isEdit ? toastCopy.updateFailed : toastCopy.createFailed;
      const message = err instanceof Error ? err.message : failedCopy.description;
      setError(message);
      showErrorToast({
        title: failedCopy.title,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "role-form-sheet";
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
              <Label htmlFor="role-slug" className={fieldErrors.slug ? "text-red-700" : undefined}>
                {formCopy.slug}
              </Label>
              <Input
                id="role-slug"
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                onBlur={() => updateField("slug", normalizeSlug(form.slug))}
                placeholder={formCopy.slugPlaceholder}
                className={cn(fieldClassName, fieldErrors.slug && fieldErrorClassName)}
                aria-invalid={Boolean(fieldErrors.slug)}
                autoComplete="off"
              />
              {fieldErrors.slug ? (
                <p className="text-xs text-red-600">{fieldErrors.slug}</p>
              ) : (
                <p className="text-xs text-slate-500">{formCopy.slugHelp}</p>
              )}
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <p className={`text-sm font-semibold ${adminHeadingClass}`}>{enLabel}</p>

              <div className="space-y-2">
                <Label htmlFor="role-en-name" className={fieldErrors.enName ? "text-red-700" : undefined}>
                  {formCopy.name}
                </Label>
                <Input
                  id="role-en-name"
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
                <Label htmlFor="role-en-description">{formCopy.description}</Label>
                <textarea
                  id="role-en-description"
                  value={form.enDescription}
                  onChange={(event) => updateField("enDescription", event.target.value)}
                  placeholder={formCopy.descriptionPlaceholder}
                  rows={3}
                  className={cn(
                    "flex w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    fieldClassName,
                    fieldErrors.enDescription && fieldErrorClassName,
                  )}
                  aria-invalid={Boolean(fieldErrors.enDescription)}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <p className={`text-sm font-semibold ${adminHeadingClass}`}>
                {amLabel}
                <span className="ml-2 text-xs font-normal text-slate-500">{formCopy.optional}</span>
              </p>

              <div className="space-y-2">
                <Label htmlFor="role-am-name">{formCopy.name}</Label>
                <Input
                  id="role-am-name"
                  value={form.amName}
                  onChange={(event) => updateField("amName", event.target.value)}
                  placeholder={formCopy.namePlaceholderAm}
                  className={cn(fieldClassName, fieldErrors.amName && fieldErrorClassName)}
                  aria-invalid={Boolean(fieldErrors.amName)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-am-description">{formCopy.description}</Label>
                <textarea
                  id="role-am-description"
                  value={form.amDescription}
                  onChange={(event) => updateField("amDescription", event.target.value)}
                  placeholder={formCopy.descriptionPlaceholder}
                  rows={3}
                  className={cn(
                    "flex w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    fieldClassName,
                    fieldErrors.amDescription && fieldErrorClassName,
                  )}
                  aria-invalid={Boolean(fieldErrors.amDescription)}
                />
              </div>
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
