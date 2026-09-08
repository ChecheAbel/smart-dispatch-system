"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Truck } from "lucide-react";
import type { Vehicle, VehicleClass, VehicleStatus, VehicleType } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { useRouter } from "next/navigation";
import {
  DataTable,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { deleteVehicle, fetchVehicles } from "@/lib/vehicle-api";
import { fetchVehicleTypes } from "@/lib/vehicle-type-api";
import { fetchVehicleClasses } from "@/lib/vehicle-class-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { adminEyebrowClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateVehicleSheet } from "./create-vehicle-sheet";
import { AssignVehicleDriverSheet } from "./assign-vehicle-driver-sheet";
import { VehicleStats } from "./vehicle-stats";
import { useVehicleColumns, VehicleRowActions } from "./vehicle-columns";
import { VehicleFilterBar } from "./vehicle-filter-bar";

export function VehiclesPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminVehiclesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.vehicles.write);
  const canAssignDriver = hasPermission(PERMISSIONS.vehicles.assign_driver);
  const canDelete = hasPermission(PERMISSIONS.vehicles.delete);

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
    if (!canRead) return;

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

  const handleResetFilters = useCallback(() => {
    setTypeFilter("all");
    setClassFilter("all");
    setStatusFilter("all");
    setAssignmentFilter("all");
    bumpRefresh();
  }, []);

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

  const openVehicleDetail = useCallback(
    (vehicle: Vehicle) => {
      router.push(`/admin/fleet/vehicles/${vehicle.id}`);
    },
    [router],
  );

  const openDeleteModal = useCallback((vehicle: Vehicle) => {
    setDeletingVehicle(vehicle);
    setDeleteOpen(true);
  }, []);

  const openAssignDriverSheet = useCallback((vehicle: Vehicle) => {
    setAssigningVehicle(vehicle);
    setAssignDriverOpen(true);
  }, []);

  const vehicleColumns = useVehicleColumns({ copy, openVehicleDetail });

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
    (vehicle: Vehicle, _context: DataTableRowContext<Vehicle>) => (
      <VehicleRowActions
        vehicle={vehicle}
        labels={copy.actions}
        onView={openVehicleDetail}
        onEdit={openEditSheet}
        onAssignDriver={openAssignDriverSheet}
        onDelete={openDeleteModal}
        canEdit={canWrite}
        canAssignDriver={canAssignDriver}
        canDelete={canDelete}
      />
    ),
    [
      copy.actions,
      openVehicleDetail,
      openEditSheet,
      openAssignDriverSheet,
      openDeleteModal,
      canWrite,
      canAssignDriver,
      canDelete,
    ],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <VehicleStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={vehicleColumns}
        fetchData={loadVehicles}
        getRowKey={(vehicle) => vehicle.id}
        showIndexColumn
        renderRowActions={renderRowActions}
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
          <VehicleFilterBar
            copy={copy}
            vehicleTypes={vehicleTypes}
            vehicleClasses={vehicleClasses}
            typeFilter={typeFilter}
            classFilter={classFilter}
            statusFilter={statusFilter}
            assignmentFilter={assignmentFilter}
            onTypeChange={(val) => {
              setTypeFilter(val);
              bumpRefresh();
            }}
            onClassChange={(val) => {
              setClassFilter(val);
              bumpRefresh();
            }}
            onStatusChange={(val) => {
              setStatusFilter(val);
              bumpRefresh();
            }}
            onAssignmentChange={(val) => {
              setAssignmentFilter(val);
              bumpRefresh();
            }}
            onReset={handleResetFilters}
          />
        }
      />

      {canWrite ? (
        <CreateVehicleSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          vehicleId={editingVehicleId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canAssignDriver ? (
        <AssignVehicleDriverSheet
          open={assignDriverOpen}
          onOpenChange={setAssignDriverOpen}
          vehicle={assigningVehicle}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingVehicle?.plate_number}
          onConfirm={async () => {
            if (!deletingVehicle) return;

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
