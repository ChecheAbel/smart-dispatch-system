"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Permission } from "@smart-dispatch/types";
import {
  createPermission,
  fetchPermissionById,
  updatePermission,
} from "@/lib/permission-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { useLocale } from "@/components/shared/providers";
import { getAdminPermissionsMessages } from "@/translations";
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

type PermissionFormSheetMode = "create" | "edit";

type CreatePermissionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: PermissionFormSheetMode;
  permissionId?: string | null;
  onSuccess?: () => void;
};

type PermissionFormState = {
  slug: string;
  module: string;
  action: string;
  description: string;
};

type FieldErrors = Partial<Record<keyof PermissionFormState, string>>;

const emptyForm: PermissionFormState = {
  slug: "",
  module: "",
  action: "",
  description: "",
};

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function normalizeField(value: string) {
  return value.trim().toLowerCase();
}

function mapPermissionToForm(permission: Permission): PermissionFormState {
  return {
    slug: permission.slug,
    module: permission.module,
    action: permission.action,
    description: permission.description ?? "",
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

export function CreatePermissionSheet({
  open,
  onOpenChange,
  mode = "create",
  permissionId = null,
  onSuccess,
}: CreatePermissionSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminPermissionsMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<PermissionFormState>(emptyForm);
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

    if (!permissionId) {
      return;
    }

    const editingId = permissionId;
    let cancelled = false;

    async function loadPermission() {
      setLoading(true);
      setError(null);

      try {
        const permission = await fetchPermissionById(editingId);
        if (!cancelled) {
          setForm(mapPermissionToForm(permission));
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

    void loadPermission();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, permissionId, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof PermissionFormState>(key: K, value: PermissionFormState[K]) {
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
    const module = normalizeField(form.module);
    const action = normalizeField(form.action);

    const errors: FieldErrors = {};

    if (!slug) {
      errors.slug = formCopy.errors.slugRequired;
    }

    if (!module) {
      errors.module = formCopy.errors.moduleRequired;
    }

    if (!action) {
      errors.action = formCopy.errors.actionRequired;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const description = form.description.trim() || null;

    setSubmitting(true);

    try {
      if (isEdit && permissionId) {
        await updatePermission(permissionId, { slug, module, action, description });
        showSuccessToast(toastCopy.updateSuccess);
      } else {
        await createPermission({ slug, module, action, description });
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

  const formId = "permission-form-sheet";

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
              <Label htmlFor="permission-slug" className={fieldErrors.slug ? "text-red-700" : undefined}>
                {formCopy.slug}
              </Label>
              <Input
                id="permission-slug"
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

            <div className="space-y-2">
              <Label htmlFor="permission-module" className={fieldErrors.module ? "text-red-700" : undefined}>
                {formCopy.module}
              </Label>
              <Input
                id="permission-module"
                value={form.module}
                onChange={(event) => updateField("module", event.target.value)}
                onBlur={() => updateField("module", normalizeField(form.module))}
                placeholder={formCopy.modulePlaceholder}
                className={cn(fieldClassName, fieldErrors.module && fieldErrorClassName)}
                aria-invalid={Boolean(fieldErrors.module)}
                autoComplete="off"
              />
              {fieldErrors.module ? (
                <p className="text-xs text-red-600">{fieldErrors.module}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission-action" className={fieldErrors.action ? "text-red-700" : undefined}>
                {formCopy.action}
              </Label>
              <Input
                id="permission-action"
                value={form.action}
                onChange={(event) => updateField("action", event.target.value)}
                onBlur={() => updateField("action", normalizeField(form.action))}
                placeholder={formCopy.actionPlaceholder}
                className={cn(fieldClassName, fieldErrors.action && fieldErrorClassName)}
                aria-invalid={Boolean(fieldErrors.action)}
                autoComplete="off"
              />
              {fieldErrors.action ? (
                <p className="text-xs text-red-600">{fieldErrors.action}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission-description">{formCopy.description}</Label>
              <textarea
                id="permission-description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder={formCopy.descriptionPlaceholder}
                rows={3}
                className={cn(
                  "flex w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  fieldClassName,
                  fieldErrors.description && fieldErrorClassName,
                )}
                aria-invalid={Boolean(fieldErrors.description)}
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
