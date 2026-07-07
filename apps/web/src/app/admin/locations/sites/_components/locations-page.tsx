"use client";

import { useCallback, useMemo, useState } from "react";
import { Map, MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Location } from "@smart-dispatch/types";
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
  getAdminLocationsMessages,
  type AdminLocationsMessages,
} from "@/translations";
import { deleteLocation, fetchLocations } from "@/lib/location-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CreateLocationSheet } from "./create-location-sheet";
import { LocationStats } from "./location-stats";
import { LocationsMapDialog } from "./locations-map-dialog";

function LocationRowActions({
  location,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  location: Location;
  labels: AdminLocationsMessages["actions"];
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: location.name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(location)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(location)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type UsageFilter = "all" | "pickup" | "dropoff" | "both";

function locationUsageLabel(location: Location, copy: AdminLocationsMessages["usage"]) {
  if (location.can_pickup && location.can_dropoff) {
    return copy.both;
  }

  if (location.can_pickup) {
    return copy.pickup;
  }

  if (location.can_dropoff) {
    return copy.dropoff;
  }

  return copy.none;
}

function locationUsageBadgeClass(location: Location) {
  if (location.can_pickup && location.can_dropoff) {
    return "border-[#C9B87A]/30 bg-[#C9B87A]/10 text-[#8f7d45]";
  }

  if (location.can_pickup) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (location.can_dropoff) {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function LocationsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminLocationsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.locations.read);
  const canWrite = hasPermission(PERMISSIONS.locations.write);
  const canDelete = hasPermission(PERMISSIONS.locations.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingLocationId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((location: Location) => {
    setSheetMode("edit");
    setEditingLocationId(location.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((location: Location) => {
    setDeletingLocation(location);
    setDeleteOpen(true);
  }, []);

  const locationColumns = useMemo<DataTableColumn<Location>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "text-slate-700",
        cell: (location) => location.name,
      },
      {
        id: "region",
        header: copy.columns.region,
        cellClassName: "text-slate-600",
        cell: (location) => location.region?.name ?? "—",
      },
      {
        id: "address",
        header: copy.columns.address,
        cellClassName: "text-slate-500",
        cell: (location) => location.address ?? "—",
      },
      {
        id: "usage",
        header: copy.columns.usage,
        cell: (location) => (
          <Badge className={cn("text-xs", locationUsageBadgeClass(location))}>
            {locationUsageLabel(location, copy.usage)}
          </Badge>
        ),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (location) =>
          location.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline">{copy.status.inactive}</Badge>
          ),
      },
    ],
    [copy],
  );

  const loadLocations = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchLocations({
        page,
        limit,
        search: search || undefined,
        locale,
        ...(usageFilter === "pickup" ? { can_pickup: true } : {}),
        ...(usageFilter === "dropoff" ? { can_dropoff: true } : {}),
        ...(usageFilter === "both" ? { can_pickup: true, can_dropoff: true } : {}),
      }),
    [locale, usageFilter],
  );

  const renderRowActions = useCallback(
    (location: Location, _context: DataTableRowContext<Location>) => {
      if (!canWrite && !canDelete) {
        return null;
      }

      return (
        <LocationRowActions
          location={location}
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
      <LocationStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={`${locale}-${usageFilter}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={locationColumns}
        fetchData={loadLocations}
        getRowKey={(location) => location.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        filterBar={
          <div className="grid gap-3 sm:max-w-xs">
            <Label htmlFor="location-usage-filter" className="text-sm font-medium text-slate-600">
              {copy.filters.usage}
            </Label>
            <Select
              items={[
                { label: copy.filters.usageAll, value: "all" },
                { label: copy.filters.usagePickup, value: "pickup" },
                { label: copy.filters.usageDropoff, value: "dropoff" },
                { label: copy.filters.usageBoth, value: "both" },
              ]}
              value={usageFilter}
              onValueChange={(value) => setUsageFilter((value as UsageFilter | null) ?? "all")}
            >
              <SelectTrigger id="location-usage-filter" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{copy.filters.usageAll}</SelectItem>
                  <SelectItem value="pickup">{copy.filters.usagePickup}</SelectItem>
                  <SelectItem value="dropoff">{copy.filters.usageDropoff}</SelectItem>
                  <SelectItem value="both">{copy.filters.usageBoth}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
        toolbarActions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMapOpen(true)}
              className="border-slate-200 bg-white text-[#1C3A34] hover:bg-[#f8fafb]"
            >
              <Map className="size-4" />
              {copy.mapView.button}
            </Button>
            {canWrite ? (
              <Button type="button" onClick={openCreateSheet} className={adminPrimaryButtonClass}>
                <Plus className="size-4" />
                {copy.newLocation}
              </Button>
            ) : null}
          </>
        }
        minTableWidth="720px"
        emptyIcon={MapPin}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      <LocationsMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        locale={locale}
        refreshKey={refreshKey}
      />

      {canWrite ? (
        <CreateLocationSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          locationId={editingLocationId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingLocation?.name}
          onConfirm={async () => {
            if (!deletingLocation) {
              return;
            }

            try {
              await deleteLocation(deletingLocation.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingLocation.name,
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
