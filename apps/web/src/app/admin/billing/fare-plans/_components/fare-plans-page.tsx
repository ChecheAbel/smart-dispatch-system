"use client";

import { useCallback, useMemo, useState } from "react";
import { Coins, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { FarePlan, PricingModel } from "@smart-dispatch/types";
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
import {
  formatMessage,
  getAdminFarePlansMessages,
  type AdminFarePlansMessages,
} from "@/translations";
import { deleteFarePlan, fetchFarePlans } from "@/lib/fare-plan-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateFarePlanSheet } from "./create-fare-plan-sheet";
import { FarePlanStats } from "./fare-plan-stats";

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function FarePlanRowActions({
  farePlan,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  farePlan: FarePlan;
  labels: AdminFarePlansMessages["actions"];
  onEdit: (farePlan: FarePlan) => void;
  onDelete: (farePlan: FarePlan) => void;
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
            aria-label={formatMessage(labels.menuLabel, { name: farePlan.name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(farePlan)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(farePlan)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FarePlansPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminFarePlansMessages(locale);
  const canRead = hasPermission(PERMISSIONS.fare_plans.read);
  const canWrite = hasPermission(PERMISSIONS.fare_plans.write);
  const canDelete = hasPermission(PERMISSIONS.fare_plans.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingFarePlanId, setEditingFarePlanId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingFarePlan, setDeletingFarePlan] = useState<FarePlan | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const pricingModelLabel = useCallback(
    (model: PricingModel) => copy.pricingModels[model],
    [copy.pricingModels],
  );

  function openCreateSheet() {
    setSheetMode("create");
    setEditingFarePlanId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((farePlan: FarePlan) => {
    setSheetMode("edit");
    setEditingFarePlanId(farePlan.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((farePlan: FarePlan) => {
    setDeletingFarePlan(farePlan);
    setDeleteOpen(true);
  }, []);

  const farePlanColumns = useMemo<DataTableColumn<FarePlan>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "text-slate-700",
        cell: (farePlan) => farePlan.name,
      },
      {
        id: "pricingModel",
        header: copy.columns.pricingModel,
        cell: (farePlan) => (
          <Badge variant="outline">{pricingModelLabel(farePlan.pricing_model)}</Badge>
        ),
      },
      {
        id: "scope",
        header: copy.columns.scope,
        cellClassName: "text-slate-500",
        cell: (farePlan) => (
          <span className="text-sm">
            {farePlan.vehicle_type?.name ?? copy.allVehicleTypes}
            <span className="px-1 text-slate-300">·</span>
            {farePlan.region?.name ?? copy.allRegions}
          </span>
        ),
      },
      {
        id: "baseFare",
        header: copy.columns.baseFare,
        cellClassName: "text-slate-700 tabular-nums",
        cell: (farePlan) => formatMoney(farePlan.base_fare, farePlan.currency, locale),
      },
      {
        id: "priority",
        header: copy.columns.priority,
        cellClassName: "text-slate-500 tabular-nums",
        cell: (farePlan) => farePlan.priority,
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (farePlan) =>
          farePlan.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline">{copy.status.inactive}</Badge>
          ),
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500",
        cell: (farePlan) => formatDate(farePlan.created_at, locale),
      },
    ],
    [copy, locale, pricingModelLabel],
  );

  const loadFarePlans = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchFarePlans({
        page,
        limit,
        search: search || undefined,
        locale,
      }),
    [locale],
  );

  const renderRowActions = useCallback(
    (farePlan: FarePlan, _context: DataTableRowContext<FarePlan>) => {
      if (!canWrite && !canDelete) {
        return null;
      }

      return (
        <FarePlanRowActions
          farePlan={farePlan}
          labels={copy.actions}
          onEdit={openEditSheet}
          onDelete={openDeleteModal}
          canEdit={canWrite}
          canDelete={canDelete}
        />
      );
    },
    [copy.actions, openEditSheet, openDeleteModal, canWrite, canDelete],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <FarePlanStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={farePlanColumns}
        fetchData={loadFarePlans}
        getRowKey={(farePlan) => farePlan.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button type="button" onClick={openCreateSheet} className={adminPrimaryButtonClass}>
              <Plus className="size-4" />
              {copy.newFarePlan}
            </Button>
          ) : undefined
        }
        minTableWidth="980px"
        emptyIcon={Coins}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateFarePlanSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          farePlanId={editingFarePlanId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={deletingFarePlan?.name}
          onConfirm={async () => {
            if (!deletingFarePlan) {
              return;
            }

            try {
              await deleteFarePlan(deletingFarePlan.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: deletingFarePlan.name,
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
