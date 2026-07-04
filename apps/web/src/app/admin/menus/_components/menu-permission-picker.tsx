"use client";

import { useMemo } from "react";
import { LayoutList, Menu, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@smart-dispatch/types";
import { groupPermissionsByModule } from "@/lib/permission-groups";
import { adminCardClass, adminHeadingClass, adminIconBoxClass } from "@/lib/admin-theme";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, LucideIcon> = {
  users: Users,
  roles: Shield,
  menus: Menu,
};

type MenuPermissionPickerProps = {
  module: string | null;
  permissions: Permission[];
  selectedIds: string[];
  onChange: (permissionIds: string[]) => void;
  disabled?: boolean;
  moduleLabels: Record<string, string>;
  actionLabels: Record<string, string>;
  helpText?: string;
  emptyModuleText?: string;
};

function getModuleLabel(module: string, labels: Record<string, string>) {
  return labels[module] ?? module.charAt(0).toUpperCase() + module.slice(1);
}

function getActionLabel(action: string, labels: Record<string, string>) {
  return labels[action] ?? action;
}

export function MenuPermissionPicker({
  module,
  permissions,
  selectedIds,
  onChange,
  disabled = false,
  moduleLabels,
  actionLabels,
  helpText,
  emptyModuleText,
}: MenuPermissionPickerProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const modulePermissions = useMemo(() => {
    if (!module) {
      return [];
    }

    return (
      groupPermissionsByModule(permissions).find((group) => group.module === module)?.permissions ??
      []
    );
  }, [module, permissions]);

  function togglePermission(permissionId: string, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) {
      next.add(permissionId);
    } else {
      next.delete(permissionId);
    }
    onChange([...next]);
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      onChange([]);
      return;
    }

    onChange(modulePermissions.map((permission) => permission.id));
  }

  if (!module) {
    return emptyModuleText ? (
      <p className="rounded-lg border border-dashed border-slate-200 bg-[#f8fafb]/60 px-4 py-4 text-sm leading-relaxed text-slate-500">
        {emptyModuleText}
      </p>
    ) : null;
  }

  if (!modulePermissions.length) {
    return null;
  }

  const Icon = MODULE_ICONS[module] ?? LayoutList;
  const moduleLabel = getModuleLabel(module, moduleLabels);
  const selectedCount = modulePermissions.filter((permission) =>
    selectedSet.has(permission.id),
  ).length;
  const allSelected = selectedCount === modulePermissions.length;

  return (
    <div className="space-y-3">
      {helpText ? <p className="text-sm leading-relaxed text-slate-500">{helpText}</p> : null}

      <div className={cn(adminCardClass, "overflow-hidden rounded-lg shadow-none ring-0")}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          <div className={adminIconBoxClass}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", adminHeadingClass)}>{moduleLabel}</p>
            <p className="text-xs text-slate-500">
              {selectedCount}/{modulePermissions.length} selected
            </p>
          </div>
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => toggleAll(checked === true)}
            disabled={disabled}
            aria-label={`Select all ${moduleLabel} actions`}
          />
        </div>

        <div className="divide-y divide-slate-100">
          {modulePermissions.map((permission) => {
            const checked = selectedSet.has(permission.id);
            const actionLabel = getActionLabel(permission.action, actionLabels);

            return (
              <div
                key={permission.id}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 transition-colors",
                  checked && "bg-[#1C3A34]/[0.03]",
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-[#1C3A34]">{actionLabel}</p>
                  {permission.description ? (
                    <p className="text-xs leading-relaxed text-slate-500">
                      {permission.description}
                    </p>
                  ) : null}
                </div>
                <Switch
                  className="shrink-0"
                  checked={checked}
                  onCheckedChange={(value) => togglePermission(permission.id, value)}
                  disabled={disabled}
                  aria-label={`${moduleLabel} ${actionLabel}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getPermissionModuleOptions(permissions: Permission[]) {
  return groupPermissionsByModule(permissions).map((group) => group.module);
}

export function inferPermissionModule(
  permissionIds: string[],
  permissions: Permission[],
): string {
  if (!permissionIds.length) {
    return "";
  }

  const linked = permissions.filter((permission) => permissionIds.includes(permission.id));
  if (!linked.length) {
    return "";
  }

  const modules = new Set(linked.map((permission) => permission.module));
  return modules.size === 1 ? linked[0]!.module : "";
}
