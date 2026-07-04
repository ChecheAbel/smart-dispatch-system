"use client";

import { useCallback, useMemo, useState } from "react";
import { Map, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Region } from "@smart-dispatch/types";
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
  getAdminRegionsMessages,
  type AdminRegionsMessages,
} from "@/translations";
import { deleteRegion, fetchRegions } from "@/lib/region-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateRegionSheet } from "./create-region-sheet";
import { RegionStats } from "./region-stats";

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function RegionRowActions({
  region,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  region: Region;
  labels: AdminRegionsMessages["actions"];
  onEdit: (region: Region) => void;
  onDelete: (region: Region) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: region.name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(region)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(region)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RegionsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminRegionsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.regions.read);
  const canWrite = hasPermission(PERMISSIONS.regions.write);
  const canDelete = hasPermission(PERMISSIONS.regions.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRegion, setDeletingRegion] = useState<Region | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingRegionId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((region: Region) => {
    setSheetMode("edit");
    setEditingRegionId(region.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((region: Region) => {
    setDeletingRegion(region);
    setDeleteOpen(true);
  }, []);

  const regionColumns = useMemo<DataTableColumn<Region>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "text-slate-700",
        cell: (region) => region.name,
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (region) =>
          region.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline">{copy.status.inactive}</Badge>
          ),
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500",
        cell: (region) => formatDate(region.created_at, locale),
      },
    ],
    [copy, locale],
  );

  const loadRegions = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchRegions({
        page,
        limit,
        search: search || undefined,
        locale,
      }),
    [locale],
  );

  const renderRowActions = useCallback(
    (region: Region, _context: DataTableRowContext<Region>) => {
      if (!canWrite && !canDelete) {
        return null;
      }

      return (
        <RegionRowActions
          region={region}
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
      <RegionStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={regionColumns}
        fetchData={loadRegions}
        getRowKey={(region) => region.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button type="button" onClick={openCreateSheet} className={adminPrimaryButtonClass}>
              <Plus className="size-4" />
              {copy.newRegion}
            </Button>
          ) : undefined
        }
        minTableWidth="720px"
        emptyIcon={Map}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateRegionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          regionId={editingRegionId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingRegion?.name}
          onConfirm={async () => {
            if (!deletingRegion) {
              return;
            }

            try {
              await deleteRegion(deletingRegion.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingRegion.name,
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
