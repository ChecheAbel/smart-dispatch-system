"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import type {
  Vehicle,
  VehicleMaintenanceLog,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { DataTable, type DataTableFetchParams } from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Button } from "@/components/ui/button";
import {
  adminEyebrowClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import {
  fetchFleetMaintenance,
  fetchVehicles,
  updateVehicleMaintenance,
} from "@/lib/vehicle-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getAdminVehiclesMessages, getTranslations } from "@/translations";
import { CreateMaintenanceSheet } from "@/app/admin/fleet/vehicles/[id]/_components/create-maintenance-sheet";
import { MaintenanceLogDetailSheet } from "@/app/admin/fleet/vehicles/[id]/_components/maintenance-log-detail-sheet";
import { MAINTENANCE_STATUSES } from "@/app/admin/fleet/vehicles/[id]/_components/vehicle-detail-shared";
import { getMaintenanceColumns, MaintenanceRowActions } from "./maintenance-columns";
import { ALL_FILTER, MaintenanceFilterBar } from "./maintenance-filter-bar";
import { MaintenanceManagementStats } from "./maintenance-management-stats";

export function MaintenanceManagementPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getTranslations(locale).adminVehicleOperations;
  const vehicleCopy = getAdminVehiclesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.vehicles.write);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<VehicleMaintenanceLog | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    void fetchVehicles({ limit: 1000, locale })
      .then((result) => {
        if (!cancelled) setVehicles(result.data);
      })
      .catch(() => {
        if (!cancelled) setVehicles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, locale]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleFilter) ?? null,
    [vehicleFilter, vehicles],
  );

  const detailVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === detailLog?.vehicle_id) ?? null,
    [detailLog?.vehicle_id, vehicles],
  );

  const loadRecords = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchFleetMaintenance({
        page,
        limit,
        search: search || undefined,
        vehicle_id: vehicleFilter === ALL_FILTER ? undefined : vehicleFilter,
        status:
          statusFilter === ALL_FILTER
            ? undefined
            : (statusFilter as VehicleMaintenanceStatus),
        locale,
      }),
    [locale, statusFilter, vehicleFilter],
  );

  const openCreate = useCallback(() => {
    if (!selectedVehicle) {
      showErrorToast({
        title: copy.common.chooseVehicle,
        description: copy.common.chooseVehicleFirst,
      });
      return;
    }
    setCreateOpen(true);
  }, [copy.common, selectedVehicle]);

  const openDetails = useCallback((log: VehicleMaintenanceLog) => {
    setDetailLog(log);
    setDetailOpen(true);
  }, []);

  const updateStatus = useCallback(
    async (log: VehicleMaintenanceLog, status: VehicleMaintenanceStatus) => {
      try {
        await updateVehicleMaintenance(log.vehicle_id, log.id, {
          status,
          completed_at:
            status === "completed"
              ? new Date().toISOString().slice(0, 10)
              : null,
        });
        showSuccessToast({
          title: copy.maintenance.statusUpdated,
          description: vehicleCopy.detail.toast.maintenanceUpdated.description,
        });
        setDetailOpen(false);
        setRefreshKey((current) => current + 1);
      } catch (error) {
        showErrorToast({
          title: copy.maintenance.statusUpdateFailed,
          description:
            error instanceof Error
              ? error.message
              : vehicleCopy.detail.toast.maintenanceFailed.description,
        });
      }
    },
    [copy.maintenance, vehicleCopy.detail.toast],
  );

  const columns = useMemo(
    () =>
      getMaintenanceColumns({
        locale,
        canWrite,
        onView: openDetails,
        onUpdateStatus: updateStatus,
        copy: {
          vehicle: copy.common.vehicle,
          workType: copy.maintenance.workType,
          titleColumn: copy.maintenance.titleColumn,
          status: copy.maintenance.status,
          driverAtRequest: copy.common.driverAtRequest,
          unassignedDriver: copy.common.unassignedDriver,
          notSet: copy.common.notSet,
          requestedAt: copy.common.requestedAt,
          actions: copy.common.actions,
          view: copy.common.view,
          markOpen: copy.maintenance.markOpen,
          markInProgress: copy.maintenance.markInProgress,
          markCompleted: copy.maintenance.markCompleted,
          markCancelled: copy.maintenance.markCancelled,
        },
        statusLabels: vehicleCopy.detail.maintenanceStatuses,
      }),
    [canWrite, copy, locale, openDetails, updateStatus, vehicleCopy.detail.maintenanceStatuses],
  );

  if (!canRead) {
    return <PageAccessDenied copy={vehicleCopy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <MaintenanceManagementStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        eyebrow={
          <p className={cn(adminEyebrowClass, "text-xs")}>
            {copy.maintenance.eyebrow}
          </p>
        }
        title={copy.maintenance.title}
        titleClassName={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}
        description={copy.maintenance.description}
        searchPlaceholder={copy.maintenance.searchPlaceholder}
        itemLabel={copy.maintenance.itemLabel}
        columns={columns}
        fetchData={loadRecords}
        getRowKey={(log) => log.id}
        showIndexColumn
        emptyIcon={Wrench}
        emptyTitle={copy.maintenance.emptyTitle}
        emptyDescription={copy.maintenance.emptyDescription}
        emptySearchDescription={copy.maintenance.emptySearchDescription}
        minTableWidth="1080px"
        refreshDeps={[refreshKey, vehicleFilter, statusFilter]}
        actionsColumnHeader={copy.common.actions}
        renderRowActions={(log) => (
          <MaintenanceRowActions
            log={log}
            canWrite={canWrite}
            onView={openDetails}
            onUpdateStatus={updateStatus}
            copy={{
              actions: copy.common.actions,
              view: copy.common.view,
              markOpen: copy.maintenance.markOpen,
              markInProgress: copy.maintenance.markInProgress,
              markCompleted: copy.maintenance.markCompleted,
              markCancelled: copy.maintenance.markCancelled,
            }}
          />
        )}
        toolbarActions={
          canWrite ? (
            <Button
              type="button"
              onClick={openCreate}
              className={cn(adminPrimaryButtonClass, "gap-2")}
            >
              <Plus className="size-4" />
              <span>{copy.maintenance.newRecord}</span>
            </Button>
          ) : undefined
        }
        filterBar={
          <MaintenanceFilterBar
            vehicles={vehicles}
            vehicleStatuses={MAINTENANCE_STATUSES}
            vehicleFilter={vehicleFilter}
            statusFilter={statusFilter}
            onVehicleChange={setVehicleFilter}
            onStatusChange={setStatusFilter}
            onReset={() => {
              setVehicleFilter(ALL_FILTER);
              setStatusFilter(ALL_FILTER);
            }}
            copy={{
              vehicleLabel: copy.common.vehicle,
              allVehicles: copy.common.allVehicles,
              statusLabel: copy.maintenance.status,
              allStatuses: copy.maintenance.allStatuses,
              resetLabel: getTranslations(locale).adminDashboard.filters.reset,
            }}
            statusLabels={vehicleCopy.detail.maintenanceStatuses}
          />
        }
      />

      <CreateMaintenanceSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        vehicle={selectedVehicle}
        onSuccess={() => setRefreshKey((current) => current + 1)}
      />

      <MaintenanceLogDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={detailLog}
        vehicle={detailVehicle}
        canWrite={canWrite}
        onComplete={(log) => void updateStatus(log, "completed")}
      />
    </div>
  );
}
