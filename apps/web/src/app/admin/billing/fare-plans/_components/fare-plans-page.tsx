"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CalendarClock,
  CarFront,
  Clock,
  Coins,
  Gauge,
  Layers,
  MapPin,
  Milestone,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { CreateFarePlanSheet } from "./create-fare-plan-sheet";
import { FarePlanStats } from "./fare-plan-stats";
import { cn } from "@/lib/utils";

import { formatGlobalDate } from "@/lib/ethiopian-calendar";

function formatDate(value: string, locale: string) {
  return formatGlobalDate(value, locale);
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

const PRICING_MODEL_BADGE_CONFIG: Record<
  PricingModel,
  {
    icon: typeof Gauge;
    className: string;
  }
> = {
  distance_time: {
    icon: Gauge,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  distance: {
    icon: Milestone,
    className:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  },
  time: {
    icon: Clock,
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300",
  },
  flat: {
    icon: Coins,
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  },
  hourly: {
    icon: CalendarClock,
    className:
      "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
  },
};

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
        cellClassName: "text-slate-900 font-medium dark:text-foreground",
        cell: (farePlan) => (
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-900 dark:text-foreground">{farePlan.name}</p>
            {farePlan.description ? (
              <p className="line-clamp-1 text-xs text-slate-500 dark:text-muted-foreground">{farePlan.description}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "pricingModel",
        header: copy.columns.pricingModel,
        cell: (farePlan) => {
          const config = PRICING_MODEL_BADGE_CONFIG[farePlan.pricing_model];
          const ModelIcon = config?.icon ?? Gauge;
          return (
            <Badge
              variant="outline"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium shadow-none",
                config?.className ?? "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              <ModelIcon className="size-3 shrink-0" />
              {pricingModelLabel(farePlan.pricing_model)}
            </Badge>
          );
        },
      },
      {
        id: "scope",
        header: copy.columns.scope,
        cellClassName: "text-slate-600 dark:text-muted-foreground",
        cell: (farePlan) => (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-slate-50/80 px-2 py-0.5 text-slate-700 dark:border-border dark:bg-muted/50 dark:text-foreground">
              <CarFront className="size-3 text-slate-400" />
              {farePlan.vehicle_type?.name ?? copy.allVehicleTypes}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-slate-50/80 px-2 py-0.5 text-slate-700 dark:border-border dark:bg-muted/50 dark:text-foreground">
              <Layers className="size-3 text-slate-400" />
              {farePlan.vehicle_class?.name ?? copy.allVehicleClasses}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-slate-50/80 px-2 py-0.5 text-slate-700 dark:border-border dark:bg-muted/50 dark:text-foreground">
              <MapPin className="size-3 text-emerald-600 dark:text-emerald-400" />
              {farePlan.region?.name ?? copy.allRegions}
            </span>
          </div>
        ),
      },
      {
        id: "baseFare",
        header: copy.columns.baseFare,
        cellClassName: "text-slate-900 font-semibold tabular-nums dark:text-foreground",
        cell: (farePlan) => (
          <span className="font-semibold text-slate-800 dark:text-foreground">
            {formatMoney(farePlan.base_fare, farePlan.currency, locale)}
          </span>
        ),
      },
      {
        id: "priority",
        header: copy.columns.priority,
        cellClassName: "text-slate-600 tabular-nums dark:text-muted-foreground",
        cell: (farePlan) => (
          <Badge
            variant="outline"
            className="font-mono text-[11px] font-semibold border-slate-200 bg-slate-50/70 text-slate-600 dark:border-border dark:bg-muted/40 dark:text-muted-foreground"
          >
            Rank {farePlan.priority}
          </Badge>
        ),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (farePlan) =>
          farePlan.is_active ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              {copy.status.active}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-border dark:bg-muted dark:text-muted-foreground">
              <span className="size-1.5 rounded-full bg-slate-400" />
              {copy.status.inactive}
            </span>
          ),
      },
      {
        id: "created",
        header: copy.columns.created,
        cellClassName: "text-slate-500 text-xs dark:text-muted-foreground",
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
