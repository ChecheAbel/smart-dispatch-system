"use client";

import { useCallback, useMemo, useState } from "react";
import { Activity, ChevronDown, Download, Eye, FileSpreadsheet, FileText, Loader2, MoreHorizontal } from "lucide-react";
import type { User } from "@smart-dispatch/types";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { useAuth, useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminBadgeGoldClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import {
  exportDriverPerformanceExcel,
  exportDriverPerformancePdf,
} from "@/lib/driver-performance-export";
import { fetchAllUsers, fetchUsers } from "@/lib/user-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatMessage, getAdminDriversMessages } from "@/translations";
import { DriverDetailSheet } from "../../_components/driver-detail-sheet";
import { DriverRatingCell } from "../../_components/driver-rating";
import {
  formatDriverName,
  formatPercent,
} from "../../_components/driver-helpers";

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function DriverRowActions({
  user,
  viewLabel,
  menuLabel,
  onView,
}: {
  user: User;
  viewLabel: string;
  menuLabel: string;
  onView: (user: User) => void;
}) {
  const name = formatDriverName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(menuLabel, { name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onView(user)}>
            <Eye />
            {viewLabel}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DriverPerformancePage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDriversMessages(locale);
  const performanceCopy = copy.performance;
  const canRead = hasPermission(PERMISSIONS.drivers.read);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const openDetail = useCallback((user: User) => {
    setDetailUserId(user.id);
    setDetailOpen(true);
  }, []);

  const handleExport = useCallback(
    async (format: "excel" | "pdf") => {
      setExporting(true);
      try {
        const users = await fetchAllUsers({
          role_slug: "driver",
          account_activation: "activated",
        });

        if (users.length === 0) {
          throw new Error(performanceCopy.export.empty);
        }

        const payload = {
          users,
          title: performanceCopy.title,
          copy: performanceCopy.export,
          statusLabels: copy.status,
          assignmentLabels: copy.assignment,
          unratedLabel: copy.directory.ratingUnrated,
          generatedAt: new Date().toLocaleString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        if (format === "excel") {
          await exportDriverPerformanceExcel(payload);
        } else {
          await exportDriverPerformancePdf(payload);
        }

        showSuccessToast(performanceCopy.export.toast.success);
      } catch (error) {
        showErrorToast({
          title: performanceCopy.export.toast.failed.title,
          description:
            error instanceof Error ? error.message : performanceCopy.export.toast.failed.description,
        });
      } finally {
        setExporting(false);
      }
    },
    [copy.assignment, copy.directory.ratingUnrated, copy.status, locale, performanceCopy],
  );

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "name",
        header: performanceCopy.columns.name,
        cellClassName: "font-medium text-slate-800",
        cell: (user) => formatDriverName(user),
      },
      {
        id: "rating",
        header: performanceCopy.columns.rating,
        cell: (user) => (
          <DriverRatingCell
            rating={user.driver?.rating}
            unratedLabel={copy.directory.ratingUnrated}
            countTemplate={copy.directory.ratingCount}
          />
        ),
      },
      {
        id: "completed",
        header: performanceCopy.columns.completed,
        cellClassName: "tabular-nums text-slate-700",
        cell: (user) => dash(user.driver?.performance.trips_completed ?? 0),
      },
      {
        id: "completionRate",
        header: performanceCopy.columns.completionRate,
        cellClassName: "tabular-nums font-medium text-slate-800",
        cell: (user) => dash(formatPercent(user.driver?.performance.completion_rate)),
      },
      {
        id: "noShows",
        header: performanceCopy.columns.noShows,
        cellClassName: "tabular-nums text-slate-700",
        cell: (user) => dash(user.driver?.performance.trips_no_show ?? 0),
      },
      {
        id: "onTime",
        header: performanceCopy.columns.onTime,
        cellClassName: "tabular-nums text-slate-700",
        cell: (user) => dash(formatPercent(user.driver?.performance.on_time_rate)),
      },
      {
        id: "complaints",
        header: performanceCopy.columns.complaints,
        cellClassName: "tabular-nums text-slate-700",
        cell: (user) => dash(user.driver?.performance.complaints ?? 0),
      },
      {
        id: "attendance",
        header: performanceCopy.columns.attendance,
        cellClassName: "tabular-nums text-slate-700",
        cell: (user) => dash(formatPercent(user.driver?.performance.attendance_rate)),
      },
    ],
    [copy.directory.ratingCount, copy.directory.ratingUnrated, performanceCopy],
  );

  const loadDrivers = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchUsers({
        page,
        limit,
        search: search || undefined,
        role_slug: "driver",
        account_activation: "activated",
      }),
    [],
  );

  const renderRowActions = useCallback(
    (user: User, _context: DataTableRowContext<User>) => (
      <DriverRowActions
        user={user}
        viewLabel={copy.directory.actions.view}
        menuLabel={copy.directory.actions.menuLabel}
        onView={openDetail}
      />
    ),
    [copy.directory.actions.menuLabel, copy.directory.actions.view, openDetail],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{performanceCopy.eyebrow}</Badge>}
        title={performanceCopy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={performanceCopy.description}
        searchPlaceholder={performanceCopy.searchPlaceholder}
        itemLabel={performanceCopy.itemLabel}
        columns={columns}
        fetchData={loadDrivers}
        getRowKey={(user) => user.id}
        showIndexColumn
        renderRowActions={renderRowActions}
        actionsColumnHeader={copy.directory.columns.actions}
        minTableWidth="1180px"
        emptyIcon={Activity}
        emptyTitle={performanceCopy.empty.title}
        emptyDescription={performanceCopy.empty.description}
        emptySearchDescription={performanceCopy.empty.searchDescription}
        refreshDeps={[locale]}
        toolbarActions={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  disabled={exporting}
                  className={cn(adminPrimaryButtonClass, "shrink-0 shadow-sm")}
                />
              }
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {performanceCopy.export.button}
              <ChevronDown className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem disabled={exporting} onClick={() => void handleExport("excel")}>
                  <FileSpreadsheet />
                  {performanceCopy.export.excel}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={exporting} onClick={() => void handleExport("pdf")}>
                  <FileText />
                  {performanceCopy.export.pdf}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <DriverDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userId={detailUserId}
        locale={locale}
      />
    </div>
  );
}
