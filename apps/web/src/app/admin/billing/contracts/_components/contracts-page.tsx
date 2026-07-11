"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, FileText, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { deleteContract, fetchContracts } from "@/lib/contract-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminContractsMessages } from "@/translations";
import { CreateContractSheet } from "@/app/admin/billing/contracts/_components/create-contract-sheet";
import { ContractStats } from "./contract-stats";

const STATUS_BADGE_CLASS: Record<ContractStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  active: adminBadgeSuccessClass,
  expired: "border-amber-200 bg-amber-50 text-amber-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: string, locale: string) {
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(labels.menuLabel, { name: contract.title })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={`/admin/billing/contracts/${contract.id}`} />}>
            <Eye />
            {labels.view}
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(contract)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(contract)}>
              <Trash2 />
              {labels.delete}
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        cellClassName: "font-semibold text-slate-800",
        cell: (contract) => contract.reference_number,
      },
      {
        id: "title",
        header: copy.columns.title,
        cell: (contract) => (
          <Link
            href={`/admin/billing/contracts/${contract.id}`}
            className="font-medium text-[#1C3A34] hover:underline"
          >
            {contract.title}
          </Link>
        ),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (contract) => (
          <Badge className={STATUS_BADGE_CLASS[contract.status]}>{copy.status[contract.status]}</Badge>
        ),
      },
      {
        id: "billing",
        header: copy.detail.billingInterval,
        cellClassName: "text-slate-600",
        cell: (contract) => copy.billingIntervals[contract.billing_interval],
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500",
        cell: (contract) => formatDate(contract.created_at.slice(0, 10), locale),
      },
    ],
    [copy, locale],
  );

  const loadContracts = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchContracts({
        page,
        limit,
        search: search || undefined,
        locale,
      }),
    [locale],
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

  return (
    <div className="space-y-6">
      <ContractStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={`${locale}-${refreshKey}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadContracts}
        getRowKey={(contract) => contract.id}
        showIndexColumn
        renderRowActions={canWrite || canDelete ? renderRowActions : undefined}
        toolbarActions={
          canWrite ? (
            <Button type="button" className={adminPrimaryButtonClass} onClick={openCreateSheet}>
              <Plus className="size-4" />
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
