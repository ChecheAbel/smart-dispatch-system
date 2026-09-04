"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  Layers,
  Mail,
  MinusCircle,
  RotateCcw,
  ScrollText,
  SlidersHorizontal,
  Smartphone,
  X,
  XCircle,
} from "lucide-react";
import type {
  NotificationDeliveryLog,
  NotificationDeliveryStatus,
  NotificationModule,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { fetchNotificationDeliveryLogs } from "@/lib/notification-delivery-log-api";
import {
  adminBadgeGoldClass,
  adminFilterLabelClass,
  adminHeadingClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getAdminNotificationDeliveryLogsMessages,
  getAdminNotificationTemplatesMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatEthiopianDate, formatEthiopianTime } from "@/lib/ethiopian-calendar";

type DeliveryLogsCopy = ReturnType<typeof getAdminNotificationDeliveryLogsMessages>;
type TemplatesCopy = ReturnType<typeof getAdminNotificationTemplatesMessages>;

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (locale === "am") {
    return `${formatEthiopianDate(date, "am")} (${formatEthiopianTime(date, "am")})`;
  }
  return date.toLocaleString(locale, {
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

function ChannelIcon({
  channel,
  className,
}: {
  channel: NotificationDeliveryLog["channel"];
  className?: string;
}) {
  switch (channel) {
    case "email":
      return <Mail className={cn("size-3.5", className)} />;
    case "sms":
      return <Smartphone className={cn("size-3.5", className)} />;
    case "push":
      return <Bell className={cn("size-3.5", className)} />;
  }
}

function StatusBadge({
  status,
  copy,
}: {
  status: NotificationDeliveryStatus;
  copy: DeliveryLogsCopy;
}) {
  switch (status) {
    case "sent":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {copy.statusLabels.sent}
        </span>
      );
    case "skipped":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
          <MinusCircle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          {copy.statusLabels.skipped}
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300">
          <XCircle className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
          {copy.statusLabels.failed}
        </span>
      );
  }
}

function getEventTitle(
  log: NotificationDeliveryLog,
  templatesCopy: TemplatesCopy,
  deliveryLogsCopy: DeliveryLogsCopy,
) {
  const eventLabel =
    deliveryLogsCopy.eventLabels[log.event as keyof typeof deliveryLogsCopy.eventLabels];
  if (eventLabel) {
    return eventLabel;
  }

  const events =
    log.module === "system"
      ? undefined
      : (templatesCopy.events[log.module] as
          | Record<string, { title: string } | undefined>
          | undefined);

  return events?.[log.event]?.title ?? log.event;
}

export function NotificationDeliveryLogsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminNotificationDeliveryLogsMessages(locale);
  const templatesCopy = getAdminNotificationTemplatesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<NotificationDeliveryLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!canRead) return;
    let active = true;

    async function loadStats() {
      try {
        const [totalRes, sentRes, failedRes, skippedRes] = await Promise.all([
          fetchNotificationDeliveryLogs({ limit: 1 }),
          fetchNotificationDeliveryLogs({ status: "sent", limit: 1 }),
          fetchNotificationDeliveryLogs({ status: "failed", limit: 1 }),
          fetchNotificationDeliveryLogs({ status: "skipped", limit: 1 }),
        ]);

        if (active) {
          setStats({
            total: totalRes.pagination.total,
            sent: sentRes.pagination.total,
            failed: failedRes.pagination.total,
            skipped: skippedRes.pagination.total,
          });
        }
      } catch {
        // Keep existing stats on failure
      } finally {
        if (active) setStatsLoading(false);
      }
    }

    void loadStats();

    return () => {
      active = false;
    };
  }, [canRead, refreshKey]);

  const openDetail = useCallback((log: NotificationDeliveryLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  }, []);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const copyToClipboard = useCallback((text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  }, []);

  const clearDateFilters = useCallback(() => {
    setFromDate(undefined);
    setToDate(undefined);
    bumpRefresh();
  }, [bumpRefresh]);

  const clearAllFilters = useCallback(() => {
    setStatusFilter("all");
    setModuleFilter("all");
    setChannelFilter("all");
    setKindFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
    bumpRefresh();
  }, [bumpRefresh]);

  const setDatePreset = useCallback(
    (days: number) => {
      const now = new Date();
      const past = new Date();
      past.setDate(past.getDate() - days);
      setFromDate(past);
      setToDate(now);
      bumpRefresh();
    },
    [bumpRefresh],
  );

  const setTodayPreset = useCallback(() => {
    const now = new Date();
    setFromDate(now);
    setToDate(now);
    bumpRefresh();
  }, [bumpRefresh]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    moduleFilter !== "all" ||
    channelFilter !== "all" ||
    kindFilter !== "all" ||
    fromDate !== undefined ||
    toDate !== undefined;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (moduleFilter !== "all" ? 1 : 0) +
    (channelFilter !== "all" ? 1 : 0) +
    (kindFilter !== "all" ? 1 : 0) +
    (fromDate || toDate ? 1 : 0);

  const fetchLogs = useCallback(
    async ({ page, limit, search }: DataTableFetchParams) => {
      return fetchNotificationDeliveryLogs({
        page,
        limit,
        search: search || undefined,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as NotificationDeliveryStatus),
        module:
          moduleFilter === "all" ? undefined : (moduleFilter as NotificationModule),
        channel:
          channelFilter === "all"
            ? undefined
            : (channelFilter as NotificationDeliveryLog["channel"]),
        is_test:
          kindFilter === "live" ? false : kindFilter === "test" ? true : undefined,
        from: fromDate ? toStartOfDayIso(toDateKey(fromDate)) : undefined,
        to: toDate ? toEndOfDayIso(toDateKey(toDate)) : undefined,
      });
    },
    [channelFilter, fromDate, kindFilter, moduleFilter, statusFilter, toDate],
  );

  const columns = useMemo<DataTableColumn<NotificationDeliveryLog>[]>(
    () => [
      {
        id: "time",
        header: copy.columns.time,
        headerClassName: "w-[10rem]",
        cellClassName: "align-top whitespace-nowrap",
        cell: (log) => (
          <div className="space-y-0.5">
            <time
              className="text-xs font-semibold text-slate-700 dark:text-slate-200"
              dateTime={log.created_at}
            >
              {formatDateTime(log.created_at, locale)}
            </time>
          </div>
        ),
      },
      {
        id: "notification",
        header: copy.columns.notification,
        cellClassName: "align-top min-w-[15rem] max-w-xl",
        cell: (log) => (
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <button
                type="button"
                onClick={() => openDetail(log)}
                className="group text-left text-sm font-semibold text-slate-900 transition-colors hover:text-[var(--brand-primary)] dark:text-foreground dark:hover:text-[var(--brand-accent)]"
              >
                <span className="group-hover:underline underline-offset-2">
                  {getEventTitle(log, templatesCopy, copy)}
                </span>
              </button>
              {log.is_test ? (
                <Badge
                  variant="outline"
                  className={cn(
                    adminBadgeGoldClass,
                    "px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider",
                  )}
                >
                  {copy.kindLabels.test}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-border dark:bg-muted/40 dark:text-slate-300">
                <ChannelIcon
                  channel={log.channel}
                  className="size-3 text-slate-500 dark:text-muted-foreground"
                />
                {copy.channelLabels[log.channel]}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-muted dark:text-slate-300">
                {copy.moduleLabels[log.module]}
              </span>
            </div>

            {log.status === "failed" && log.error_message ? (
              <div className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span className="line-clamp-1">{log.error_message}</span>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "sentTo",
        header: copy.columns.sentTo,
        cellClassName: "align-top min-w-[11rem] max-w-xs",
        cell: (log) => (
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-slate-900 dark:text-foreground">
              {copy.recipientLabels[log.recipient]}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-mono text-slate-500 dark:text-muted-foreground">
                {log.recipient_contact ?? "—"}
              </span>
              {log.recipient_contact ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(log.recipient_contact!, `contact-${log.id}`);
                  }}
                  className="shrink-0 text-slate-400 hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground transition-colors"
                  title={copy.detail.copyContact ?? "Copy contact"}
                >
                  {copiedKey === `contact-${log.id}` ? (
                    <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: copy.columns.status,
        headerClassName: "w-[7.5rem]",
        cellClassName: "align-top",
        cell: (log) => <StatusBadge status={log.status} copy={copy} />,
      },
    ],
    [copy, copiedKey, copyToClipboard, locale, openDetail, templatesCopy],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={copy.stats?.total ?? "Total Deliveries"}
          value={stats.total}
          description={copy.stats?.totalDescription ?? "All email, SMS, and push attempts"}
          icon={Layers}
          loading={statsLoading}
          active={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
            bumpRefresh();
          }}
        />
        <StatCard
          title={copy.stats?.sent ?? "Delivered Successfully"}
          value={stats.sent}
          description={
            stats.total > 0
              ? `${Math.round((stats.sent / stats.total) * 100)}% delivery success rate`
              : (copy.stats?.sentDescription ?? "Dispatched without provider errors")
          }
          icon={CheckCircle2}
          loading={statsLoading}
          active={statusFilter === "sent"}
          onClick={() => {
            setStatusFilter(statusFilter === "sent" ? "all" : "sent");
            bumpRefresh();
          }}
        />
        <StatCard
          title={copy.stats?.failed ?? "Failed Deliveries"}
          value={stats.failed}
          description={copy.stats?.failedDescription ?? "Delivery errors requiring review"}
          icon={XCircle}
          loading={statsLoading}
          active={statusFilter === "failed"}
          onClick={() => {
            setStatusFilter(statusFilter === "failed" ? "all" : "failed");
            bumpRefresh();
          }}
        />
        <StatCard
          title={copy.stats?.skipped ?? "Skipped Notifications"}
          value={stats.skipped}
          description={copy.stats?.skippedDescription ?? "Suppressed by rules or preferences"}
          icon={MinusCircle}
          loading={statsLoading}
          active={statusFilter === "skipped"}
          onClick={() => {
            setStatusFilter(statusFilter === "skipped" ? "all" : "skipped");
            bumpRefresh();
          }}
        />
      </div>

      <DataTable
        key={locale}
        title={copy.title}
        titleClassName={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={fetchLogs}
        getRowKey={(log) => log.id}
        emptyIcon={ScrollText}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[
          refreshKey,
          statusFilter,
          moduleFilter,
          channelFilter,
          kindFilter,
          fromDate,
          toDate,
        ]}
        toolbarActions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={cn(
              "h-10 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold shadow-2xs transition-colors hover:bg-slate-50 dark:border-border dark:bg-muted/55 dark:text-foreground dark:hover:bg-accent",
              (filtersOpen || hasActiveFilters) &&
                "border-[#1C3A34]/40 bg-[#1C3A34]/5 text-[#1C3A34] dark:border-[var(--brand-accent)]/40 dark:bg-[var(--brand-accent)]/10 dark:text-[var(--brand-accent)]",
            )}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>{copy.filters.toggleFilters ?? "Filters"}</span>
            {hasActiveFilters ? (
              <span className="rounded-full bg-[#1C3A34] px-1.5 py-0.2 text-[10px] font-bold text-white dark:bg-[var(--brand-accent)] dark:text-black">
                {activeFilterCount}
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                "size-3.5 text-slate-400 transition-transform duration-200",
                filtersOpen && "rotate-180",
              )}
            />
          </Button>
        }
        renderRowActions={(log) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/8 hover:text-[#1C3A34] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
            aria-label={copy.actions.view}
            onClick={() => openDetail(log)}
          >
            <Eye className="size-4" />
          </Button>
        )}
        actionsColumnHeader=""
        minTableWidth="760px"
        filterBar={
          filtersOpen ? (
            <div className="space-y-4">
              {/* Filter Bar Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-border">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-slate-500 dark:text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {copy.filters.toggleFilters ?? "Filters"}
                  </span>
                  {hasActiveFilters ? (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                      {activeFilterCount} {copy.filters.activeFilters ?? "active"}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-7 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-foreground"
                    >
                      <RotateCcw className="mr-1 size-3" />
                      {copy.filters.resetFilters ?? "Reset filters"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiltersOpen(false)}
                    className="h-7 px-2 text-xs text-slate-400 hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground"
                  >
                    <X className="size-3.5 mr-1" />
                    {copy.filters.collapseFilters ?? "Hide"}
                  </Button>
                </div>
              </div>

              {/* 4-Dropdown Filter Grid */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {/* 1. Status Filter Dropdown */}
                <div className="min-w-0 space-y-1.5">
                  <Label className={adminFilterLabelClass}>{copy.filters.status}</Label>
                  <Select
                    items={[
                      { value: "all", label: copy.filters.statusAll },
                      { value: "sent", label: copy.statusLabels.sent },
                      { value: "failed", label: copy.statusLabels.failed },
                      { value: "skipped", label: copy.statusLabels.skipped },
                    ]}
                    value={statusFilter}
                    onValueChange={(value) => {
                      if (value) {
                        setStatusFilter(value);
                        bumpRefresh();
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={copy.filters.statusAll} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{copy.filters.statusAll}</SelectItem>
                        <SelectItem value="sent">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span>{copy.statusLabels.sent}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="failed">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-rose-500" />
                            <span>{copy.statusLabels.failed}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="skipped">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-amber-500" />
                            <span>{copy.statusLabels.skipped}</span>
                          </div>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Channel Filter Dropdown */}
                <div className="min-w-0 space-y-1.5">
                  <Label className={adminFilterLabelClass}>{copy.filters.channel}</Label>
                  <Select
                    items={[
                      { value: "all", label: copy.filters.channelAll },
                      { value: "email", label: copy.channelLabels.email },
                      { value: "sms", label: copy.channelLabels.sms },
                      { value: "push", label: copy.channelLabels.push },
                    ]}
                    value={channelFilter}
                    onValueChange={(value) => {
                      if (value) {
                        setChannelFilter(value);
                        bumpRefresh();
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={copy.filters.channelAll} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{copy.filters.channelAll}</SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="size-3.5 text-slate-500" />
                            <span>{copy.channelLabels.email}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <Smartphone className="size-3.5 text-slate-500" />
                            <span>{copy.channelLabels.sms}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="push">
                          <div className="flex items-center gap-2">
                            <Bell className="size-3.5 text-slate-500" />
                            <span>{copy.channelLabels.push}</span>
                          </div>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Area / Module Filter Dropdown */}
                <div className="min-w-0 space-y-1.5">
                  <Label className={adminFilterLabelClass}>{copy.filters.module}</Label>
                  <Select
                    items={[
                      { value: "all", label: copy.filters.moduleAll },
                      { value: "ride_requests", label: copy.moduleLabels.ride_requests },
                      {
                        value: "user_registrations",
                        label: copy.moduleLabels.user_registrations,
                      },
                      { value: "insurance", label: copy.moduleLabels.insurance },
                      { value: "inspection", label: copy.moduleLabels.inspection },
                      { value: "invoices", label: copy.moduleLabels.invoices },
                      { value: "system", label: copy.moduleLabels.system },
                    ]}
                    value={moduleFilter}
                    onValueChange={(value) => {
                      if (value) {
                        setModuleFilter(value);
                        bumpRefresh();
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={copy.filters.moduleAll} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{copy.filters.moduleAll}</SelectItem>
                        <SelectItem value="ride_requests">
                          {copy.moduleLabels.ride_requests}
                        </SelectItem>
                        <SelectItem value="user_registrations">
                          {copy.moduleLabels.user_registrations}
                        </SelectItem>
                        <SelectItem value="insurance">
                          {copy.moduleLabels.insurance}
                        </SelectItem>
                        <SelectItem value="inspection">
                          {copy.moduleLabels.inspection}
                        </SelectItem>
                        <SelectItem value="invoices">
                          {copy.moduleLabels.invoices}
                        </SelectItem>
                        <SelectItem value="system">{copy.moduleLabels.system}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Delivery Type Filter Dropdown */}
                <div className="min-w-0 space-y-1.5">
                  <Label className={adminFilterLabelClass}>{copy.filters.kind}</Label>
                  <Select
                    items={[
                      { value: "all", label: copy.filters.kindAll },
                      { value: "live", label: copy.filters.kindLive },
                      { value: "test", label: copy.filters.kindTest },
                    ]}
                    value={kindFilter}
                    onValueChange={(value) => {
                      if (value) {
                        setKindFilter(value);
                        bumpRefresh();
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={copy.filters.kindAll} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{copy.filters.kindAll}</SelectItem>
                        <SelectItem value="live">{copy.filters.kindLive}</SelectItem>
                        <SelectItem value="test">{copy.filters.kindTest}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Pickers & Quick Presets */}
              <div className="space-y-2 border-t border-slate-200/80 pt-3.5 dark:border-border">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <AdminDatePicker
                    id="notification-log-from"
                    label={copy.filters.dateFrom}
                    placeholder={copy.filters.pickDate}
                    value={fromDate}
                    onChange={(date) => {
                      setFromDate(date);
                      bumpRefresh();
                    }}
                  />
                  <AdminDatePicker
                    id="notification-log-to"
                    label={copy.filters.dateTo}
                    placeholder={copy.filters.pickDate}
                    value={toDate}
                    onChange={(date) => {
                      setToDate(date);
                      bumpRefresh();
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto text-xs font-semibold"
                    onClick={clearDateFilters}
                    disabled={!fromDate && !toDate}
                  >
                    {copy.filters.clearDates}
                  </Button>
                </div>

                {/* Quick Date Range Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-muted-foreground">
                    {copy.filters.quickPresets ?? "Quick dates:"}
                  </span>
                  <button
                    type="button"
                    onClick={setTodayPreset}
                    className="rounded-md border border-slate-200/80 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted"
                  >
                    {copy.filters.today ?? "Today"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset(7)}
                    className="rounded-md border border-slate-200/80 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted"
                  >
                    {copy.filters.last7Days ?? "Last 7 days"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePreset(30)}
                    className="rounded-md border border-slate-200/80 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted"
                  >
                    {copy.filters.last30Days ?? "Last 30 days"}
                  </button>
                </div>
              </div>
            </div>
          ) : null
        }
      />

      {/* Diagnostic Detail Drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-none data-[side=right]:sm:w-[500px]">
          <SheetHeader className="border-b border-slate-100 px-6 pt-6 pb-4 dark:border-border">
            <div className="flex flex-wrap items-center gap-2 pr-6">
              {selectedLog ? <StatusBadge status={selectedLog.status} copy={copy} /> : null}
              {selectedLog ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-border dark:bg-muted/40 dark:text-slate-200">
                  <ChannelIcon channel={selectedLog.channel} className="size-3.5 text-slate-500" />
                  {copy.channelLabels[selectedLog.channel]}
                </span>
              ) : null}
              {selectedLog?.is_test ? (
                <Badge
                  variant="outline"
                  className={cn(adminBadgeGoldClass, "text-[10px] font-bold uppercase")}
                >
                  {copy.kindLabels.test}
                </Badge>
              ) : null}
            </div>

            <SheetTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-foreground pt-2">
              {selectedLog
                ? getEventTitle(selectedLog, templatesCopy, copy)
                : copy.detail.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500 dark:text-muted-foreground">
              {selectedLog ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDateTime(selectedLog.created_at, locale)}
                </span>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          {selectedLog ? (
            <div className="space-y-5 px-6 py-5">
              {/* Error Diagnosis Banner (if failed or skipped) */}
              {selectedLog.status === "failed" && selectedLog.error_message ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                          {copy.detail.diagnosis ?? "Failure diagnosis"}
                        </p>
                        <p className="mt-1 font-mono text-xs font-medium text-rose-700 dark:text-rose-300 break-words">
                          {selectedLog.error_message}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(selectedLog.error_message!, "error-msg")
                      }
                      className="h-7 text-xs text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/40 shrink-0"
                    >
                      {copiedKey === "error-msg" ? (
                        <Check className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                      ) : (
                        <Copy className="size-3 mr-1" />
                      )}
                      {copiedKey === "error-msg"
                        ? copy.detail.copied ?? "Copied"
                        : copy.detail.copyError ?? "Copy error"}
                    </Button>
                  </div>
                </div>
              ) : selectedLog.status === "skipped" && selectedLog.error_message ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2.5">
                    <MinusCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        {copy.statusLabels.skipped}
                      </p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        {selectedLog.error_message}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Section 1: Delivery Overview & Recipient */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground pb-3">
                  {copy.detail.overview ?? "Delivery overview"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide dark:text-muted-foreground">
                      {copy.detail.recipient}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-foreground">
                      {copy.recipientLabels[selectedLog.recipient]}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide dark:text-muted-foreground">
                      {copy.detail.module}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-foreground">
                      {copy.moduleLabels[selectedLog.module]}
                    </p>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide dark:text-muted-foreground">
                      {copy.detail.contact}
                    </span>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-border dark:bg-card">
                      <span className="truncate font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                        {selectedLog.recipient_contact || "—"}
                      </span>
                      {selectedLog.recipient_contact ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(selectedLog.recipient_contact!, "detail-contact")
                          }
                          className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
                        >
                          {copiedKey === "detail-contact" ? (
                            <Check className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                          ) : (
                            <Copy className="size-3 mr-1" />
                          )}
                          {copiedKey === "detail-contact"
                            ? copy.detail.copied ?? "Copied"
                            : copy.detail.copy ?? "Copy"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {selectedLog.entity_type || selectedLog.entity_id ? (
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide dark:text-muted-foreground">
                        {copy.detail.entityType}
                      </span>
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-border dark:bg-card">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {selectedLog.entity_type ?? "Record"}
                          </p>
                          <p className="truncate font-mono text-[11px] text-slate-500 dark:text-muted-foreground">
                            {selectedLog.entity_id ?? "—"}
                          </p>
                        </div>
                        {selectedLog.entity_id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(selectedLog.entity_id!, "detail-entity")
                            }
                            className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
                          >
                            {copiedKey === "detail-entity" ? (
                              <Check className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                            ) : (
                              <Copy className="size-3 mr-1" />
                            )}
                            {copiedKey === "detail-entity"
                              ? copy.detail.copied ?? "Copied"
                              : copy.detail.copyId ?? "Copy ID"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Section 2: Payload / Message Content (only if subject or body exists) */}
              {selectedLog.subject || selectedLog.body_preview ? (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground pb-3">
                    {copy.detail.payload ?? "Message content"}
                  </p>
                  <div className="space-y-3">
                    {selectedLog.subject ? (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide dark:text-muted-foreground">
                          {copy.detail.subject}
                        </span>
                        <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 dark:border-border dark:bg-card dark:text-foreground">
                          {selectedLog.subject}
                        </div>
                      </div>
                    ) : null}

                    {selectedLog.body_preview ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide dark:text-muted-foreground">
                            {copy.detail.body}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(selectedLog.body_preview!, "detail-body")
                            }
                            className="h-5 px-1.5 text-[11px] text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
                          >
                            {copiedKey === "detail-body" ? (
                              <Check className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                            ) : (
                              <Copy className="size-3 mr-1" />
                            )}
                            {copiedKey === "detail-body"
                              ? copy.detail.copied ?? "Copied"
                              : copy.detail.copy ?? "Copy"}
                          </Button>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3.5 font-mono text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-words dark:border-border dark:bg-card dark:text-slate-200">
                          {selectedLog.body_preview}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Section 3: Technical Identifiers */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground pb-2">
                  {copy.detail.technicalDetails ?? "Technical identifiers"}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 dark:text-muted-foreground">
                      {copy.detail.logId ?? "Log ID"}
                    </span>
                    <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">
                      {selectedLog.id}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedLog.id, "log-id")}
                    className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
                  >
                    {copiedKey === "log-id" ? (
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 mr-1" />
                    ) : (
                      <Copy className="size-3 mr-1" />
                    )}
                    {copiedKey === "log-id"
                      ? copy.detail.copied ?? "Copied"
                      : copy.detail.copyId ?? "Copy ID"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <SheetFooter className="border-t border-slate-100 px-6 py-4 dark:border-border sm:justify-between">
            {selectedLog ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(JSON.stringify(selectedLog, null, 2), "copy-json")
                }
                className="text-xs font-semibold"
              >
                {copiedKey === "copy-json" ? (
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5" />
                ) : (
                  <Copy className="size-3.5 mr-1.5" />
                )}
                {copiedKey === "copy-json"
                  ? copy.detail.copied ?? "Copied"
                  : copy.detail.copyJson ?? "Copy JSON"}
              </Button>
            ) : <div />}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setDetailOpen(false)}
              className="text-xs font-semibold"
            >
              {copy.detail.close}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
