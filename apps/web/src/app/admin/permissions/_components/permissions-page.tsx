"use client";

import { useCallback, useMemo, useState } from "react";
import { Key, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Permission } from "@smart-dispatch/types";
import { useLocale, useAuth } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatMessage,
  getAdminPermissionsMessages,
  type AdminPermissionsMessages,
} from "@/translations";
import { deletePermission, fetchPermissions } from "@/lib/permission-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { adminBadgeGoldClass, adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { CreatePermissionSheet } from "./create-permission-sheet";
import { PermissionStats } from "./permission-stats";

function PermissionRowActions({
  permission,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  permission: Permission;
  labels: AdminPermissionsMessages["actions"];
  onEdit: (permission: Permission) => void;
  onDelete: (permission: Permission) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(labels.menuLabel, { name: permission.slug })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(permission)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(permission)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PermissionsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminPermissionsMessages(locale);
  const canWrite = hasPermission(PERMISSIONS.permissions.write);
  const canDelete = hasPermission(PERMISSIONS.permissions.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPermission, setDeletingPermission] = useState<Permission | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingPermissionId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((permission: Permission) => {
    setSheetMode("edit");
    setEditingPermissionId(permission.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((permission: Permission) => {
    setDeletingPermission(permission);
    setDeleteOpen(true);
  }, []);

  const permissionColumns = useMemo<DataTableColumn<Permission>[]>(
    () => [
      {
        id: "slug",
        header: copy.columns.slug,
        cellClassName: `font-medium ${adminHeadingClass}`,
        cell: (permission) => permission.slug,
      },
      {
        id: "module",
        header: copy.columns.module,
        cellClassName: "text-slate-500",
        cell: (permission) => permission.module,
      },
      {
        id: "action",
        header: copy.columns.action,
        cellClassName: "text-slate-500",
        cell: (permission) => permission.action,
      },
      {
        id: "description",
        header: copy.columns.description,
        cellClassName: "text-slate-500",
        cell: (permission) => permission.description || "—",
      },
    ],
    [copy],
  );

  const loadPermissions = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchPermissions({
        page,
        limit,
        search: search || undefined,
      }),
    [],
  );

  const renderRowActions = useCallback(
    (permission: Permission, _context: DataTableRowContext<Permission>) => (
      <PermissionRowActions
        permission={permission}
        labels={copy.actions}
        onEdit={openEditSheet}
        onDelete={openDeleteModal}
        canEdit={canWrite}
        canDelete={canDelete}
      />
    ),
    [copy.actions, openEditSheet, openDeleteModal, canWrite, canDelete],
  );

  return (
    <div className="space-y-6">
      <PermissionStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={permissionColumns}
        fetchData={loadPermissions}
        getRowKey={(permission) => permission.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button
              type="button"
              onClick={openCreateSheet}
              className={adminPrimaryButtonClass}
            >
              <Plus className="size-4" />
              {copy.newPermission}
            </Button>
          ) : undefined
        }
        minTableWidth="800px"
        emptyIcon={Key}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreatePermissionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          permissionId={editingPermissionId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingPermission?.slug}
          onConfirm={async () => {
            if (!deletingPermission) {
              return;
            }

            try {
              await deletePermission(deletingPermission.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingPermission.slug,
                }),
              });
              setRefreshKey((current) => current + 1);
            } catch (err) {
              const message = err instanceof Error ? err.message : copy.toast.deleteFailed.description;
              showErrorToast({
                title: copy.toast.deleteFailed.title,
                description: message,
              });
              throw err;
            }
          }}
        />
      ) : null}
    </div>
  );
}
