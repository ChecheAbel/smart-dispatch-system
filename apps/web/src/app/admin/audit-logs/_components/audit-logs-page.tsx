"use client";

import { useCallback, useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import type { AuditAction, AuditLog } from "@smart-dispatch/types";
import { DataTable, type DataTableFetchParams } from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { useAuth, useLocale } from "@/components/shared/providers";
import { fetchAuditLogs } from "@/lib/audit-log-api";
import { adminEyebrowClass, adminHeadingClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { getAdminAuditLogsMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { AuditLogRowActions, getAuditLogColumns } from "./audit-log-columns";
import { AuditLogDetailSheet } from "./audit-log-detail-sheet";
import { AuditLogFilterBar } from "./audit-log-filter-bar";
import { toDateKey, toEndOfDayIso, toStartOfDayIso } from "./audit-log-types";

export function AuditLogsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminAuditLogsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.audit_logs.read);

  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openDetail = useCallback((log: AuditLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  }, []);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const resetFilters = useCallback(() => {
    setModuleFilter("all");
    setActionFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
    bumpRefresh();
  }, [bumpRefresh]);

  const fetchAuditData = useCallback(
    async ({ page, limit, search }: DataTableFetchParams) => {
      return fetchAuditLogs({
        page,
        limit,
        search: search || undefined,
        module: moduleFilter === "all" ? undefined : moduleFilter,
        action: actionFilter === "all" ? undefined : (actionFilter as AuditAction),
        from: fromDate ? toStartOfDayIso(toDateKey(fromDate)) : undefined,
        to: toDate ? toEndOfDayIso(toDateKey(toDate)) : undefined,
      });
    },
    [moduleFilter, actionFilter, fromDate, toDate],
  );

  const columns = useMemo(
    () => getAuditLogColumns(copy, locale),
    [copy, locale],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <DataTable
        key={locale}
        eyebrow={
          <p className={cn(adminEyebrowClass, "text-xs")}>
            {copy.eyebrow}
          </p>
        }
        title={copy.title}
        titleClassName={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={fetchAuditData}
        getRowKey={(log) => log.id}
        emptyIcon={ScrollText}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[refreshKey, moduleFilter, actionFilter, fromDate, toDate]}
        renderRowActions={(log) => (
          <AuditLogRowActions
            log={log}
            label={copy.actions.view}
            onView={openDetail}
          />
        )}
        actionsColumnHeader={copy.columns.actions}
        minTableWidth="1080px"
        filterBar={
          <AuditLogFilterBar
            copy={copy}
            moduleFilter={moduleFilter}
            actionFilter={actionFilter}
            fromDate={fromDate}
            toDate={toDate}
            onModuleChange={(value) => {
              setModuleFilter(value);
              bumpRefresh();
            }}
            onActionChange={(value) => {
              setActionFilter(value);
              bumpRefresh();
            }}
            onFromDateChange={(date) => {
              setFromDate(date);
              bumpRefresh();
            }}
            onToDateChange={(date) => {
              setToDate(date);
              bumpRefresh();
            }}
            onReset={resetFilters}
          />
        }
      />

      <AuditLogDetailSheet
        log={selectedLog}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        copy={copy}
      />
    </div>
  );
}
