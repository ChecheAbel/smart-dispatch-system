"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarClock,
  Eye,
  FileText,
  Layers,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Contract, ContractStatus } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
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
import {
  adminEyebrowClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { deleteContract, fetchContracts } from "@/lib/contract-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminContractsMessages } from "@/translations";
import { CreateContractSheet } from "@/app/admin/billing/contracts/_components/create-contract-sheet";
import { ContractStats } from "./contract-stats";
import { formatGlobalDate } from "@/lib/ethiopian-calendar";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ContractStatus,
  {
    badgeClass: string;
    dotClass: string;
  }
> = {
  active: {
    badgeClass:
      "border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300",
    dotClass: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
  },
  draft: {
    badgeClass:
      "border-slate-200 bg-slate-50/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300",
    dotClass: "bg-slate-400",
  },
  expired: {
    badgeClass:
      "border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300",
    dotClass: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]",
  },
  cancelled: {
    badgeClass:
      "border-red-200/90 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300",
    dotClass: "bg-red-500",
  },
};

function formatDate(value: string, locale: string) {
  return formatGlobalDate(`${value}T12:00:00.000Z`, locale);
}

function ContractRowActions({
  contract,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  contract: Contract;
  labels: ReturnType<typeof getAdminContractsMessages>["actions"];
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
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
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] dark:hover:bg-accent dark:hover:text-foreground"
            aria-label={formatMessage(labels.menuLabel, { name: contract.title })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            render={<Link href={`/admin/billing/contracts/${contract.id}`} />}
          >
            <Eye className="size-4 text-slate-500" />
            <span>{labels.view}</span>
          </DropdownMenuItem>

          {canEdit ? (
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onEdit(contract)}
            >
              <Pencil className="size-4 text-slate-500" />
              <span>{labels.edit}</span>
            </DropdownMenuItem>
          ) : null}

          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}

          {canDelete ? (
            <DropdownMenuItem
              variant="destructive"
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onDelete(contract)}
            >
              <Trash2 className="size-4 text-red-600 dark:text-red-400" />
              <span>{labels.delete}</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContractsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminContractsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.contracts.read);
  const canWrite = hasPermission(PERMISSIONS.contracts.write);
  const canDelete = hasPermission(PERMISSIONS.contracts.delete);

  const isAm = locale === "am";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | "">("");

  const statusFilterItems: Array<{ value: ContractStatus | ""; label: string }> = useMemo(
    () => [
      { value: "", label: isAm ? "ሁሉም ውሎች" : "All Contracts" },
      { value: "active", label: copy.status.active },
      { value: "draft", label: copy.status.draft },
      { value: "expired", label: copy.status.expired },
      { value: "cancelled", label: copy.status.cancelled },
    ],
    [copy.status, isAm],
  );

  const openCreateSheet = useCallback(() => {
    setSheetMode("create");
    setEditingContractId(null);
    setSheetOpen(true);
  }, []);

  const openEditSheet = useCallback((contract: Contract) => {
    setSheetMode("edit");
    setEditingContractId(contract.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((contract: Contract) => {
    setDeletingContract(contract);
    setDeleteOpen(true);
  }, []);

  const columns = useMemo<DataTableColumn<Contract>[]>(
    () => [
      {
        id: "reference",
        header: copy.columns.reference,
        cellClassName: "font-semibold text-slate-800 dark:text-foreground",
        cell: (contract) => (
          <Link
            href={`/admin/billing/contracts/${contract.id}`}
            className="group inline-flex items-center gap-2 font-mono text-xs font-bold text-slate-900 hover:text-[var(--brand-primary)] dark:text-foreground dark:hover:text-[var(--brand-accent)]"
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-[var(--brand-primary)] group-hover:text-white dark:bg-muted dark:text-muted-foreground dark:group-hover:bg-[var(--brand-accent)] dark:group-hover:text-[#171a1f]">
              <FileText className="size-3.5" />
            </div>
            <span className="underline-offset-2 group-hover:underline">
              {contract.reference_number}
            </span>
          </Link>
        ),
      },
      {
        id: "title",
        header: copy.columns.title,
        cell: (contract) => (
          <div className="space-y-0.5">
            <Link
              href={`/admin/billing/contracts/${contract.id}`}
              className="font-bold text-slate-900 hover:text-[var(--brand-primary)] dark:text-foreground dark:hover:text-[var(--brand-accent)] line-clamp-1"
            >
              {contract.title}
            </Link>
            {contract.notes ? (
              <p className="text-xs text-slate-500 dark:text-muted-foreground line-clamp-1">
                {contract.notes}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (contract) => {
          const config = STATUS_CONFIG[contract.status];
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                config.badgeClass,
              )}
            >
              <span className={cn("size-1.5 rounded-full", config.dotClass)} />
              {copy.status[contract.status]}
            </span>
          );
        },
      },
      {
        id: "billing",
        header: copy.detail.billingInterval,
        cellClassName: "text-slate-600 dark:text-muted-foreground text-xs font-medium",
        cell: (contract) => (
          <div className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 text-slate-400 shrink-0" />
            <span>{copy.billingIntervals[contract.billing_interval]}</span>
          </div>
        ),
      },
      {
        id: "scope",
        header: isAm ? "የተሸፈነ ወሰን" : "Operational Scope",
        cell: (contract) => {
          const regionCount = contract.region_ids?.length ?? 0;
          const vehicleTypeCount = contract.vehicle_type_ids?.length ?? 0;

          return (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-slate-50/80 px-2 py-0.5 text-slate-700 dark:border-border dark:bg-muted/50 dark:text-foreground">
                <MapPin className="size-3 text-emerald-600 dark:text-emerald-400" />
                {isAm ? `${regionCount} ክልሎች` : `${regionCount} ${regionCount === 1 ? "Region" : "Regions"}`}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-slate-50/80 px-2 py-0.5 text-slate-700 dark:border-border dark:bg-muted/50 dark:text-foreground">
                <Layers className="size-3 text-slate-400" />
                {isAm ? `${vehicleTypeCount} ተሽከርካሪዎች` : `${vehicleTypeCount} Types`}
              </span>
            </div>
          );
        },
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500 text-xs",
        cell: (contract) => (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-muted-foreground">
            <Calendar className="size-3.5 text-slate-400 shrink-0" />
            <span>{formatDate(contract.created_at.slice(0, 10), locale)}</span>
          </div>
        ),
      },
    ],
    [copy, isAm, locale],
  );

  const loadContracts = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchContracts({
        page,
        limit,
        search: search || undefined,
        status: selectedStatus || undefined,
        locale,
      }),
    [locale, selectedStatus],
  );

  const renderRowActions = useCallback(
    (contract: Contract, _context: DataTableRowContext<Contract>) => {
      if (!canWrite && !canDelete) return null;

      return (
        <ContractRowActions
          contract={contract}
          labels={copy.actions}
          onEdit={openEditSheet}
          onDelete={openDeleteModal}
          canEdit={canWrite}
          canDelete={canDelete}
        />
      );
    },
    [canDelete, canWrite, copy.actions, openDeleteModal, openEditSheet],
  );

  async function handleDelete() {
    if (!deletingContract) return;

    try {
      await deleteContract(deletingContract.id);
      showSuccessToast({
        title: copy.toast.deleteSuccess.title,
        description: formatMessage(copy.toast.deleteSuccess.description, {
          title: deletingContract.title,
        }),
      });
      setDeleteOpen(false);
      setDeletingContract(null);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      showErrorToast({
        title: copy.toast.deleteFailed.title,
        description: error instanceof Error ? error.message : copy.toast.deleteFailed.description,
      });
    }
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const filterBar = (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100/90 p-1 dark:bg-muted/60">
      {statusFilterItems.map((item) => {
        const isActive = selectedStatus === item.value;
        return (
          <button
            key={item.value || "all"}
            type="button"
            onClick={() => setSelectedStatus(item.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              isActive
                ? "bg-white text-[var(--brand-primary)] shadow-sm dark:bg-card dark:text-foreground"
                : "text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <ContractStats
        locale={locale}
        refreshKey={refreshKey}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />

      <DataTable
        key={`${locale}-${refreshKey}`}
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>}
        title={copy.title}
        titleClassName="text-2xl font-black tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadContracts}
        getRowKey={(contract) => contract.id}
        showIndexColumn
        refreshDeps={[selectedStatus, locale, refreshKey]}
        filterBar={filterBar}
        actionsColumnHeader={copy.columns.actions}
        renderRowActions={canWrite || canDelete ? renderRowActions : undefined}
        toolbarActions={
          canWrite ? (
            <Button
              type="button"
              className={cn(adminPrimaryButtonClass, "h-9 px-3.5 text-xs font-semibold shadow-sm")}
              onClick={openCreateSheet}
            >
              <Plus className="size-4 mr-1" />
              {copy.newContract}
            </Button>
          ) : null
        }
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        emptyIcon={FileText}
      />

      <CreateContractSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        contractId={editingContractId}
        onSuccess={() => setRefreshKey((current) => current + 1)}
      />

      <DeleteConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={copy.deleteModal.title}
        description={formatMessage(copy.deleteModal.description, {
          title: deletingContract?.title ?? "",
        })}
        confirmLabel={copy.deleteModal.confirm}
        cancelLabel={copy.deleteModal.cancel}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
