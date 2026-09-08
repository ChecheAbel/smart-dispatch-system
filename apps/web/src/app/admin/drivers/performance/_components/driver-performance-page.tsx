"use client";

import { useCallback, useState } from "react";
import { Activity, ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { User } from "@smart-dispatch/types";
import {
  DataTable,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { useAuth, useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminEyebrowClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import {
  exportDriverPerformanceExcel,
  exportDriverPerformancePdf,
} from "@/lib/driver-performance-export";
import { fetchAllUsers, fetchUsers } from "@/lib/user-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getAdminDriversMessages } from "@/translations";
import { DriverDetailSheet } from "../../_components/driver-detail-sheet";
import { usePerformanceColumns } from "./performance-columns";

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

  const { columns, renderRowActions } = usePerformanceColumns({
    copy,
    openDetail,
  });

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

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <DataTable
        key={locale}
        eyebrow={<p className={cn(adminEyebrowClass, "text-xs")}>{performanceCopy.eyebrow}</p>}
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
