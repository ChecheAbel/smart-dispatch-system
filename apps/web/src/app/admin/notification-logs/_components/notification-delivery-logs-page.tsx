"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Eye, MoreHorizontal, ScrollText } from "lucide-react";
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
import { fetchNotificationDeliveryLogs } from "@/lib/notification-delivery-log-api";
import { adminBadgeGoldClass, adminFilterLabelClass, adminHeadingClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getAdminNotificationDeliveryLogsMessages,
  getAdminNotificationTemplatesMessages,
} from "@/translations";
import { cn } from "@/lib/utils";

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

function statusBadgeClass(status: NotificationDeliveryStatus) {
  switch (status) {
    case "sent":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "skipped":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "failed":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getEventTitle(
  log: NotificationDeliveryLog,
  templatesCopy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  if (log.module === "ride_requests") {
    const events = templatesCopy.events.ride_requests;
    return events[log.event as keyof typeof events]?.title ?? log.event;
  }

  const events = templatesCopy.events.user_registrations;
  return events[log.event as keyof typeof events]?.title ?? log.event;
}

function formatSummary(log: NotificationDeliveryLog) {
  if ((log.status === "failed" || log.status === "skipped") && log.error_message) {
    return log.error_message;
  }

  if (log.channel === "email" && log.subject) {
    return log.subject;
  }

  return log.body_preview ?? "—";
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="text-sm break-words whitespace-pre-wrap text-slate-700">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

function DeliveryLogRowActions({
  log,
  label,
  onView,
}: {
  log: NotificationDeliveryLog;
  label: string;
  onView: (log: NotificationDeliveryLog) => void;
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

export function NotificationDeliveryLogsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminNotificationDeliveryLogsMessages(locale);
  const templatesCopy = getAdminNotificationTemplatesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [selectedLog, setSelectedLog] = useState<NotificationDeliveryLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openDetail = useCallback((log: NotificationDeliveryLog) => {
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
        channel: channelFilter === "all" ? undefined : (channelFilter as "email" | "sms"),
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
        cell: (log) => (
          <span className="text-sm text-slate-600">{formatDateTime(log.created_at, locale)}</span>
        ),
      },
      {
        id: "status",
        header: copy.columns.status,
        cell: (log) => (
          <Badge variant="outline" className={statusBadgeClass(log.status)}>
            {copy.statusLabels[log.status]}
          </Badge>
        ),
      },
      {
        id: "event",
        header: copy.columns.event,
        cell: (log) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{getEventTitle(log, templatesCopy)}</p>
            <p className="text-xs text-slate-500">
              {copy.moduleLabels[log.module]}
              {log.is_test ? ` · ${copy.kindLabels.test}` : ""}
            </p>
          </div>
        ),
      },
      {
        id: "channel",
        header: copy.columns.channel,
        cell: (log) => (
          <span className="text-sm text-slate-700">{copy.channelLabels[log.channel]}</span>
        ),
      },
      {
        id: "recipient",
        header: copy.columns.recipient,
        cell: (log) => (
          <span className="text-sm text-slate-700">{copy.recipientLabels[log.recipient]}</span>
        ),
      },
      {
        id: "contact",
        header: copy.columns.contact,
        cell: (log) => (
          <span className="text-sm text-slate-600">{log.recipient_contact ?? "—"}</span>
        ),
      },
      {
        id: "summary",
        header: copy.columns.summary,
        cell: (log) => (
          <span className="line-clamp-2 text-sm text-slate-600">{formatSummary(log)}</span>
        ),
      },
    ],
    [copy, locale, templatesCopy],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={fetchLogs}
        getRowKey={(log) => log.id}
        emptyIcon={ScrollText}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[refreshKey, statusFilter, moduleFilter, channelFilter, kindFilter, fromDate, toDate]}
        renderRowActions={(log) => (
          <DeliveryLogRowActions log={log} label={copy.actions.view} onView={openDetail} />
        )}
        actionsColumnHeader={copy.columns.actions}
        minTableWidth="1100px"
        filterBar={
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label className={adminFilterLabelClass}>{copy.filters.status}</Label>
                <Select
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
                      <SelectItem value="sent">{copy.statusLabels.sent}</SelectItem>
                      <SelectItem value="skipped">{copy.statusLabels.skipped}</SelectItem>
                      <SelectItem value="failed">{copy.statusLabels.failed}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={adminFilterLabelClass}>{copy.filters.module}</Label>
                <Select
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
                      <SelectItem value="ride_requests">{copy.moduleLabels.ride_requests}</SelectItem>
                      <SelectItem value="user_registrations">
                        {copy.moduleLabels.user_registrations}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={adminFilterLabelClass}>{copy.filters.channel}</Label>
                <Select
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
                      <SelectItem value="email">{copy.channelLabels.email}</SelectItem>
                      <SelectItem value="sms">{copy.channelLabels.sms}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={adminFilterLabelClass}>{copy.filters.kind}</Label>
                <Select
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

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
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
              <Button type="button" variant="outline" onClick={clearDateFilters}>
                {copy.filters.clearDates}
              </Button>
            </div>
          </div>
        }
      />

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{copy.detail.title}</SheetTitle>
            <SheetDescription>{copy.detail.description}</SheetDescription>
          </SheetHeader>

          {selectedLog ? (
            <div className="space-y-5 px-4 pb-4">
              <DetailField
                label={copy.detail.status}
                value={copy.statusLabels[selectedLog.status]}
              />
              <DetailField
                label={copy.detail.kind}
                value={selectedLog.is_test ? copy.kindLabels.test : copy.kindLabels.live}
              />
              <DetailField
                label={copy.detail.module}
                value={copy.moduleLabels[selectedLog.module]}
              />
              <DetailField
                label={copy.detail.event}
                value={getEventTitle(selectedLog, templatesCopy)}
              />
              <DetailField
                label={copy.detail.channel}
                value={copy.channelLabels[selectedLog.channel]}
              />
              <DetailField
                label={copy.detail.recipient}
                value={copy.recipientLabels[selectedLog.recipient]}
              />
              <DetailField label={copy.detail.contact} value={selectedLog.recipient_contact} />
              <DetailField label={copy.detail.entityType} value={selectedLog.entity_type} />
              <DetailField label={copy.detail.entityId} value={selectedLog.entity_id} />
              {selectedLog.channel === "email" ? (
                <DetailField label={copy.detail.subject} value={selectedLog.subject} />
              ) : null}
              <DetailField label={copy.detail.body} value={selectedLog.body_preview} />
              <DetailField label={copy.detail.error} value={selectedLog.error_message} />
              <DetailField
                label={copy.detail.createdAt}
                value={formatDateTime(selectedLog.created_at, locale)}
              />
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
