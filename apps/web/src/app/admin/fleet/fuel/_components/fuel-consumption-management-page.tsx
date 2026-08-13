"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Fuel, MoreHorizontal, Pencil, Plus } from "lucide-react";
import type {
  Vehicle,
  VehicleFuelLog,
  VehicleFuelType,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
  adminBadgeGoldClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchFleetFuelLogs, fetchVehicles } from "@/lib/vehicle-api";
import { showErrorToast } from "@/lib/toast";
import { getAdminVehiclesMessages, getTranslations } from "@/translations";
import { CreateFuelSheet } from "@/app/admin/fleet/vehicles/[id]/_components/create-fuel-sheet";
import { FuelLogDetailSheet } from "@/app/admin/fleet/vehicles/[id]/_components/fuel-log-detail-sheet";
import {
  FUEL_TYPES,
  formatFuelDateTime,
  formatFuelEfficiency,
  formatFuelQuantity,
  fuelEfficiencyClass,
} from "@/app/admin/fleet/vehicles/[id]/_components/vehicle-detail-shared";
import { FuelConsumptionStats } from "./fuel-consumption-stats";

const ALL = "all";

export function FuelConsumptionManagementPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getTranslations(locale).adminVehicleOperations;
  const vehicleCopy = getAdminVehiclesMessages(locale);
  const fuelCopy = vehicleCopy.detail.fuel;
  const canRead = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.vehicles.write);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState(ALL);
  const [fuelTypeFilter, setFuelTypeFilter] = useState(ALL);
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
        ? (vehicles.find((vehicle) => vehicle.id === editingLog?.vehicle_id) ??
          null)
        : selectedVehicle,
    [editingLog?.vehicle_id, formMode, selectedVehicle, vehicles],
  );
  const detailVehicle = useMemo(
    () =>
      vehicles.find((vehicle) => vehicle.id === detailLog?.vehicle_id) ?? null,
    [detailLog?.vehicle_id, vehicles],
  );

  const loadRecords = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchFleetFuelLogs({
        page,
        limit,
        search: search || undefined,
        vehicle_id: vehicleFilter === ALL ? undefined : vehicleFilter,
        fuel_type:
          fuelTypeFilter === ALL
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

  const columns = useMemo<DataTableColumn<VehicleFuelLog>[]>(
    () => [
      {
        id: "vehicle",
        header: copy.common.vehicle,
        cell: (log) => (
          <Link
            href={`/admin/fleet/vehicles/${log.vehicle_id}`}
            className="font-mono font-semibold text-[#1C3A34] hover:underline dark:text-[#e1d49d]"
          >
            {log.vehicle.plate_number}
          </Link>
        ),
      },
      {
        id: "refill",
        header: copy.fuel.refill,
        cell: (log) => (
          <div className="max-w-56">
            <p className="truncate font-medium text-slate-800 dark:text-slate-200">
              {log.station_name || copy.common.notSet}
            </p>
            <p className="truncate text-xs text-slate-500">
              {log.receipt_reference || log.notes || copy.common.notSet}
            </p>
          </div>
        ),
      },
      {
        id: "fuel_type",
        header: copy.fuel.fuelType,
        cell: (log) => vehicleCopy.detail.fuelTypes[log.fuel_type],
      },
      {
        id: "quantity",
        header: copy.fuel.quantity,
        cell: (log) => formatFuelQuantity(log.quantity_liters),
      },
      {
        id: "cost",
        header: copy.fuel.cost,
        cell: (log) =>
          log.total_cost == null
            ? copy.common.notSet
            : `${new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-US").format(log.total_cost)} ETB`,
      },
      {
        id: "consumption",
        header: copy.fuel.consumption,
        cell: (log) => (
          <Badge
            variant="outline"
            className={fuelEfficiencyClass(log.consumption_km_per_liter)}
          >
            {formatFuelEfficiency(log.consumption_km_per_liter, fuelCopy)}
          </Badge>
        ),
      },
      {
        id: "driver",
        header: copy.common.driverAtRefill,
        cell: (log) =>
          log.driver_at_refill?.name ?? copy.common.unassignedDriver,
      },
      {
        id: "refilled_at",
        header: copy.common.refilledAt,
        cellClassName: "whitespace-nowrap text-slate-500",
        cell: (log) => formatFuelDateTime(log.logged_at, locale),
      },
    ],
    [copy, fuelCopy, locale, vehicleCopy.detail.fuelTypes],
  );

  if (!canRead) {
    return <PageAccessDenied copy={vehicleCopy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <FuelConsumptionStats locale={locale} refreshKey={refreshKey} />
      <DataTable
        eyebrow={
          <Badge className={adminBadgeGoldClass}>{copy.fuel.eyebrow}</Badge>
        }
        title={copy.fuel.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={copy.common.actions}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    setDetailLog(log);
                    setDetailOpen(true);
                  }}
                >
                  <Eye />
                  {copy.common.view}
                </DropdownMenuItem>
                {canWrite ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingLog(log);
                      setFormMode("edit");
                      setFormOpen(true);
                    }}
                  >
                    <Pencil />
                    {copy.common.edit}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        toolbarActions={
          canWrite ? (
            <Button
              type="button"
              onClick={openCreate}
              className={adminPrimaryButtonClass}
            >
              <Plus className="size-4" />
              {copy.fuel.newRecord}
            </Button>
          ) : undefined
        }
        filterBar={
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{copy.common.vehicle}</Label>
              <Select
                items={[
                  { value: ALL, label: copy.common.allVehicles },
                  ...vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: vehicle.plate_number,
                  })),
                ]}
                value={vehicleFilter}
                onValueChange={(value) => setVehicleFilter(value ?? ALL)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>
                      {copy.common.allVehicles}
                    </SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{copy.fuel.fuelType}</Label>
              <Select
                items={[
                  { value: ALL, label: copy.fuel.allFuelTypes },
                  ...FUEL_TYPES.map((fuelType) => ({
                    value: fuelType,
                    label: vehicleCopy.detail.fuelTypes[fuelType],
                  })),
                ]}
                value={fuelTypeFilter}
                onValueChange={(value) => setFuelTypeFilter(value ?? ALL)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>
                      {copy.fuel.allFuelTypes}
                    </SelectItem>
                    {FUEL_TYPES.map((fuelType) => (
                      <SelectItem key={fuelType} value={fuelType}>
                        {vehicleCopy.detail.fuelTypes[fuelType]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
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
