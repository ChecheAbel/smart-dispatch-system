"use client";

import { useCallback, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Shield, ShieldCheck, Trash2 } from "lucide-react";
import type { Role } from "@smart-dispatch/types";
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
import { formatMessage, getAdminRolesMessages, type AdminRolesMessages } from "@/translations";
import { deleteRole, fetchRoles } from "@/lib/role-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { adminBadgeGoldClass, adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { CreateRoleSheet } from "./create-role-sheet";
import { RolePermissionsSheet } from "./role-permissions-sheet";
import { RoleStats } from "./role-stats";

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function RoleRowActions({
  role,
  labels,
  onEdit,
  onPermissions,
  onDelete,
  canEdit,
  canDelete,
}: {
  role: Role;
  labels: AdminRolesMessages["actions"];
  onEdit: (role: Role) => void;
  onPermissions: (role: Role) => void;
  onDelete: (role: Role) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: role.name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(role)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem onClick={() => onPermissions(role)}>
              <ShieldCheck />
              {labels.permissions}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(role)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RolesPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminRolesMessages(locale);
  const canWrite = hasPermission(PERMISSIONS.roles.write);
  const canDelete = hasPermission(PERMISSIONS.roles.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingRoleId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((role: Role) => {
    setSheetMode("edit");
    setEditingRoleId(role.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((role: Role) => {
    setDeletingRole(role);
    setDeleteOpen(true);
  }, []);

  const openPermissionsSheet = useCallback((role: Role) => {
    setPermissionsRole(role);
    setPermissionsOpen(true);
  }, []);

  const roleColumns = useMemo<DataTableColumn<Role>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: `font-medium ${adminHeadingClass}`,
        cell: (role) => role.name,
      },
      {
        id: "description",
        header: copy.columns.description,
        cellClassName: "text-slate-500",
        cell: (role) => role.description || "—",
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500",
        cell: (role) => formatDate(role.created_at, locale),
      },
    ],
    [copy, locale],
  );

  const loadRoles = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchRoles({
        page,
        limit,
        search: search || undefined,
        locale,
      }),
    [locale],
  );

  const renderRowActions = useCallback(
    (role: Role, _context: DataTableRowContext<Role>) => (
      <RoleRowActions
        role={role}
        labels={copy.actions}
        onEdit={openEditSheet}
        onPermissions={openPermissionsSheet}
        onDelete={openDeleteModal}
        canEdit={canWrite}
        canDelete={canDelete}
      />
    ),
    [copy.actions, openEditSheet, openPermissionsSheet, openDeleteModal, canWrite, canDelete],
  );

  return (
    <div className="space-y-6">
      <RoleStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={roleColumns}
        fetchData={loadRoles}
        getRowKey={(role) => role.id}
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
              {copy.newRole}
            </Button>
          ) : undefined
        }
        minTableWidth="720px"
        emptyIcon={Shield}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateRoleSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          roleId={editingRoleId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canWrite ? (
        <RolePermissionsSheet
          open={permissionsOpen}
          onOpenChange={setPermissionsOpen}
          role={permissionsRole}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={deletingRole?.name}
        onConfirm={async () => {
          if (!deletingRole) {
            return;
          }

          try {
            await deleteRole(deletingRole.id);
            showSuccessToast({
              title: copy.toast.deleteSuccess.title,
              description: formatMessage(copy.toast.deleteSuccess.description, {
                name: deletingRole.name,
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
