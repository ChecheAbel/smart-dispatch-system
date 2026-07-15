"use client";

import { useCallback, useMemo, useState } from "react";
import { Award, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { VehicleClass } from "@smart-dispatch/types";
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
  getAdminVehicleClassesMessages,
  type AdminVehicleClassesMessages,
} from "@/translations";
import { deleteVehicleClass, fetchVehicleClasses } from "@/lib/vehicle-class-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateVehicleClassSheet } from "./create-vehicle-class-sheet";
import { VehicleClassStats } from "./vehicle-class-stats";

import { formatGlobalDate } from "@/lib/ethiopian-calendar";

function formatDate(value: string, locale: string) {
  return formatGlobalDate(value, locale);
}

function VehicleClassRowActions({
  vehicleClass,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  vehicleClass: VehicleClass;
  labels: AdminVehicleClassesMessages["actions"];
  onEdit: (vehicleClass: VehicleClass) => void;
  onDelete: (vehicleClass: VehicleClass) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: vehicleClass.name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(vehicleClass)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(vehicleClass)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VehicleClassesPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminVehicleClassesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.vehicle_classes.read);
  const canWrite = hasPermission(PERMISSIONS.vehicle_classes.write);
  const canDelete = hasPermission(PERMISSIONS.vehicle_classes.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingVehicleClassId, setEditingVehicleClassId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingVehicleClass, setDeletingVehicleClass] = useState<VehicleClass | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingVehicleClassId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((vehicleClass: VehicleClass) => {
    setSheetMode("edit");
    setEditingVehicleClassId(vehicleClass.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((vehicleClass: VehicleClass) => {
    setDeletingVehicleClass(vehicleClass);
    setDeleteOpen(true);
  }, []);

  const vehicleClassColumns = useMemo<DataTableColumn<VehicleClass>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "text-slate-700",
        cell: (vehicleClass) => vehicleClass.name,
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (vehicleClass) =>
          vehicleClass.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline">{copy.status.inactive}</Badge>
          ),
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500",
        cell: (vehicleClass) => formatDate(vehicleClass.created_at, locale),
      },
    ],
    [copy, locale],
  );

  const loadVehicleClasses = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchVehicleClasses({
        page,
        limit,
        search: search || undefined,
        locale,
      }),
    [locale],
  );

  const renderRowActions = useCallback(
    (vehicleClass: VehicleClass, _context: DataTableRowContext<VehicleClass>) => {
      if (!canWrite && !canDelete) {
        return null;
      }

      return (
        <VehicleClassRowActions
          vehicleClass={vehicleClass}
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
      <VehicleClassStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={vehicleClassColumns}
        fetchData={loadVehicleClasses}
        getRowKey={(vehicleClass) => vehicleClass.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button type="button" onClick={openCreateSheet} className={adminPrimaryButtonClass}>
              <Plus className="size-4" />
              {copy.newClass}
            </Button>
          ) : undefined
        }
        minTableWidth="720px"
        emptyIcon={Award}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateVehicleClassSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          vehicleClassId={editingVehicleClassId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingVehicleClass?.name}
          onConfirm={async () => {
            if (!deletingVehicleClass) {
              return;
            }

            try {
              await deleteVehicleClass(deletingVehicleClass.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingVehicleClass.name,
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
