"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Car,
  ClipboardList,
  Eye,
  Pencil,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { Vehicle, VehicleComplianceStatus } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminEyebrowClass, adminSelectTriggerClass } from "@/lib/admin-theme";
import { canReadCompliance, canWriteCompliance } from "@/lib/permissions";
import { fetchVehicles } from "@/lib/vehicle-api";
import {
  formatComplianceDate,
  getExpiryTone,
} from "@/lib/vehicle-compliance";
import { getAdminComplianceMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { UpdateComplianceSheet } from "./update-compliance-sheet";
import { ComplianceStats } from "./compliance-stats";
import { ComplianceStatusBadge } from "./compliance-status-badge";

type ComplianceListType = "insurance" | "inspection";

const COMPLIANCE_STATUSES: VehicleComplianceStatus[] = [
  "expired",
  "due_soon",
  "ok",
  "not_set",
];

type ComplianceListPageProps = {
  type: ComplianceListType;
};

function ComplianceRowActions({
  vehicle,
  labels,
  editLabel,
  onView,
  onEdit,
  canWrite,
}: {
  vehicle: Vehicle;
  labels: ReturnType<typeof getAdminComplianceMessages>["actions"];
  editLabel: string;
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  canWrite: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onView(vehicle)}
        className="size-8 text-slate-500 hover:bg-[#1C3A34]/8 hover:text-[#1C3A34] dark:hover:bg-accent dark:hover:text-foreground"
        title={labels.view}
        aria-label={labels.view}
      >
        <Eye className="size-4" />
      </Button>
      {canWrite ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(vehicle)}
          className="size-8 text-slate-500 hover:bg-[#1C3A34]/8 hover:text-[#1C3A34] dark:hover:bg-accent dark:hover:text-foreground"
          title={editLabel}
          aria-label={editLabel}
        >
          <Pencil className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function ComplianceListPage({ type }: ComplianceListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminComplianceMessages(locale);
  const pageCopy = type === "insurance" ? copy.insurance : copy.inspection;
  const canRead = canReadCompliance(hasPermission);
  const canWrite = canWriteCompliance(hasPermission);

  const initialStatus = searchParams.get("status");
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatus && COMPLIANCE_STATUSES.includes(initialStatus as VehicleComplianceStatus)
      ? initialStatus
      : "all",
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const editLabel =
    type === "insurance" ? copy.actions.editInsurance : copy.actions.editInspection;

  const openEditSheet = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSheetOpen(true);
  }, []);

  const handleSheetSuccess = useCallback(() => {
    setTableRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    if (nextStatus && COMPLIANCE_STATUSES.includes(nextStatus as VehicleComplianceStatus)) {
      setStatusFilter(nextStatus);
    } else if (!nextStatus) {
      setStatusFilter("all");
    }
  }, [searchParams]);

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      const next = value || "all";
      setStatusFilter(next);

      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") {
        params.delete("status");
      } else {
        params.set("status", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openVehicle = useCallback(
    (vehicle: Vehicle) => {
      router.push(`/admin/fleet/vehicles/${vehicle.id}`);
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<Vehicle>[]>(() => {
    const expiryField =
      type === "insurance" ? "insurance_expires_at" : "inspection_expires_at";

    const baseColumns: DataTableColumn<Vehicle>[] = [
      {
        id: "plate",
        header: copy.columns.plate,
        cell: (vehicle) => (
          <button
            type="button"
            onClick={() => openVehicle(vehicle)}
            className="group inline-flex items-center gap-1.5 rounded-md border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-[#1C3A34] transition-all hover:border-[#1C3A34]/30 hover:bg-[#1C3A34]/8 dark:border-border dark:bg-muted/50 dark:text-foreground dark:hover:bg-accent"
          >
            <Car className="size-3.5 text-slate-400 group-hover:text-[#1C3A34] dark:group-hover:text-[var(--brand-accent)] transition-colors" />
            {vehicle.plate_number}
          </button>
        ),
      },
    ];

    if (type === "insurance") {
      baseColumns.push(
        {
          id: "provider",
          header: copy.columns.provider,
          cell: (vehicle) =>
            vehicle.insurance_provider ? (
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-foreground">
                <Building2 className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{vehicle.insurance_provider}</span>
              </div>
            ) : (
              <span className="text-slate-400">—</span>
            ),
        },
        {
          id: "policy",
          header: copy.columns.policyNumber,
          cell: (vehicle) =>
            vehicle.insurance_policy_number ? (
              <span className="inline-block rounded border border-slate-200/70 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
                {vehicle.insurance_policy_number}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            ),
        },
        {
          id: "issued",
          header: copy.columns.issuedAt,
          cell: (vehicle) => {
            const date = formatComplianceDate(vehicle.insurance_issued_at, locale);
            return date ? (
              <span className="text-xs text-slate-600 dark:text-muted-foreground">{date}</span>
            ) : (
              <span className="text-slate-400">—</span>
            );
          },
        },
      );
    } else {
      baseColumns.push(
        {
          id: "center",
          header: copy.columns.center,
          cell: (vehicle) =>
            vehicle.inspection_center ? (
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-foreground">
                <Building2 className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{vehicle.inspection_center}</span>
              </div>
            ) : (
              <span className="text-slate-400">—</span>
            ),
        },
        {
          id: "certificate",
          header: copy.columns.certificateNumber,
          cell: (vehicle) =>
            vehicle.inspection_certificate_number ? (
              <span className="inline-block rounded border border-slate-200/70 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
                {vehicle.inspection_certificate_number}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            ),
        },
        {
          id: "performed",
          header: copy.columns.performedAt,
          cell: (vehicle) => {
            const date = formatComplianceDate(vehicle.inspection_performed_at, locale);
            return date ? (
              <span className="text-xs text-slate-600 dark:text-muted-foreground">{date}</span>
            ) : (
              <span className="text-slate-400">—</span>
            );
          },
        },
      );
    }

    baseColumns.push(
      {
        id: "expires",
        header: copy.columns.expiresAt,
        cell: (vehicle) => {
          const value = vehicle[expiryField];
          const date = formatComplianceDate(value, locale);
          if (!date) return <span className="text-slate-400">—</span>;
          const tone = getExpiryTone(value);
          return (
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                tone === "expired" && "text-red-700 dark:text-red-300",
                tone === "dueSoon" && "text-amber-700 dark:text-amber-300",
                tone === "ok" && "text-slate-700 dark:text-muted-foreground",
                tone === "notSet" && "text-slate-400 dark:text-muted-foreground/60",
              )}
            >
              {date}
            </span>
          );
        },
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (vehicle) => {
          const tone = getExpiryTone(vehicle[expiryField]);
          const statusKey = (tone === "dueSoon" ? "due_soon" : tone === "notSet" ? "not_set" : tone) as VehicleComplianceStatus;
          return (
            <ComplianceStatusBadge
              status={statusKey}
              label={copy.status[statusKey]}
            />
          );
        },
      },
    );

    return baseColumns;
  }, [copy, locale, openVehicle, type]);

  const loadVehicles = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchVehicles({
        page,
        limit,
        search: search || undefined,
        locale,
        compliance_type: type,
        compliance_status:
          statusFilter === "all" ? undefined : (statusFilter as VehicleComplianceStatus),
      }),
    [locale, statusFilter, type],
  );

  const renderRowActions = useCallback(
    (vehicle: Vehicle, _context: DataTableRowContext<Vehicle>) => (
      <ComplianceRowActions
        vehicle={vehicle}
        labels={copy.actions}
        editLabel={editLabel}
        onView={(item) => openVehicle(item)}
        onEdit={openEditSheet}
        canWrite={canWrite}
      />
    ),
    [canWrite, copy.actions, editLabel, openEditSheet, openVehicle],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <ComplianceStats
        type={type}
        locale={locale}
        refreshKey={tableRefreshKey}
        activeStatus={statusFilter}
        onStatusSelect={handleStatusFilterChange}
      />

      <DataTable
        key={`${locale}-${type}`}
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>}
        title={pageCopy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={pageCopy.description}
        searchPlaceholder={pageCopy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadVehicles}
        getRowKey={(vehicle) => vehicle.id}
        showIndexColumn
        renderRowActions={renderRowActions}
        actionsColumnHeader={copy.columns.actions}
        minTableWidth="960px"
        emptyIcon={type === "insurance" ? ShieldCheck : ClipboardList}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, statusFilter, type, tableRefreshKey]}
        toolbarActions={
          <div className="flex items-center gap-2">
            <Select
              items={[
                { label: copy.status.all, value: "all" },
                ...COMPLIANCE_STATUSES.map((status) => ({
                  label: copy.status[status],
                  value: status,
                })),
              ]}
              value={statusFilter}
              onValueChange={(value) => handleStatusFilterChange(value ?? "all")}
            >
              <SelectTrigger
                id="compliance-status-filter"
                aria-label={copy.filters.status}
                className={cn(adminSelectTriggerClass, "w-full min-w-[11.5rem] sm:w-[11.5rem]")}
              >
                <SelectValue placeholder={copy.filters.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{copy.status.all}</SelectItem>
                  {COMPLIANCE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {copy.status[status]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {statusFilter !== "all" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStatusFilterChange("all")}
                className="h-10 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-border dark:bg-card dark:text-muted-foreground"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">{copy.status.all}</span>
              </Button>
            )}
          </div>
        }
      />

      <UpdateComplianceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        type={type}
        vehicle={selectedVehicle}
        onSuccess={handleSheetSuccess}
      />
    </div>
  );
}
