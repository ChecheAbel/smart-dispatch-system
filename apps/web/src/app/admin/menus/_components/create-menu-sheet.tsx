"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Menu, Permission } from "@smart-dispatch/types";
import { createMenu, fetchMenuById, fetchMenus, updateMenu } from "@/lib/menu-api";
import { generateSlugFromText } from "@/lib/slug";
import { fetchPermissions } from "@/lib/permission-api";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass, adminCardClass } from "@/lib/admin-theme";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { getAdminMenusMessages, getAdminRolesMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { MenuPermissionPicker, getPermissionModuleOptions, inferPermissionModule } from "./menu-permission-picker";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type MenuFormSheetMode = "create" | "edit";

type CreateMenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: MenuFormSheetMode;
  menuId?: string | null;
  onSuccess?: () => void;
};

type MenuFormState = {
  path: string;
  icon: string;
  sortOrder: string;
  parentId: string;
  permissionIds: string[];
  isActive: boolean;
  enLabel: string;
  amLabel: string;
};

type FieldErrors = Partial<Record<keyof MenuFormState, string>>;

const emptyForm: MenuFormState = {
  path: "",
  icon: "",
  sortOrder: "0",
  parentId: "",
  permissionIds: [],
  isActive: true,
  enLabel: "",
  amLabel: "",
};

function mapMenuToForm(menu: Menu): MenuFormState {
  const en = menu.translations?.find((translation) => translation.locale === "en");
  const am = menu.translations?.find((translation) => translation.locale === "am");

  return {
    path: menu.path ?? "",
    icon: menu.icon ?? "",
    sortOrder: String(menu.sort_order),
    parentId: menu.parent_id ?? "",
    permissionIds: menu.permission_ids ?? [],
    isActive: menu.is_active,
    enLabel: en?.label ?? menu.label ?? "",
    amLabel: am?.label ?? "",
  };
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";
const selectTriggerClassName = cn(fieldClassName, "w-full");

export function CreateMenuSheet({
  open,
  onOpenChange,
  mode = "create",
  menuId = null,
  onSuccess,
}: CreateMenuSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminMenusMessages(locale);
  const roleCopy = getAdminRolesMessages(locale);
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
  const [permissionModule, setPermissionModule] = useState("");
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
      setPermissionModule("");
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

  function updatePermissionModule(module: string) {
    setPermissionModule(module);
    setForm((current) => ({ ...current, permissionIds: [] }));
    setError(null);
  }

  useEffect(() => {
    if (!open || !permissions.length || !form.permissionIds.length) {
      return;
    }

    setPermissionModule((current) =>
      current || inferPermissionModule(form.permissionIds, permissions),
    );
  }, [open, form.permissionIds, permissions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const enLabel = form.enLabel.trim();
    const amLabel = form.amLabel.trim();
    const sortOrderValue = form.sortOrder.trim();
    const parsedSortOrder = sortOrderValue === "" ? 0 : Number(sortOrderValue);

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
      translations,
      path: form.path.trim() || null,
      icon: form.icon.trim() || null,
      parent_id: form.parentId || null,
      permission_ids: form.permissionIds,
      sort_order: parsedSortOrder,
      is_active: form.isActive,
    };

    let createSlug: string | undefined;

    if (!isEdit) {
      createSlug = generateSlugFromText(enLabel);
      if (!createSlug) {
        setFieldErrors({ enLabel: formCopy.errors.enLabelRequired });
        return;
      }
    }

    setSubmitting(true);

    try {
      if (isEdit && menuId) {
        await updateMenu(menuId, payload);
        showSuccessToast(toastCopy.updateSuccess);
      } else {
        await createMenu({ slug: createSlug!, ...payload });
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
  const parentMenuItems = [
    { label: formCopy.noneOption, value: null },
    ...availableParentMenus.map((menu) => ({
      label: `${menu.label} (${menu.slug})`,
      value: menu.id,
    })),
  ];
  const permissionModuleItems = useMemo(
    () => [
      { label: formCopy.noneOption, value: null },
      ...getPermissionModuleOptions(permissions).map((module) => ({
        label:
          roleCopy.permissions.modules[
            module as keyof typeof roleCopy.permissions.modules
          ] ?? module,
        value: module,
      })),
    ],
    [formCopy.noneOption, permissions, roleCopy.permissions.modules],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>
            {isEdit ? formCopy.editTitle : formCopy.createTitle}
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {isEdit ? formCopy.editDescription : formCopy.createDescription}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="px-6 py-8 text-sm text-slate-500">{formCopy.loading}</div>
        ) : (
          <form id={formId} onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
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
              <Select
                items={parentMenuItems}
                value={form.parentId || null}
                onValueChange={(value) => updateField("parentId", value ?? "")}
                disabled={optionsLoading}
              >
                <SelectTrigger id="menu-parent-id" className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {parentMenuItems.map((item) => (
                      <SelectItem key={item.value ?? "none"} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <div className="space-y-2">
                <Label htmlFor="menu-permission-module">{formCopy.permissionModule}</Label>
                <Select
                  items={permissionModuleItems}
                  value={permissionModule || null}
                  onValueChange={(value) => updatePermissionModule(value ?? "")}
                  disabled={optionsLoading}
                >
                  <SelectTrigger id="menu-permission-module" className={selectTriggerClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {permissionModuleItems.map((item) => (
                        <SelectItem key={item.value ?? "none"} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <MenuPermissionPicker
                module={permissionModule || null}
                permissions={permissions}
                selectedIds={form.permissionIds}
                onChange={(permissionIds) => updateField("permissionIds", permissionIds)}
                disabled={optionsLoading || submitting || loading}
                moduleLabels={roleCopy.permissions.modules}
                actionLabels={roleCopy.permissions.actions}
                helpText={formCopy.permissionsHelp}
                emptyModuleText={formCopy.permissionsModuleHelp}
              />
            </div>

            <Card className={cn(adminCardClass, "gap-0 py-0 shadow-none ring-0")}>
              <CardHeader className="flex-row items-center gap-4 px-4 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className={cn("text-sm font-semibold", adminHeadingClass)}>
                    {formCopy.isActiveTitle}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-slate-500">
                    {form.isActive ? formCopy.isActiveOn : formCopy.isActiveOff}
                  </CardDescription>
                </div>
                <CardAction className="row-span-1 self-center">
                  <Switch
                    id="menu-is-active"
                    checked={form.isActive}
                    onCheckedChange={(checked) => updateField("isActive", checked)}
                    disabled={submitting || loading}
                    aria-label={formCopy.isActive}
                  />
                </CardAction>
              </CardHeader>
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs leading-relaxed text-slate-500">{formCopy.isActiveDescription}</p>
              </div>
            </Card>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
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

            <div className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
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

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
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
