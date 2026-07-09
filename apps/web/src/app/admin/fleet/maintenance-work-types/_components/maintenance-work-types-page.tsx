"use client";

import { useCallback, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import type { MaintenanceWorkType } from "@smart-dispatch/types";
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
  getAdminMaintenanceWorkTypesMessages,
  type AdminMaintenanceWorkTypesMessages,
} from "@/translations";
import {
  deleteMaintenanceWorkType,
  fetchMaintenanceWorkTypes,
} from "@/lib/maintenance-work-type-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateMaintenanceWorkTypeSheet } from "./create-maintenance-work-type-sheet";
import { MaintenanceWorkTypeStats } from "./maintenance-work-type-stats";

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MaintenanceWorkTypeRowActions({
  workType,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  workType: MaintenanceWorkType;
  labels: AdminMaintenanceWorkTypesMessages["actions"];
  onEdit: (workType: MaintenanceWorkType) => void;
  onDelete: (workType: MaintenanceWorkType) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: workType.name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(workType)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(workType)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MaintenanceWorkTypesPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminMaintenanceWorkTypesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.maintenance_work_types.read);
  const canWrite = hasPermission(PERMISSIONS.maintenance_work_types.write);
  const canDelete = hasPermission(PERMISSIONS.maintenance_work_types.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingWorkTypeId, setEditingWorkTypeId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingWorkType, setDeletingWorkType] = useState<MaintenanceWorkType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingWorkTypeId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((workType: MaintenanceWorkType) => {
    setSheetMode("edit");
    setEditingWorkTypeId(workType.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((workType: MaintenanceWorkType) => {
    setDeletingWorkType(workType);
    setDeleteOpen(true);
  }, []);

  const workTypeColumns = useMemo<DataTableColumn<MaintenanceWorkType>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "text-slate-700",
        cell: (workType) => workType.name,
      },
      {
        id: "sort_order",
        header: copy.columns.sortOrder,
        cellClassName: "text-slate-500 tabular-nums",
        cell: (workType) => workType.sort_order,
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (workType) =>
          workType.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline">{copy.status.inactive}</Badge>
          ),
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500",
        cell: (workType) => formatDate(workType.created_at, locale),
      },
    ],
    [copy, locale],
  );

  const loadWorkTypes = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchMaintenanceWorkTypes({
        page,
        limit,
        search: search || undefined,
        locale,
      }),
    [locale],
  );

  const renderRowActions = useCallback(
    (workType: MaintenanceWorkType, _context: DataTableRowContext<MaintenanceWorkType>) => {
      if (!canWrite && !canDelete) {
        return null;
      }

      return (
        <MaintenanceWorkTypeRowActions
          workType={workType}
          labels={copy.actions}
          onEdit={openEditSheet}
          onDelete={openDeleteModal}
          canEdit={canWrite}
          canDelete={canDelete}
        />
      );
    },
    [copy.actions, openEditSheet, openDeleteModal, canWrite, canDelete],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <MaintenanceWorkTypeStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={workTypeColumns}
        fetchData={loadWorkTypes}
        getRowKey={(workType) => workType.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button type="button" onClick={openCreateSheet} className={adminPrimaryButtonClass}>
              <Plus className="size-4" />
              {copy.newType}
            </Button>
          ) : undefined
        }
        minTableWidth="880px"
        emptyIcon={Wrench}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateMaintenanceWorkTypeSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          workTypeId={editingWorkTypeId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingWorkType?.name}
          onConfirm={async () => {
            if (!deletingWorkType) {
              return;
            }

            try {
              await deleteMaintenanceWorkType(deletingWorkType.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingWorkType.name,
                }),
              });
              setRefreshKey((current) => current + 1);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : copy.toast.deleteFailed.description;
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
