"use client";

import { useCallback, useMemo, useState } from "react";
import { Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { VehicleType } from "@smart-dispatch/types";
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
  getAdminVehicleTypesMessages,
  type AdminVehicleTypesMessages,
} from "@/translations";
import { deleteVehicleType, fetchVehicleTypes } from "@/lib/vehicle-type-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateVehicleTypeSheet } from "./create-vehicle-type-sheet";

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function VehicleTypeRowActions({
  vehicleType,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  vehicleType: VehicleType;
  labels: AdminVehicleTypesMessages["actions"];
  onEdit: (vehicleType: VehicleType) => void;
  onDelete: (vehicleType: VehicleType) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: vehicleType.name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(vehicleType)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(vehicleType)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VehicleTypesPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminVehicleTypesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.vehicle_types.read);
  const canWrite = hasPermission(PERMISSIONS.vehicle_types.write);
  const canDelete = hasPermission(PERMISSIONS.vehicle_types.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingVehicleTypeId, setEditingVehicleTypeId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingVehicleType, setDeletingVehicleType] = useState<VehicleType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingVehicleTypeId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((vehicleType: VehicleType) => {
    setSheetMode("edit");
    setEditingVehicleTypeId(vehicleType.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((vehicleType: VehicleType) => {
    setDeletingVehicleType(vehicleType);
    setDeleteOpen(true);
  }, []);

  const vehicleTypeColumns = useMemo<DataTableColumn<VehicleType>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "text-slate-700",
        cell: (vehicleType) => vehicleType.name,
      },
      {
        id: "slug",
        header: copy.columns.slug,
        cellClassName: "font-mono text-sm text-slate-500",
        cell: (vehicleType) => vehicleType.slug,
      },
      {
        id: "capacity",
        header: copy.columns.capacity,
        cellClassName: "text-slate-500 tabular-nums",
        cell: (vehicleType) => vehicleType.passenger_capacity ?? "—",
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (vehicleType) =>
          vehicleType.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline">{copy.status.inactive}</Badge>
          ),
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500",
        cell: (vehicleType) => formatDate(vehicleType.created_at, locale),
      },
    ],
    [copy, locale],
  );

  const loadVehicleTypes = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchVehicleTypes({
        page,
        limit,
        search: search || undefined,
        locale,
      }),
    [locale],
  );

  const renderRowActions = useCallback(
    (vehicleType: VehicleType, _context: DataTableRowContext<VehicleType>) => {
      if (!canWrite && !canDelete) {
        return null;
      }

      return (
        <VehicleTypeRowActions
          vehicleType={vehicleType}
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
      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={vehicleTypeColumns}
        fetchData={loadVehicleTypes}
        getRowKey={(vehicleType) => vehicleType.id}
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
        minTableWidth="800px"
        emptyIcon={Layers}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateVehicleTypeSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          vehicleTypeId={editingVehicleTypeId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingVehicleType?.name}
          onConfirm={async () => {
            if (!deletingVehicleType) {
              return;
            }

            try {
              await deleteVehicleType(deletingVehicleType.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingVehicleType.name,
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
