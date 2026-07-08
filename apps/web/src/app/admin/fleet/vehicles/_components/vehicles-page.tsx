"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2, Truck, UserRound } from "lucide-react";
import type { Vehicle, VehicleStatus, VehicleType, VehicleClass } from "@smart-dispatch/types";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatMessage,
  getAdminVehiclesMessages,
  type AdminVehiclesMessages,
} from "@/translations";
import { deleteVehicle, fetchVehicles } from "@/lib/vehicle-api";
import { fetchVehicleTypes } from "@/lib/vehicle-type-api";
import { fetchVehicleClasses } from "@/lib/vehicle-class-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminFilterLabelClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateVehicleSheet } from "./create-vehicle-sheet";
import { AssignVehicleDriverSheet } from "./assign-vehicle-driver-sheet";
import { VehicleStats } from "./vehicle-stats";

const VEHICLE_STATUSES: VehicleStatus[] = ["active", "maintenance", "retired"];

function vehicleStatusBadgeClass(status: VehicleStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "maintenance":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "retired":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function VehicleRowActions({
  vehicle,
  labels,
  onEdit,
  onAssignDriver,
  onDelete,
  canEdit,
  canDelete,
}: {
  vehicle: Vehicle;
  labels: AdminVehiclesMessages["actions"];
  onEdit: (vehicle: Vehicle) => void;
  onAssignDriver: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: vehicle.plate_number })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(vehicle)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem onClick={() => onAssignDriver(vehicle)}>
              <UserRound />
              {labels.assignDriver}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(vehicle)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VehiclesPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminVehiclesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.vehicles.write);
  const canDelete = hasPermission(PERMISSIONS.vehicles.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [assignDriverOpen, setAssignDriverOpen] = useState(false);
  const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);

  useEffect(() => {
    if (!canRead) {
      return;
    }

    let cancelled = false;

    async function loadFilterOptions() {
      try {
        const [typesResult, classesResult] = await Promise.all([
          fetchVehicleTypes({ limit: 100, locale }),
          fetchVehicleClasses({ limit: 100, locale }),
        ]);
        if (!cancelled) {
          setVehicleTypes(typesResult.data);
          setVehicleClasses(classesResult.data);
        }
      } catch {
        if (!cancelled) {
          setVehicleTypes([]);
          setVehicleClasses([]);
        }
      }
    }

    void loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, [canRead, locale]);

  function bumpRefresh() {
    setRefreshKey((current) => current + 1);
  }

  function openCreateSheet() {
    setSheetMode("create");
    setEditingVehicleId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((vehicle: Vehicle) => {
    setSheetMode("edit");
    setEditingVehicleId(vehicle.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((vehicle: Vehicle) => {
    setDeletingVehicle(vehicle);
    setDeleteOpen(true);
  }, []);

  const openAssignDriverSheet = useCallback((vehicle: Vehicle) => {
    setAssigningVehicle(vehicle);
    setAssignDriverOpen(true);
  }, []);

  const vehicleColumns = useMemo<DataTableColumn<Vehicle>[]>(
    () => {
      const empty = copy.columnEmpty;

      function emptyCellLabel(text: string) {
        return <span className="text-sm text-slate-400 italic">{text}</span>;
      }

      return [
      {
        id: "plate",
        header: copy.columns.plate,
        cellClassName: "text-slate-700",
        cell: (vehicle) => vehicle.plate_number,
      },
      {
        id: "chassis",
        header: copy.columns.chassis,
        cellClassName: "font-mono text-xs text-slate-600 tracking-wide",
        cell: (vehicle) =>
          vehicle.chassis_number
            ? vehicle.chassis_number
            : emptyCellLabel(empty.chassis),
      },
      {
        id: "type",
        header: copy.columns.type,
        cellClassName: "text-slate-600",
        cell: (vehicle) =>
          vehicle.vehicle_type?.name
            ? vehicle.vehicle_type.name
            : emptyCellLabel(empty.type),
      },
      {
        id: "class",
        header: copy.columns.class,
        cellClassName: "text-slate-600",
        cell: (vehicle) =>
          vehicle.vehicle_class?.name
            ? vehicle.vehicle_class.name
            : emptyCellLabel(empty.class),
      },
      {
        id: "driver",
        header: copy.columns.driver,
        cellClassName: "align-top",
        cell: (vehicle) => {
          const hasDriver = Boolean(vehicle.assigned_driver);
          const driver = vehicle.assigned_driver;

          return (
            <div className="flex w-full min-w-[9.5rem] max-w-[11rem] flex-col items-start gap-1.5 py-0.5">
              {hasDriver && driver ? (
                <>
                  <div className="min-w-0 w-full">
                    <p className="truncate text-sm font-medium leading-snug text-slate-800">
                      {driver.name}
                    </p>
                    {driver.email ? (
                      <p className="truncate text-xs leading-snug text-slate-500">{driver.email}</p>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 whitespace-nowrap border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-800"
                  >
                    {copy.driverStatus.assigned}
                  </Badge>
                </>
              ) : (
                <>
                  <p className="text-sm leading-snug text-slate-500">{empty.driver}</p>
                  <Badge
                    variant="outline"
                    className="shrink-0 whitespace-nowrap border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-800"
                  >
                    {copy.driverStatus.unassigned}
                  </Badge>
                </>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (vehicle) => (
          <Badge variant="outline" className={cn("text-xs", vehicleStatusBadgeClass(vehicle.status))}>
            {copy.status[vehicle.status]}
          </Badge>
        ),
      },
    ];
    },
    [copy],
  );

  const loadVehicles = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchVehicles({
        page,
        limit,
        search: search || undefined,
        locale,
        vehicle_type_id: typeFilter === "all" ? undefined : typeFilter,
        vehicle_class_id: classFilter === "all" ? undefined : classFilter,
        status: statusFilter === "all" ? undefined : (statusFilter as VehicleStatus),
        unassigned_only: assignmentFilter === "unassigned" ? true : undefined,
        assigned_only: assignmentFilter === "assigned" ? true : undefined,
      }),
    [locale, typeFilter, classFilter, statusFilter, assignmentFilter],
  );

  const renderRowActions = useCallback(
    (vehicle: Vehicle, _context: DataTableRowContext<Vehicle>) => {
      if (!canWrite && !canDelete) {
        return null;
      }

      return (
        <VehicleRowActions
          vehicle={vehicle}
          labels={copy.actions}
          onEdit={openEditSheet}
          onAssignDriver={openAssignDriverSheet}
          onDelete={openDeleteModal}
          canEdit={canWrite}
          canDelete={canDelete}
        />
      );
    },
    [copy.actions, openEditSheet, openAssignDriverSheet, openDeleteModal, canWrite, canDelete],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <VehicleStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={vehicleColumns}
        fetchData={loadVehicles}
        getRowKey={(vehicle) => vehicle.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button type="button" onClick={openCreateSheet} className={adminPrimaryButtonClass}>
              <Plus className="size-4" />
              {copy.newVehicle}
            </Button>
          ) : undefined
        }
        minTableWidth="960px"
        emptyIcon={Truck}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey, typeFilter, classFilter, statusFilter, assignmentFilter]}
        filterBar={
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="vehicle-type-filter" className={adminFilterLabelClass}>
                {copy.filters.type}
              </Label>
              <Select
                items={[
                  { label: copy.filters.typeAll, value: "all" },
                  ...vehicleTypes.map((vehicleType) => ({
                    label: vehicleType.name,
                    value: vehicleType.id,
                  })),
                ]}
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value ?? "all");
                  bumpRefresh();
                }}
              >
                <SelectTrigger
                  id="vehicle-type-filter"
                  className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
                >
                  <SelectValue placeholder={copy.filters.type} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.filters.typeAll}</SelectItem>
                    {vehicleTypes.map((vehicleType) => (
                      <SelectItem key={vehicleType.id} value={vehicleType.id}>
                        {vehicleType.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="vehicle-class-filter" className={adminFilterLabelClass}>
                {copy.filters.class}
              </Label>
              <Select
                items={[
                  { label: copy.filters.classAll, value: "all" },
                  ...vehicleClasses.map((vehicleClass) => ({
                    label: vehicleClass.name,
                    value: vehicleClass.id,
                  })),
                ]}
                value={classFilter}
                onValueChange={(value) => {
                  setClassFilter(value ?? "all");
                  bumpRefresh();
                }}
              >
                <SelectTrigger
                  id="vehicle-class-filter"
                  className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
                >
                  <SelectValue placeholder={copy.filters.class} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.filters.classAll}</SelectItem>
                    {vehicleClasses.map((vehicleClass) => (
                      <SelectItem key={vehicleClass.id} value={vehicleClass.id}>
                        {vehicleClass.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="vehicle-status-filter" className={adminFilterLabelClass}>
                {copy.filters.status}
              </Label>
              <Select
                items={[
                  { label: copy.filters.statusAll, value: "all" },
                  ...VEHICLE_STATUSES.map((status) => ({
                    label: copy.status[status],
                    value: status,
                  })),
                ]}
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value ?? "all");
                  bumpRefresh();
                }}
              >
                <SelectTrigger
                  id="vehicle-status-filter"
                  className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
                >
                  <SelectValue placeholder={copy.filters.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.filters.statusAll}</SelectItem>
                    {VEHICLE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {copy.status[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="vehicle-assignment-filter" className={adminFilterLabelClass}>
                {copy.filters.assignment}
              </Label>
              <Select
                items={[
                  { label: copy.filters.all, value: "all" },
                  { label: copy.filters.assigned, value: "assigned" },
                  { label: copy.filters.unassigned, value: "unassigned" },
                ]}
                value={assignmentFilter}
                onValueChange={(value) => {
                  setAssignmentFilter(value ?? "all");
                  bumpRefresh();
                }}
              >
                <SelectTrigger
                  id="vehicle-assignment-filter"
                  className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
                >
                  <SelectValue placeholder={copy.filters.assignment} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.filters.all}</SelectItem>
                    <SelectItem value="assigned">{copy.filters.assigned}</SelectItem>
                    <SelectItem value="unassigned">{copy.filters.unassigned}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      {canWrite ? (
        <>
          <CreateVehicleSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            mode={sheetMode}
            vehicleId={editingVehicleId}
            onSuccess={() => setRefreshKey((current) => current + 1)}
          />
          <AssignVehicleDriverSheet
            open={assignDriverOpen}
            onOpenChange={setAssignDriverOpen}
            vehicle={assigningVehicle}
            onSuccess={() => setRefreshKey((current) => current + 1)}
          />
        </>
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingVehicle?.plate_number}
          onConfirm={async () => {
            if (!deletingVehicle) {
              return;
            }

            try {
              await deleteVehicle(deletingVehicle.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingVehicle.plate_number,
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
