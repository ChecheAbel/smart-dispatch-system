"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Fuel, Plus } from "lucide-react";
import type {
  Vehicle,
  VehicleFuelLog,
  VehicleFuelType,
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
import { fetchFleetFuelLogs, fetchVehicles } from "@/lib/vehicle-api";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getAdminVehiclesMessages, getTranslations } from "@/translations";
import { CreateFuelSheet } from "@/app/admin/fleet/vehicles/[id]/_components/create-fuel-sheet";
import { FuelLogDetailSheet } from "@/app/admin/fleet/vehicles/[id]/_components/fuel-log-detail-sheet";
import { FUEL_TYPES } from "@/app/admin/fleet/vehicles/[id]/_components/vehicle-detail-shared";
import { getFuelColumns, FuelRowActions } from "./fuel-columns";
import { ALL_FILTER, FuelFilterBar } from "./fuel-filter-bar";
import { FuelConsumptionStats } from "./fuel-consumption-stats";

export function FuelConsumptionManagementPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getTranslations(locale).adminVehicleOperations;
  const vehicleCopy = getAdminVehiclesMessages(locale);
  const fuelCopy = vehicleCopy.detail.fuel;
  const canRead = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.vehicles.write);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState(ALL_FILTER);
  const [fuelTypeFilter, setFuelTypeFilter] = useState(ALL_FILTER);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingLog, setEditingLog] = useState<VehicleFuelLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<VehicleFuelLog | null>(null);

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

  const formVehicle = useMemo(
    () =>
      formMode === "edit"
        ? (vehicles.find((vehicle) => vehicle.id === editingLog?.vehicle_id) ?? null)
        : selectedVehicle,
    [editingLog?.vehicle_id, formMode, selectedVehicle, vehicles],
  );

  const detailVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === detailLog?.vehicle_id) ?? null,
    [detailLog?.vehicle_id, vehicles],
  );

  const loadRecords = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchFleetFuelLogs({
        page,
        limit,
        search: search || undefined,
        vehicle_id: vehicleFilter === ALL_FILTER ? undefined : vehicleFilter,
        fuel_type:
          fuelTypeFilter === ALL_FILTER
            ? undefined
            : (fuelTypeFilter as VehicleFuelType),
      }),
    [fuelTypeFilter, vehicleFilter],
  );

  const openCreate = useCallback(() => {
    if (!selectedVehicle) {
      showErrorToast({
        title: copy.common.chooseVehicle,
        description: copy.common.chooseVehicleFirst,
      });
      return;
    }
    setEditingLog(null);
    setFormMode("create");
    setFormOpen(true);
  }, [copy.common, selectedVehicle]);

  const openDetails = useCallback((log: VehicleFuelLog) => {
    setDetailLog(log);
    setDetailOpen(true);
  }, []);

  const openEdit = useCallback((log: VehicleFuelLog) => {
    setEditingLog(log);
    setFormMode("edit");
    setFormOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      getFuelColumns({
        locale,
        onView: openDetails,
        onEdit: openEdit,
        copy: {
          vehicle: copy.common.vehicle,
          refill: copy.fuel.refill,
          fuelType: copy.fuel.fuelType,
          quantity: copy.fuel.quantity,
          cost: copy.fuel.cost,
          consumption: copy.fuel.consumption,
          driverAtRefill: copy.common.driverAtRefill,
          unassignedDriver: copy.common.unassignedDriver,
          refilledAt: copy.common.refilledAt,
          notSet: copy.common.notSet,
          actions: copy.common.actions,
          view: copy.common.view,
          edit: copy.common.edit,
        },
        fuelCopy,
        fuelTypeLabels: vehicleCopy.detail.fuelTypes,
      }),
    [copy, fuelCopy, locale, openDetails, openEdit, vehicleCopy.detail.fuelTypes],
  );

  if (!canRead) {
    return <PageAccessDenied copy={vehicleCopy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <FuelConsumptionStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        eyebrow={
          <p className={cn(adminEyebrowClass, "text-xs")}>
            {copy.fuel.eyebrow}
          </p>
        }
        title={copy.fuel.title}
        titleClassName={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}
        description={copy.fuel.description}
        searchPlaceholder={copy.fuel.searchPlaceholder}
        itemLabel={copy.fuel.itemLabel}
        columns={columns}
        fetchData={loadRecords}
        getRowKey={(log) => log.id}
        showIndexColumn
        emptyIcon={Fuel}
        emptyTitle={copy.fuel.emptyTitle}
        emptyDescription={copy.fuel.emptyDescription}
        emptySearchDescription={copy.fuel.emptySearchDescription}
        minTableWidth="1200px"
        refreshDeps={[refreshKey, vehicleFilter, fuelTypeFilter]}
        actionsColumnHeader={copy.common.actions}
        renderRowActions={(log) => (
          <FuelRowActions
            log={log}
            canWrite={canWrite}
            onView={openDetails}
            onEdit={openEdit}
            viewLabel={copy.common.view}
            editLabel={copy.common.edit}
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
              <span>{copy.fuel.newRecord}</span>
            </Button>
          ) : undefined
        }
        filterBar={
          <FuelFilterBar
            vehicles={vehicles}
            fuelTypes={FUEL_TYPES}
            vehicleFilter={vehicleFilter}
            fuelTypeFilter={fuelTypeFilter}
            onVehicleChange={setVehicleFilter}
            onFuelTypeChange={setFuelTypeFilter}
            onReset={() => {
              setVehicleFilter(ALL_FILTER);
              setFuelTypeFilter(ALL_FILTER);
            }}
            copy={{
              vehicleLabel: copy.common.vehicle,
              allVehicles: copy.common.allVehicles,
              fuelTypeLabel: copy.fuel.fuelType,
              allFuelTypes: copy.fuel.allFuelTypes,
              resetLabel: getTranslations(locale).adminDashboard.filters.reset,
            }}
            fuelTypeLabels={vehicleCopy.detail.fuelTypes}
          />
        }
      />

      <CreateFuelSheet
        key={`${formMode}:${editingLog?.id ?? "new"}:${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={formVehicle}
        mode={formMode}
        fuelLog={editingLog}
        onSuccess={() => setRefreshKey((current) => current + 1)}
      />

      <FuelLogDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={detailLog}
        vehicle={detailVehicle}
      />
    </div>
  );
}
