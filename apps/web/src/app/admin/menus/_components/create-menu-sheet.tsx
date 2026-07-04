"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Menu, Permission } from "@smart-dispatch/types";
import { createMenu, fetchMenuById, fetchMenus, updateMenu } from "@/lib/menu-api";
import { fetchPermissions } from "@/lib/permission-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { getAdminMenusMessages } from "@/translations";
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

type MenuFormSheetMode = "create" | "edit";

type CreateMenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: MenuFormSheetMode;
  menuId?: string | null;
  onSuccess?: () => void;
};

type MenuFormState = {
  slug: string;
  path: string;
  icon: string;
  sortOrder: string;
  parentId: string;
  permissionId: string;
  isActive: boolean;
  enLabel: string;
  amLabel: string;
};

type FieldErrors = Partial<Record<keyof MenuFormState, string>>;

const emptyForm: MenuFormState = {
  slug: "",
  path: "",
  icon: "",
  sortOrder: "0",
  parentId: "",
  permissionId: "",
  isActive: true,
  enLabel: "",
  amLabel: "",
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapMenuToForm(menu: Menu): MenuFormState {
  const en = menu.translations?.find((translation) => translation.locale === "en");
  const am = menu.translations?.find((translation) => translation.locale === "am");

  return {
    slug: menu.slug,
    path: menu.path ?? "",
    icon: menu.icon ?? "",
    sortOrder: String(menu.sort_order),
    parentId: menu.parent_id ?? "",
    permissionId: menu.permission_id ?? "",
    isActive: menu.is_active,
    enLabel: en?.label ?? menu.label ?? "",
    amLabel: am?.label ?? "",
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";
const selectClassName = cn(fieldClassName, "w-full");

export function CreateMenuSheet({
  open,
  onOpenChange,
  mode = "create",
  menuId = null,
  onSuccess,
}: CreateMenuSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminMenusMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<MenuFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parentMenus, setParentMenus] = useState<Menu[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      setParentMenus([]);
      setPermissions([]);
      setOptionsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      setOptionsLoading(true);

      try {
        const [menusResult, permissionsResult] = await Promise.all([
          fetchMenus({ page: 1, limit: 100, locale }),
          fetchPermissions({ page: 1, limit: 100 }),
        ]);

        if (!cancelled) {
          setParentMenus(menusResult.data);
          setPermissions(permissionsResult.data);
        }
      } catch {
        if (!cancelled) {
          setParentMenus([]);
          setPermissions([]);
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

    if (!menuId) {
      return () => {
        cancelled = true;
      };
    }

    const editingId = menuId;

    async function loadMenu() {
      setLoading(true);
      setError(null);

      try {
        const menu = await fetchMenuById(editingId, locale);
        if (!cancelled) {
          setForm(mapMenuToForm(menu));
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

    void loadMenu();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, menuId, locale, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof MenuFormState>(key: K, value: MenuFormState[K]) {
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
    const enLabel = form.enLabel.trim();
    const amLabel = form.amLabel.trim();
    const sortOrderValue = form.sortOrder.trim();
    const parsedSortOrder = sortOrderValue === "" ? 0 : Number(sortOrderValue);

    if (!slug) {
      setFieldErrors({ slug: formCopy.errors.slugRequired });
      return;
    }

    if (!enLabel) {
      setFieldErrors({ enLabel: formCopy.errors.enLabelRequired });
      return;
    }

    if (Number.isNaN(parsedSortOrder)) {
      setFieldErrors({ sortOrder: formCopy.errors.sortOrderInvalid });
      return;
    }

    const translations = [{ locale: "en", label: enLabel }];

    if (amLabel) {
      translations.push({ locale: "am", label: amLabel });
    }

    const payload = {
      slug,
      translations,
      path: form.path.trim() || null,
      icon: form.icon.trim() || null,
      parent_id: form.parentId || null,
      permission_id: form.permissionId || null,
      sort_order: parsedSortOrder,
      is_active: form.isActive,
    };

    setSubmitting(true);

    try {
      if (isEdit && menuId) {
        await updateMenu(menuId, payload);
        showSuccessToast(toastCopy.updateSuccess);
      } else {
        await createMenu(payload);
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

  const formId = "menu-form-sheet";
  const enLabel = LOCALE_OPTIONS.find((option) => option.value === "en")?.label ?? "English";
  const amLabel = LOCALE_OPTIONS.find((option) => option.value === "am")?.nativeLabel ?? "Amharic";
  const availableParentMenus = parentMenus.filter((menu) => menu.id !== menuId);

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
              <Label htmlFor="menu-slug" className={fieldErrors.slug ? "text-red-700" : undefined}>
                {formCopy.slug}
              </Label>
              <Input
                id="menu-slug"
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
              <Label htmlFor="menu-path">{formCopy.path}</Label>
              <Input
                id="menu-path"
                value={form.path}
                onChange={(event) => updateField("path", event.target.value)}
                placeholder={formCopy.pathPlaceholder}
                className={fieldClassName}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-icon">{formCopy.icon}</Label>
              <Input
                id="menu-icon"
                value={form.icon}
                onChange={(event) => updateField("icon", event.target.value)}
                placeholder={formCopy.iconPlaceholder}
                className={fieldClassName}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="menu-sort-order"
                className={fieldErrors.sortOrder ? "text-red-700" : undefined}
              >
                {formCopy.sortOrder}
              </Label>
              <Input
                id="menu-sort-order"
                type="number"
                value={form.sortOrder}
                onChange={(event) => updateField("sortOrder", event.target.value)}
                placeholder={formCopy.sortOrderPlaceholder}
                className={cn(fieldClassName, fieldErrors.sortOrder && fieldErrorClassName)}
                aria-invalid={Boolean(fieldErrors.sortOrder)}
              />
              {fieldErrors.sortOrder ? (
                <p className="text-xs text-red-600">{fieldErrors.sortOrder}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-parent-id">{formCopy.parentId}</Label>
              <select
                id="menu-parent-id"
                value={form.parentId}
                onChange={(event) => updateField("parentId", event.target.value)}
                disabled={optionsLoading}
                className={selectClassName}
              >
                <option value="">{formCopy.noneOption}</option>
                {availableParentMenus.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.label} ({menu.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-permission-id">{formCopy.permissionId}</Label>
              <select
                id="menu-permission-id"
                value={form.permissionId}
                onChange={(event) => updateField("permissionId", event.target.value)}
                disabled={optionsLoading}
                className={selectClassName}
              >
                <option value="">{formCopy.noneOption}</option>
                {permissions.map((permission) => (
                  <option key={permission.id} value={permission.id}>
                    {permission.slug}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="menu-is-active"
                checked={form.isActive}
                onCheckedChange={(checked) => updateField("isActive", checked === true)}
                disabled={submitting || loading}
                className="data-checked:border-[#1C3A34] data-checked:bg-[#1C3A34] data-checked:text-white"
              />
              <Label htmlFor="menu-is-active" className="cursor-pointer font-normal text-slate-700">
                {formCopy.isActive}
              </Label>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <p className={`text-sm font-semibold ${adminHeadingClass}`}>{enLabel}</p>

              <div className="space-y-2">
                <Label
                  htmlFor="menu-en-label"
                  className={fieldErrors.enLabel ? "text-red-700" : undefined}
                >
                  {formCopy.label}
                </Label>
                <Input
                  id="menu-en-label"
                  value={form.enLabel}
                  onChange={(event) => updateField("enLabel", event.target.value)}
                  placeholder={formCopy.labelPlaceholderEn}
                  className={cn(fieldClassName, fieldErrors.enLabel && fieldErrorClassName)}
                  aria-invalid={Boolean(fieldErrors.enLabel)}
                />
                {fieldErrors.enLabel ? (
                  <p className="text-xs text-red-600">{fieldErrors.enLabel}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-4">
              <p className={`text-sm font-semibold ${adminHeadingClass}`}>
                {amLabel}
                <span className="ml-2 text-xs font-normal text-slate-500">{formCopy.optional}</span>
              </p>

              <div className="space-y-2">
                <Label htmlFor="menu-am-label">{formCopy.label}</Label>
                <Input
                  id="menu-am-label"
                  value={form.amLabel}
                  onChange={(event) => updateField("amLabel", event.target.value)}
                  placeholder={formCopy.labelPlaceholderAm}
                  className={fieldClassName}
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
