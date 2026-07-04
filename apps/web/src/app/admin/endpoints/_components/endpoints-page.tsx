"use client";

import { useCallback, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Route, Trash2 } from "lucide-react";
import type { Endpoint, HttpMethod } from "@smart-dispatch/types";
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
  getAdminEndpointsMessages,
  type AdminEndpointsMessages,
} from "@/translations";
import { deleteEndpoint, fetchEndpoints } from "@/lib/endpoint-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { CreateEndpointSheet } from "./create-endpoint-sheet";
import { EndpointStats } from "./endpoint-stats";
import { cn } from "@/lib/utils";

function methodBadgeClass(method: HttpMethod) {
  switch (method) {
    case "GET":
      return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50";
    case "POST":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
    case "PUT":
      return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50";
    case "PATCH":
      return "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50";
    case "DELETE":
      return "border-red-200 bg-red-50 text-red-700 hover:bg-red-50";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }
}

function EndpointRowActions({
  endpoint,
  labels,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  endpoint: Endpoint;
  labels: AdminEndpointsMessages["actions"];
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (endpoint: Endpoint) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const itemLabel = `${endpoint.method} ${endpoint.path}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(labels.menuLabel, { name: itemLabel })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          {canEdit ? (
            <DropdownMenuItem onClick={() => onEdit(endpoint)}>
              <Pencil />
              {labels.edit}
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(endpoint)}>
              <Trash2 />
              {labels.delete}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EndpointsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminEndpointsMessages(locale);
  const canWrite = hasPermission(PERMISSIONS.endpoints.write);
  const canDelete = hasPermission(PERMISSIONS.endpoints.delete);
  const showRowActions = canWrite || canDelete;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingEndpointId, setEditingEndpointId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEndpoint, setDeletingEndpoint] = useState<Endpoint | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingEndpointId(null);
    setSheetOpen(true);
  }

  const openEditSheet = useCallback((endpoint: Endpoint) => {
    setSheetMode("edit");
    setEditingEndpointId(endpoint.id);
    setSheetOpen(true);
  }, []);

  const openDeleteModal = useCallback((endpoint: Endpoint) => {
    setDeletingEndpoint(endpoint);
    setDeleteOpen(true);
  }, []);

  const endpointColumns = useMemo<DataTableColumn<Endpoint>[]>(
    () => [
      {
        id: "method",
        header: copy.columns.method,
        cell: (endpoint) => (
          <Badge className={cn("font-mono text-[11px] font-semibold", methodBadgeClass(endpoint.method))}>
            {endpoint.method}
          </Badge>
        ),
      },
      {
        id: "path",
        header: copy.columns.path,
        cellClassName: `font-medium ${adminHeadingClass}`,
        cell: (endpoint) => endpoint.path,
      },
      {
        id: "slug",
        header: copy.columns.slug,
        cellClassName: "font-mono text-xs text-slate-500",
        cell: (endpoint) => endpoint.slug,
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (endpoint) =>
          endpoint.is_active ? (
            <Badge className={adminBadgeSuccessClass}>{copy.status.active}</Badge>
          ) : (
            <Badge variant="outline" className="border-slate-200 text-slate-500">
              {copy.status.inactive}
            </Badge>
          ),
      },
    ],
    [copy],
  );

  const loadEndpoints = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchEndpoints({
        page,
        limit,
        search: search || undefined,
      }),
    [],
  );

  const renderRowActions = useCallback(
    (endpoint: Endpoint, _context: DataTableRowContext<Endpoint>) => (
      <EndpointRowActions
        endpoint={endpoint}
        labels={copy.actions}
        onEdit={openEditSheet}
        onDelete={openDeleteModal}
        canEdit={canWrite}
        canDelete={canDelete}
      />
    ),
    [copy.actions, openEditSheet, openDeleteModal, canWrite, canDelete],
  );

  return (
    <div className="space-y-6">
      <EndpointStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={endpointColumns}
        fetchData={loadEndpoints}
        getRowKey={(endpoint) => endpoint.id}
        showIndexColumn
        renderRowActions={showRowActions ? renderRowActions : undefined}
        actionsColumnHeader={copy.columns.actions}
        toolbarActions={
          canWrite ? (
            <Button
              type="button"
              onClick={openCreateSheet}
              className={adminPrimaryButtonClass}
            >
              <Plus className="size-4" />
              {copy.newEndpoint}
            </Button>
          ) : undefined
        }
        minTableWidth="720px"
        emptyIcon={Route}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      {canWrite ? (
        <CreateEndpointSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          endpointId={editingEndpointId}
          onSuccess={() => setRefreshKey((current) => current + 1)}
        />
      ) : null}

      {canDelete ? (
        <DeleteConfirmModal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          itemName={
            deletingEndpoint
              ? `${deletingEndpoint.method} ${deletingEndpoint.path}`
              : undefined
          }
          onConfirm={async () => {
            if (!deletingEndpoint) {
              return;
            }

            try {
              await deleteEndpoint(deletingEndpoint.id);
              showSuccessToast({
                title: copy.toast.deleteSuccess.title,
                description: formatMessage(copy.toast.deleteSuccess.description, {
                  name: `${deletingEndpoint.method} ${deletingEndpoint.path}`,
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
