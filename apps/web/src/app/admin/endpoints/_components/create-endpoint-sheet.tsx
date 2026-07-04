"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Endpoint, HttpMethod, Permission } from "@smart-dispatch/types";
import {
  createEndpoint,
  fetchEndpointById,
  updateEndpoint,
} from "@/lib/endpoint-api";
import { fetchPermissions } from "@/lib/permission-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { useLocale } from "@/components/shared/providers";
import { getAdminEndpointsMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type EndpointFormSheetMode = "create" | "edit";

type CreateEndpointSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: EndpointFormSheetMode;
  endpointId?: string | null;
  onSuccess?: () => void;
};

type EndpointFormState = {
  slug: string;
  method: HttpMethod;
  path: string;
  description: string;
  permissionId: string;
  isActive: boolean;
};

type FieldErrors = Partial<Record<keyof EndpointFormState, string>>;

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PATCH", "PUT", "DELETE"];

const emptyForm: EndpointFormState = {
  slug: "",
  method: "GET",
  path: "",
  description: "",
  permissionId: "",
  isActive: true,
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapEndpointToForm(endpoint: Endpoint): EndpointFormState {
  return {
    slug: endpoint.slug,
    method: endpoint.method,
    path: endpoint.path,
    description: endpoint.description ?? "",
    permissionId: endpoint.permission_id ?? "",
    isActive: endpoint.is_active,
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

export function CreateEndpointSheet({
  open,
  onOpenChange,
  mode = "create",
  endpointId = null,
  onSuccess,
}: CreateEndpointSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminEndpointsMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<EndpointFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPermissions() {
      setPermissionsLoading(true);

      try {
        const result = await fetchPermissions({ page: 1, limit: 200 });
        if (!cancelled) {
          setPermissions(result.data);
        }
      } catch {
        if (!cancelled) {
          setPermissions([]);
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    }

    void loadPermissions();

    if (!isEdit) {
      setForm(emptyForm);
      return () => {
        cancelled = true;
      };
    }

    if (!endpointId) {
      return () => {
        cancelled = true;
      };
    }

    const editingId = endpointId;

    async function loadEndpoint() {
      setLoading(true);
      setError(null);

      try {
        const endpoint = await fetchEndpointById(editingId);
        if (!cancelled) {
          setForm(mapEndpointToForm(endpoint));
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

    void loadEndpoint();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, endpointId, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof EndpointFormState>(key: K, value: EndpointFormState[K]) {
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
    const path = form.path.trim();

    if (!slug) {
      setFieldErrors({ slug: formCopy.errors.slugRequired });
      return;
    }

    if (!path) {
      setFieldErrors({ path: formCopy.errors.pathRequired });
      return;
    }

    const payload = {
      slug,
      method: form.method,
      path,
      description: form.description.trim() || null,
      permission_id: form.permissionId || null,
      is_active: form.isActive,
    };

    setSubmitting(true);

    try {
      if (isEdit && endpointId) {
        await updateEndpoint(endpointId, payload);
        showSuccessToast(toastCopy.updateSuccess);
      } else {
        await createEndpoint(payload);
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

  const formId = "endpoint-form-sheet";

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
              <Label htmlFor="endpoint-slug" className={fieldErrors.slug ? "text-red-700" : undefined}>
                {formCopy.slug}
              </Label>
              <Input
                id="endpoint-slug"
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
              <Label htmlFor="endpoint-method">{formCopy.method}</Label>
              <select
                id="endpoint-method"
                value={form.method}
                onChange={(event) => updateField("method", event.target.value as HttpMethod)}
                className={cn(
                  "flex w-full rounded-lg border outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  fieldClassName,
                )}
              >
                {HTTP_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint-path" className={fieldErrors.path ? "text-red-700" : undefined}>
                {formCopy.path}
              </Label>
              <Input
                id="endpoint-path"
                value={form.path}
                onChange={(event) => updateField("path", event.target.value)}
                placeholder={formCopy.pathPlaceholder}
                className={cn(fieldClassName, fieldErrors.path && fieldErrorClassName)}
                aria-invalid={Boolean(fieldErrors.path)}
                autoComplete="off"
              />
              {fieldErrors.path ? (
                <p className="text-xs text-red-600">{fieldErrors.path}</p>
              ) : (
                <p className="text-xs text-slate-500">{formCopy.pathHelp}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint-description">{formCopy.description}</Label>
              <textarea
                id="endpoint-description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder={formCopy.descriptionPlaceholder}
                rows={3}
                className={cn(
                  "flex w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  fieldClassName,
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endpoint-permission">{formCopy.permission}</Label>
              <select
                id="endpoint-permission"
                value={form.permissionId}
                onChange={(event) => updateField("permissionId", event.target.value)}
                disabled={permissionsLoading}
                className={cn(
                  "flex w-full rounded-lg border outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                  fieldClassName,
                )}
              >
                <option value="">{formCopy.noPermission}</option>
                {permissions.map((permission) => (
                  <option key={permission.id} value={permission.id}>
                    {permission.slug}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{formCopy.permissionHelp}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="endpoint-is-active"
                checked={form.isActive}
                onCheckedChange={(checked) => updateField("isActive", checked === true)}
                className="data-checked:border-[#1C3A34] data-checked:bg-[#1C3A34] data-checked:text-white"
              />
              <Label htmlFor="endpoint-is-active" className="cursor-pointer font-normal">
                {formCopy.isActive}
              </Label>
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
