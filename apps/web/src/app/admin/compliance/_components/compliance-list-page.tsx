"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Eye, MoreHorizontal, Pencil, ShieldCheck } from "lucide-react";
import type { Vehicle, VehicleComplianceStatus } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminBadgeGoldClass } from "@/lib/admin-theme";
import { canReadCompliance, canWriteCompliance } from "@/lib/permissions";
import { fetchVehicles } from "@/lib/vehicle-api";
import {
  expiryToneClass,
  formatComplianceDate,
  getExpiryTone,
} from "@/lib/vehicle-compliance";
import { formatMessage, getAdminComplianceMessages } from "@/translations";
import { UpdateComplianceSheet } from "./update-compliance-sheet";

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
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onView(vehicle)}>
            <Eye />
            {labels.view}
          </DropdownMenuItem>
          {canWrite ? (
            <DropdownMenuItem onClick={() => onEdit(vehicle)}>
              <Pencil />
              {editLabel}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ComplianceListPage({ type }: ComplianceListPageProps) {
  const router = useRouter();
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
    }
  }, [searchParams]);

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
            className="text-left font-medium text-[#1C3A34] hover:underline"
          >
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
          cellClassName: "text-slate-600",
          cell: (vehicle) => vehicle.insurance_provider || "—",
        },
        {
          id: "policy",
          header: copy.columns.policyNumber,
          cellClassName: "font-mono text-xs text-slate-600",
          cell: (vehicle) => vehicle.insurance_policy_number || "—",
        },
        {
          id: "issued",
          header: copy.columns.issuedAt,
          cellClassName: "text-slate-500",
          cell: (vehicle) => formatComplianceDate(vehicle.insurance_issued_at, locale) ?? "—",
        },
      );
    } else {
      baseColumns.push(
        {
          id: "center",
          header: copy.columns.center,
          cellClassName: "text-slate-600",
          cell: (vehicle) => vehicle.inspection_center || "—",
        },
        {
          id: "certificate",
          header: copy.columns.certificateNumber,
          cellClassName: "font-mono text-xs text-slate-600",
          cell: (vehicle) => vehicle.inspection_certificate_number || "—",
        },
        {
          id: "performed",
          header: copy.columns.performedAt,
          cellClassName: "text-slate-500",
          cell: (vehicle) => formatComplianceDate(vehicle.inspection_performed_at, locale) ?? "—",
        },
      );
    }

    baseColumns.push(
      {
        id: "expires",
        header: copy.columns.expiresAt,
        cellClassName: "text-slate-700",
        cell: (vehicle) => {
          const value = vehicle[expiryField];
          return formatComplianceDate(value, locale) ?? "—";
        },
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (vehicle) => {
          const tone = getExpiryTone(vehicle[expiryField]);
          const statusKey = tone === "dueSoon" ? "due_soon" : tone === "notSet" ? "not_set" : tone;
          return (
            <Badge variant="outline" className={expiryToneClass(tone)}>
              {copy.status[statusKey as VehicleComplianceStatus]}
            </Badge>
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
    <>
      <DataTable
        key={`${locale}-${type}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
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
          <Select
            items={[
              { label: copy.status.all, value: "all" },
              ...COMPLIANCE_STATUSES.map((status) => ({
                label: copy.status[status],
                value: status,
              })),
            ]}
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value ?? "all")}
          >
            <SelectTrigger
              id="compliance-status-filter"
              aria-label={copy.filters.status}
              className="h-10 w-full min-w-[11rem] rounded-lg border-slate-200 bg-white shadow-sm sm:w-[11rem]"
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
        }
      />

      <UpdateComplianceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        type={type}
        vehicle={selectedVehicle}
        onSuccess={handleSheetSuccess}
      />
    </>
  );
}
