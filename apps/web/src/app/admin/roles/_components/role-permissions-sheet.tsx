"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, LayoutList, Menu, ScrollText, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission, Role } from "@smart-dispatch/types";
import { fetchPermissions } from "@/lib/permission-api";
import { groupPermissionsByModule } from "@/lib/permission-groups";
import { fetchRolePermissions, setRolePermissions } from "@/lib/role-api";
import {
  filterAdminAssignablePermissions,
  isAdminAssignablePermission,
} from "@/lib/permissions";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminRolesMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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

type RolePermissionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  readOnly?: boolean;
  onSuccess?: () => void;
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  users: Users,
  roles: Shield,
  menus: Menu,
  notifications: Bell,
  audit_logs: ScrollText,
};

function getModuleLabel(module: string, labels: Record<string, string>) {
  return labels[module] ?? module.charAt(0).toUpperCase() + module.slice(1);
}

function getActionLabel(action: string, labels: Record<string, string>) {
  return labels[action] ?? action;
}

function PermissionsSkeleton() {
  return (
    <div className="space-y-4 px-4">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-9 w-48 rounded-lg" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-44 w-full rounded-lg" />
      ))}
    </div>
  );
}

type ModulePermissionCardProps = {
  module: string;
  permissions: Permission[];
  selectedIds: Set<string>;
  moduleLabels: Record<string, string>;
  actionLabels: Record<string, string>;
  moduleSelectedLabel: string;
  disabled: boolean;
  onTogglePermission: (permissionId: string, checked: boolean) => void;
  onToggleModule: (permissions: Permission[], checked: boolean) => void;
};

