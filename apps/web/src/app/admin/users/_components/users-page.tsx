"use client";

import { useCallback, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { AccountActivation, AccountStatus, User } from "@smart-dispatch/types";
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
import { formatMessage, getAdminUsersMessages, type AdminUsersMessages } from "@/translations";
import { deleteUser, fetchUsers } from "@/lib/user-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateUserSheet } from "./create-user-sheet";
import { UserStats } from "./user-stats";
import { cn } from "@/lib/utils";

function formatUserName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

function statusBadgeClass(status: AccountStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "suspended":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "deactivated":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "";
  }
}

function activationBadgeClass(activation: AccountActivation) {
  return activation === "activated"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-sky-200 bg-sky-50 text-sky-800";
}

function UserRowActions({
  user,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  user: User;
  labels: AdminUsersMessages["actions"];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const name = formatUserName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(labels.menuLabel, { name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(user)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UsersPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminUsersMessages(locale);
  const canRead = hasPermission(PERMISSIONS.users.read);
  const canWrite = hasPermission(PERMISSIONS.users.write);
  const canDelete = hasPermission(PERMISSIONS.users.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingUserId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((user: User) => {
    setSheetMode("edit");
    setEditingUserId(user.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((user: User) => {
    setDeletingUser(user);
    setDeleteOpen(true);
  }, []);

  const userColumns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: `font-medium ${adminHeadingClass}`,
        cell: (user) => formatUserName(user),
      },
      {
        id: "email",
        header: copy.columns.email,
        cellClassName: "text-slate-500",
        cell: (user) => user.email,
      },
      {
        id: "mobile",
        header: copy.columns.mobile,
        cellClassName: "text-slate-500",
        cell: (user) => user.mobile_number,
      },
      {
        id: "roles",
        header: copy.columns.roles,
        cell: (user) =>
          user.roles.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role} variant="outline" className="text-xs capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (user) => (
          <Badge variant="outline" className={cn("text-xs", statusBadgeClass(user.account_status))}>
            {copy.status[user.account_status]}
          </Badge>
        ),
      },
      {
        id: "activation",
        header: copy.columns.activation,
        cell: (user) => (
          <Badge variant="outline" className={cn("text-xs", activationBadgeClass(user.account_activation))}>
            {copy.activation[user.account_activation]}
          </Badge>
        ),
      },
    ],
    [copy],
  );

  const loadUsers = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchUsers({
        page,
        limit,
        search: search || undefined,
      }),
    [],
  );

  const renderRowActions = useCallback(
    (user: User, _context: DataTableRowContext<User>) => (
      <UserRowActions
        user={user}
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
      <UserStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={userColumns}
        fetchData={loadUsers}
        getRowKey={(user) => user.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button type="button" onClick={openCreateSheet} className={adminPrimaryButtonClass}>
              <Plus className="size-4" />
              {copy.newUser}
            </Button>
          ) : undefined
        }
        minTableWidth="960px"
        emptyIcon={Users}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateUserSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          userId={editingUserId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingUser ? formatUserName(deletingUser) : undefined}
          onConfirm={async () => {
            if (!deletingUser) {
              return;
            }

            try {
              await deleteUser(deletingUser.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: formatUserName(deletingUser),
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
