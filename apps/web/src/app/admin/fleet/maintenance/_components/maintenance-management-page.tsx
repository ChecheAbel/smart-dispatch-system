"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, MoreHorizontal, Plus, Wrench } from "lucide-react";
import type {
  Vehicle,
  VehicleMaintenanceLog,
  VehicleMaintenanceStatus,
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
  adminBadgeGoldClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import {
  fetchFleetMaintenance,
  fetchVehicles,
  updateVehicleMaintenance,
} from "@/lib/vehicle-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminVehiclesMessages, getTranslations } from "@/translations";
import { CreateMaintenanceSheet } from "@/app/admin/fleet/vehicles/[id]/_components/create-maintenance-sheet";
import { MaintenanceLogDetailSheet } from "@/app/admin/fleet/vehicles/[id]/_components/maintenance-log-detail-sheet";
import {
  formatMaintenanceDateTime,
  MAINTENANCE_STATUSES,
  maintenanceStatusClass,
} from "@/app/admin/fleet/vehicles/[id]/_components/vehicle-detail-shared";
import { MaintenanceManagementStats } from "./maintenance-management-stats";

const ALL = "all";

export function MaintenanceManagementPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getTranslations(locale).adminVehicleOperations;
  const vehicleCopy = getAdminVehiclesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.vehicles.write);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<VehicleMaintenanceLog | null>(
    null,
  );

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
    () =>
      vehicles.find((vehicle) => vehicle.id === detailLog?.vehicle_id) ?? null,
    [detailLog?.vehicle_id, vehicles],
  );

  const loadRecords = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchFleetMaintenance({
        page,
        limit,
        search: search || undefined,
        vehicle_id: vehicleFilter === ALL ? undefined : vehicleFilter,
        status:
          statusFilter === ALL
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

  const columns = useMemo<DataTableColumn<VehicleMaintenanceLog>[]>(
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
        id: "work_type",
        header: copy.maintenance.workType,
        cell: (log) => log.work_type.name,
      },
      {
        id: "title",
        header: copy.maintenance.titleColumn,
        cell: (log) => (
          <div className="max-w-64">
            <p className="truncate font-medium text-slate-800 dark:text-slate-200">
              {log.title}
            </p>
            <p className="truncate text-xs text-slate-500">
              {log.vendor || log.description || copy.common.notSet}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: copy.maintenance.status,
        cell: (log) => (
          <Badge
            variant="outline"
            className={maintenanceStatusClass(log.status)}
          >
            {vehicleCopy.detail.maintenanceStatuses[log.status]}
          </Badge>
        ),
      },
      {
        id: "driver",
        header: copy.common.driverAtRequest,
        cell: (log) =>
          log.driver_at_request?.name ?? copy.common.unassignedDriver,
      },
      {
        id: "requested_at",
        header: copy.common.requestedAt,
        cellClassName: "whitespace-nowrap text-slate-500",
        cell: (log) => formatMaintenanceDateTime(log.created_at, locale),
      },
    ],
    [copy, locale, vehicleCopy.detail.maintenanceStatuses],
  );

  if (!canRead) {
    return <PageAccessDenied copy={vehicleCopy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <MaintenanceManagementStats locale={locale} refreshKey={refreshKey} />
      <DataTable
        eyebrow={
          <Badge className={adminBadgeGoldClass}>
            {copy.maintenance.eyebrow}
          </Badge>
        }
        title={copy.maintenance.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => openDetails(log)}>
                  <Eye />
                  {copy.common.view}
                </DropdownMenuItem>
                {canWrite ? <DropdownMenuSeparator /> : null}
                {canWrite && log.status !== "open" ? (
                  <DropdownMenuItem
                    onClick={() => void updateStatus(log, "open")}
                  >
                    {copy.maintenance.markOpen}
                  </DropdownMenuItem>
                ) : null}
                {canWrite && log.status !== "in_progress" ? (
                  <DropdownMenuItem
                    onClick={() => void updateStatus(log, "in_progress")}
                  >
                    {copy.maintenance.markInProgress}
                  </DropdownMenuItem>
                ) : null}
                {canWrite && log.status !== "completed" ? (
                  <DropdownMenuItem
                    onClick={() => void updateStatus(log, "completed")}
                  >
                    <CheckCircle2 />
                    {copy.maintenance.markCompleted}
                  </DropdownMenuItem>
                ) : null}
                {canWrite && log.status !== "cancelled" ? (
                  <DropdownMenuItem
                    onClick={() => void updateStatus(log, "cancelled")}
                  >
                    {copy.maintenance.markCancelled}
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
              {copy.maintenance.newRecord}
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
              <Label>{copy.maintenance.status}</Label>
              <Select
                items={[
                  { value: ALL, label: copy.maintenance.allStatuses },
                  ...MAINTENANCE_STATUSES.map((status) => ({
                    value: status,
                    label: vehicleCopy.detail.maintenanceStatuses[status],
                  })),
                ]}
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value ?? ALL)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>
                      {copy.maintenance.allStatuses}
                    </SelectItem>
                    {MAINTENANCE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {vehicleCopy.detail.maintenanceStatuses[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
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
