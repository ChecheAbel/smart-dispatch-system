"use client";

import { useCallback, useMemo, useState } from "react";
import { Menu, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Menu as MenuRecord } from "@smart-dispatch/types";
import { useLocale, useAuth, useNavigation } from "@/components/shared/providers";
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
import { formatMessage, getAdminMenusMessages, type AdminMenusMessages } from "@/translations";
import { deleteMenu } from "@/lib/menu-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateMenuSheet } from "./create-menu-sheet";
import { MenuStats } from "./menu-stats";
import { MenuTreeTable } from "./menu-tree-table";

function MenuRowActions({
  menu,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  menu: MenuRecord;
  labels: AdminMenusMessages["actions"];
  onEdit: (menu: MenuRecord) => void;
  onDelete: (menu: MenuRecord) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: menu.label })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(menu)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(menu)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MenusPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const { refreshMenus } = useNavigation();
  const copy = getAdminMenusMessages(locale);
  const canRead = hasPermission(PERMISSIONS.menus.read);
  const canWrite = hasPermission(PERMISSIONS.menus.write);
  const canDelete = hasPermission(PERMISSIONS.menus.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMenu, setDeletingMenu] = useState<MenuRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setRefreshKey((current) => current + 1);
    void refreshMenus();
  }, [refreshMenus]);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingMenuId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((menu: MenuRecord) => {
    setSheetMode("edit");
    setEditingMenuId(menu.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((menu: MenuRecord) => {
    setDeletingMenu(menu);
    setDeleteOpen(true);
  }, []);

  const menuColumns = useMemo(
    () => [
      {
        id: "path",
        header: copy.columns.path,
        cellClassName: "text-slate-500",
        cell: (menu: MenuRecord) => menu.path || "—",
      },
      {
        id: "sort_order",
        header: copy.columns.sortOrder,
        cellClassName: "text-slate-500 tabular-nums",
        cell: (menu: MenuRecord) => menu.sort_order,
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (menu: MenuRecord) =>
          menu.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline">{copy.status.inactive}</Badge>
          ),
      },
    ],
    [copy],
  );

  const renderRowActions = useCallback(
    (menu: MenuRecord) => (
      <MenuRowActions
        menu={menu}
        labels={copy.actions}
        onEdit={openEditSheet}
        onDelete={openDeleteModal}
        canEdit={canWrite}
        canDelete={canDelete}
      />
    ),
    [copy.actions, openEditSheet, openDeleteModal, canWrite, canDelete],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <MenuStats locale={locale} refreshKey={refreshKey} />

      <MenuTreeTable
        key={locale}
        locale={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        labelHeader={copy.columns.label}
        columns={menuColumns}
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
              {copy.newMenu}
            </Button>
          ) : undefined
        }
        emptyIcon={Menu}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateMenuSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          menuId={editingMenuId}
          onSuccess={handleSuccess}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingMenu?.label}
          onConfirm={async () => {
            if (!deletingMenu) {
              return;
            }

            try {
              await deleteMenu(deletingMenu.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingMenu.label,
                }),
              });
              handleSuccess();
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
