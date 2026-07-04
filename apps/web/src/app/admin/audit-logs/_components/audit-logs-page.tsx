"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Eye, MoreHorizontal, ScrollText, X } from "lucide-react";
import type { AuditAction, AuditLog } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchAuditLogs } from "@/lib/audit-log-api";
import { adminBadgeGoldClass, adminFilterLabelClass, adminHeadingClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { getAdminAuditLogsMessages } from "@/translations";
import { cn } from "@/lib/utils";

const MODULE_OPTIONS = ["users", "roles", "menus", "notifications", "auth", "audit_logs", "vehicle_types", "vehicles", "regions", "locations"] as const;
const ACTION_OPTIONS: AuditAction[] = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "assign",
  "revoke",
  "test",
];

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toStartOfDayIso(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}

function toEndOfDayIso(date: string) {
  const value = new Date(`${date}T23:59:59.999`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function actionBadgeClass(action: AuditAction) {
  switch (action) {
    case "create":
    case "login":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "delete":
    case "revoke":
      return "border-red-200 bg-red-50 text-red-800";
    case "update":
    case "assign":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "test":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function AuditLogRowActions({
  log,
  label,
  onView,
}: {
  log: AuditLog;
  label: string;
  onView: (log: AuditLog) => void;
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
            aria-label={label}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onView(log)}>
            <Eye />
            {label}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatAuditSummary(
  log: AuditLog,
  copy: ReturnType<typeof getAdminAuditLogsMessages>,
) {
  if (log.summary && !/^(GET|POST|PUT|PATCH|DELETE)\s\/api\//.test(log.summary)) {
    return log.summary;
  }

  if (log.request_path?.includes("/roles") && log.module === "users") {
    const target = log.entity_label ? ` (${log.entity_label})` : "";
    if (log.action === "delete") {
      return `Removed role from user${target}`;
    }
    if (log.action === "create") {
      return `Assigned role to user${target}`;
    }
    return `Updated user roles${target}`;
  }

  const moduleLabel = copy.moduleLabels[log.module as keyof typeof copy.moduleLabels] ?? log.module;
  const actionLabel = copy.actionLabels[log.action];
  const target = log.entity_label ? ` (${log.entity_label})` : "";

  return `${actionLabel} — ${moduleLabel}${target}`;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 break-words">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

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

  const clearDateFilters = useCallback(() => {
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

  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        id: "time",
        header: copy.columns.time,
        cellClassName: "text-slate-500 whitespace-nowrap",
        cell: (log) => formatDateTime(log.created_at, locale),
      },
      {
        id: "actor",
        header: copy.columns.actor,
        cell: (log) => (
          <div className="min-w-0">
            <p className="truncate text-slate-700">
              {log.actor_name ?? copy.detail.systemActor}
            </p>
            <p className="truncate text-xs text-slate-500">{log.actor_email ?? "—"}</p>
          </div>
        ),
      },
      {
        id: "action",
        header: copy.columns.action,
        cell: (log) => (
          <Badge variant="outline" className={cn("text-xs capitalize", actionBadgeClass(log.action))}>
            {copy.actionLabels[log.action]}
          </Badge>
        ),
      },
      {
        id: "module",
        header: copy.columns.module,
        cell: (log) => (
          <Badge variant="outline" className={cn("text-xs", adminBadgeGoldClass)}>
            {copy.moduleLabels[log.module as keyof typeof copy.moduleLabels] ?? log.module}
          </Badge>
        ),
      },
      {
        id: "summary",
        header: copy.columns.summary,
        cellClassName: "max-w-md text-slate-600",
        cell: (log) => <span className="line-clamp-2">{formatAuditSummary(log, copy)}</span>,
      },
      {
        id: "target",
        header: copy.columns.target,
        cellClassName: "text-slate-500",
        cell: (log) => log.entity_label ?? log.entity_id ?? "—",
      },
    ],
    [copy, locale],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}
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
          <AuditLogRowActions log={log} label={copy.actions.view} onView={openDetail} />
        )}
        actionsColumnHeader={copy.columns.actions}
        minTableWidth="1080px"
        filterBar={
          <div
            className={cn(
              "grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:items-start",
              fromDate || toDate
                ? "lg:grid-cols-[repeat(5,minmax(0,1fr))]"
                : "lg:grid-cols-[repeat(4,minmax(0,1fr))]",
            )}
          >
            <div className="min-w-0 space-y-2">
              <Label htmlFor="audit-module-filter" className={adminFilterLabelClass}>
                {copy.filters.module}
              </Label>
              <Select
                items={[
                  { label: copy.filters.moduleAll, value: "all" },
                  ...MODULE_OPTIONS.map((module) => ({
                    label: copy.moduleLabels[module] ?? module,
                    value: module,
                  })),
                ]}
                value={moduleFilter}
                onValueChange={(value) => {
                  setModuleFilter(value ?? "all");
                  bumpRefresh();
                }}
              >
                <SelectTrigger
                  id="audit-module-filter"
                  className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
                >
                  <SelectValue placeholder={copy.filters.module} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.filters.moduleAll}</SelectItem>
                    {MODULE_OPTIONS.map((module) => (
                      <SelectItem key={module} value={module}>
                        {copy.moduleLabels[module] ?? module}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="audit-action-filter" className={adminFilterLabelClass}>
                {copy.filters.action}
              </Label>
              <Select
                items={[
                  { label: copy.filters.actionAll, value: "all" },
                  ...ACTION_OPTIONS.map((action) => ({
                    label: copy.actionLabels[action],
                    value: action,
                  })),
                ]}
                value={actionFilter}
                onValueChange={(value) => {
                  setActionFilter(value ?? "all");
                  bumpRefresh();
                }}
              >
                <SelectTrigger
                  id="audit-action-filter"
                  className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
                >
                  <SelectValue placeholder={copy.filters.action} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.filters.actionAll}</SelectItem>
                    {ACTION_OPTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {copy.actionLabels[action]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <AdminDatePicker
              id="audit-from-date"
              className="min-w-0"
              label={copy.filters.dateFrom}
              placeholder={copy.filters.pickDate}
              clearLabel={copy.filters.clearDate}
              todayLabel={copy.filters.today}
              value={fromDate}
              maxDate={toDate}
              onChange={(date) => {
                setFromDate(date);
                bumpRefresh();
              }}
            />

            <AdminDatePicker
              id="audit-to-date"
              className="min-w-0"
              label={copy.filters.dateTo}
              placeholder={copy.filters.pickDate}
              clearLabel={copy.filters.clearDate}
              todayLabel={copy.filters.today}
              value={toDate}
              minDate={fromDate}
              onChange={(date) => {
                setToDate(date);
                bumpRefresh();
              }}
            />

            {fromDate || toDate ? (
              <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
                <span className={cn(adminFilterLabelClass, "invisible block select-none")} aria-hidden>
                  {copy.filters.clearDates}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearDateFilters}
                  className="h-10 w-full gap-2 border-slate-200 bg-white text-slate-600 shadow-sm"
                >
                  <X className="size-4" />
                  {copy.filters.clearDates}
                </Button>
              </div>
            ) : null}
          </div>
        }
      />

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{copy.detail.title}</SheetTitle>
            <SheetDescription>{copy.detail.description}</SheetDescription>
          </SheetHeader>

          {selectedLog ? (
            <div className="space-y-5 px-4 pb-4">
              <DetailField
                label={copy.detail.actor}
                value={
                  selectedLog.actor_email
                    ? `${selectedLog.actor_name ?? copy.detail.systemActor} (${selectedLog.actor_email})`
                    : copy.detail.systemActor
                }
              />
              <DetailField label={copy.detail.action} value={copy.actionLabels[selectedLog.action]} />
              <DetailField
                label={copy.detail.module}
                value={copy.moduleLabels[selectedLog.module as keyof typeof copy.moduleLabels] ?? selectedLog.module}
              />
              <DetailField
                label={copy.detail.target}
                value={selectedLog.entity_label ?? selectedLog.entity_id}
              />
              <DetailField label={copy.detail.summary} value={formatAuditSummary(selectedLog, copy)} />
              <DetailField
                label={copy.detail.request}
                value={
                  selectedLog.request_method && selectedLog.request_path
                    ? `${selectedLog.request_method} ${selectedLog.request_path}`
                    : selectedLog.request_path
                }
              />
              <DetailField label={copy.detail.ipAddress} value={selectedLog.ip_address} />
              <DetailField label={copy.detail.userAgent} value={selectedLog.user_agent} />
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {copy.detail.metadata}
                </p>
                <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
              {copy.detail.close}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