function ModulePermissionCard({
  module,
  permissions,
  selectedIds,
  moduleLabels,
  actionLabels,
  moduleSelectedLabel,
  disabled,
  onTogglePermission,
  onToggleModule,
}: ModulePermissionCardProps) {
  const Icon = MODULE_ICONS[module] ?? LayoutList;
  const moduleLabel = getModuleLabel(module, moduleLabels);
  const selectedCount = permissions.filter((permission) => selectedIds.has(permission.id)).length;
  const allSelected = selectedCount === permissions.length;

  return (
    <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
      <CardHeader className="gap-3 border-b border-slate-100 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className={cn("text-sm font-semibold", adminHeadingClass)}>
              {moduleLabel}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {formatMessage(moduleSelectedLabel, {
                selected: String(selectedCount),
                total: String(permissions.length),
              })}
            </CardDescription>
          </div>
          <CardAction className="row-span-1 self-center">
            <Switch
              checked={allSelected}
              onCheckedChange={(checked) => onToggleModule(permissions, checked)}
              disabled={disabled}
              aria-label={moduleLabel}
            />
          </CardAction>
        </div>
      </CardHeader>

      <div className="divide-y divide-slate-100">
        {permissions.map((permission) => {
          const checked = selectedIds.has(permission.id);

          return (
            <div
              key={permission.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors",
                checked && "bg-[#1C3A34]/[0.03]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words text-[#1C3A34]">
                  {getActionLabel(permission.action, actionLabels)}
                </p>
                {permission.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed break-words text-slate-500">
                    {permission.description}
                  </p>
                ) : null}
              </div>
              <Switch
                className="shrink-0"
                checked={checked}
                onCheckedChange={(value) => onTogglePermission(permission.id, value)}
                disabled={disabled}
                aria-label={`${moduleLabel} ${getActionLabel(permission.action, actionLabels)}`}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function RolePermissionsSheet({
  open,
  onOpenChange,
  role,
  readOnly = false,
  onSuccess,
}: RolePermissionsSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminRolesMessages(locale);
  const permissionsCopy = copy.permissions;

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignablePermissions = useMemo(
    () => filterAdminAssignablePermissions(allPermissions),
    [allPermissions],
  );

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(assignablePermissions),
    [assignablePermissions],
  );

  const assignablePermissionIds = useMemo(
    () => new Set(assignablePermissions.map((permission) => permission.id)),
    [assignablePermissions],
  );

  const selectedCount = useMemo(
    () => assignablePermissions.filter((permission) => selectedIds.has(permission.id)).length,
    [assignablePermissions, selectedIds],
  );
  const totalCount = assignablePermissions.length;

  useEffect(() => {
    if (!open || !role) {
      setAllPermissions([]);
      setSelectedIds(new Set());
      setError(null);
      setLoading(false);
      setSubmitting(false);
      return;
    }

    const roleId = role.id;
    let cancelled = false;

    async function loadPermissions() {
      setLoading(true);
      setError(null);

      try {
        const [permissionsResult, rolePermissions] = await Promise.all([
          fetchPermissions({ page: 1, limit: 100 }),
          fetchRolePermissions(roleId),
        ]);

        if (!cancelled) {
          setAllPermissions(permissionsResult.data);
          setSelectedIds(
            new Set(
              rolePermissions
                .filter(isAdminAssignablePermission)
                .map((permission) => permission.id),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : permissionsCopy.errors.loadFailed;
          setError(message);
          showErrorToast({
            title: permissionsCopy.toast.loadFailed.title,
            description: message,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [open, role, permissionsCopy.errors.loadFailed, permissionsCopy.toast.loadFailed.title]);

  function togglePermission(permissionId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
    setError(null);
  }

  function toggleModule(groupPermissions: Permission[], checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const permission of groupPermissions) {
        if (checked) {
          next.add(permission.id);
        } else {
          next.delete(permission.id);
        }
      }
      return next;
    });
    setError(null);
  }

  function selectAll() {
    setSelectedIds(new Set(assignablePermissions.map((permission) => permission.id)));
    setError(null);
  }

  function clearAll() {
    setSelectedIds(new Set());
    setError(null);
  }

  async function handleSave() {
    if (!role || readOnly) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await setRolePermissions(
        role.id,
        [...selectedIds].filter((permissionId) => assignablePermissionIds.has(permissionId)),
      );
      showSuccessToast(permissionsCopy.toast.updateSuccess);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : permissionsCopy.toast.updateFailed.description;
      setError(message);
      showErrorToast({
        title: permissionsCopy.toast.updateFailed.title,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>
            {readOnly ? permissionsCopy.readOnlyTitle : permissionsCopy.title}
          </SheetTitle>
          <SheetDescription className="leading-relaxed break-words">
            {readOnly
              ? permissionsCopy.readOnlyDescription
              : role
                ? formatMessage(permissionsCopy.description, { name: role.name })
                : permissionsCopy.descriptionFallback}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 py-4">
            <PermissionsSkeleton />
          </div>
        ) : (
          <div className="flex-1 space-y-5 px-6 py-5">
            {role ? (
              <div className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-[#f8fafb]/80 px-4 py-3">
                <div className={adminIconBoxClass}>
                  <Shield className="size-4" />
                </div>
                <div className="min-w-0 flex-1 basis-48">
                  <p className={cn("text-sm font-semibold break-words", adminHeadingClass)}>
                    {role.name}
                  </p>
                  <p className="text-xs break-all text-slate-500">{role.slug}</p>
                </div>
                <Badge className={cn(adminBadgeGoldClass, "h-auto shrink-0 whitespace-normal py-1")}>
                  {formatMessage(permissionsCopy.selectedSummary, {
                    selected: String(selectedCount),
                    total: String(totalCount),
                  })}
                </Badge>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              {!readOnly ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    disabled={submitting || selectedCount === totalCount}
                    className="border-slate-200"
                  >
                    {permissionsCopy.selectAll}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    disabled={submitting || selectedCount === 0}
                    className="border-slate-200"
                  >
                    {permissionsCopy.clearAll}
                  </Button>
                </>
              ) : null}
            </div>

            {!readOnly ? <Separator className="bg-slate-100" /> : null}

            <div className="space-y-4">
              {permissionGroups.map((group) => (
                <ModulePermissionCard
                  key={group.module}
                  module={group.module}
                  permissions={group.permissions}
                  selectedIds={selectedIds}
                  moduleLabels={permissionsCopy.modules}
                  actionLabels={permissionsCopy.actions}
                  moduleSelectedLabel={permissionsCopy.moduleSelected}
                  disabled={submitting || readOnly}
                  onTogglePermission={togglePermission}
                  onToggleModule={toggleModule}
                />
              ))}
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        )}

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || loading}
            className="border-slate-200"
          >
            {readOnly ? permissionsCopy.close : permissionsCopy.cancel}
          </Button>
          {!readOnly ? (
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={submitting || loading || !role}
              className={adminPrimaryButtonClass}
            >
              {submitting ? permissionsCopy.saving : permissionsCopy.save}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
