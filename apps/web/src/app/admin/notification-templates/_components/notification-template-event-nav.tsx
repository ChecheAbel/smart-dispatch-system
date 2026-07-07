"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { NotificationModule, NotificationTemplate } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminHeadingClass, adminSearchInputClass } from "@/lib/admin-theme";
import { getAdminNotificationTemplatesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/translations";
import {
  EVENT_GROUPS,
  getEventChannelStats,
  MODULE_EVENTS,
} from "./notification-template-shared";

type NotificationTemplateEventNavProps = {
  module: NotificationModule;
  activeEvent: string;
  templates: NotificationTemplate[];
  formState: Record<string, { is_enabled: boolean }>;
  onSelectEvent: (event: string) => void;
  className?: string;
};

function getEventCopy(
  module: NotificationModule,
  event: string,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  return module === "ride_requests"
    ? copy.events.ride_requests[event as keyof typeof copy.events.ride_requests]
    : copy.events.user_registrations[event as keyof typeof copy.events.user_registrations];
}

function getGroupLabel(
  module: NotificationModule,
  groupId: string,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  return copy.eventGroups[module][groupId as keyof (typeof copy.eventGroups)[typeof module]];
}

export function NotificationTemplateEventNav({
  module,
  activeEvent,
  templates,
  formState,
  onSelectEvent,
  className,
}: NotificationTemplateEventNavProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);
  const [query, setQuery] = useState("");
  const events = MODULE_EVENTS[module];
  const showSearch = events.length > 4;

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return EVENT_GROUPS[module]
      .map((group) => ({
        ...group,
        events: group.events.filter((event) => {
          if (!normalizedQuery) {
            return true;
          }

          const eventCopy = getEventCopy(module, event, copy);
          return (
            eventCopy.title.toLowerCase().includes(normalizedQuery) ||
            eventCopy.description.toLowerCase().includes(normalizedQuery)
          );
        }),
      }))
      .filter((group) => group.events.length > 0);
  }, [copy, module, query]);

  function renderChannelBadge(event: string) {
    const stats = getEventChannelStats(module, event, templates, formState);

    if (stats.total === 0) {
      return null;
    }

    const isActiveEvent = stats.enabled > 0;

    return (
      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          isActiveEvent
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-500",
        )}
      >
        {formatMessage(copy.shell.channelsEnabled, {
          enabled: String(stats.enabled),
          total: String(stats.total),
        })}
      </span>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col bg-[#f8fafb]/80", className)}>
      <div className="space-y-1 border-b border-slate-200/80 px-4 py-4">
        <h2 className={cn("text-sm font-bold", adminHeadingClass)}>{copy.shell.eventPickerTitle}</h2>
        <p className="text-xs leading-relaxed text-slate-500">{copy.shell.eventPickerDescription}</p>
      </div>

      <div className="border-b border-slate-200/80 p-3 lg:hidden">
        <Select
          value={activeEvent}
          onValueChange={(value) => {
            if (value) {
              onSelectEvent(value);
            }
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm">
            <SelectValue placeholder={copy.shell.eventPickerTitle} />
          </SelectTrigger>
          <SelectContent>
            {EVENT_GROUPS[module].flatMap((group) =>
              group.events.map((event) => {
                const eventCopy = getEventCopy(module, event, copy);
                return (
                  <SelectItem key={event} value={event}>
                    {eventCopy.title}
                  </SelectItem>
                );
              }),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        {showSearch ? (
          <div className="border-b border-slate-200/80 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.shell.eventSearchPlaceholder}
                className={cn(adminSearchInputClass, "pl-10")}
              />
            </div>
          </div>
        ) : null}

        <nav
          aria-label={copy.shell.eventPickerTitle}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3"
        >
          {filteredGroups.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-500">{copy.shell.eventSearchEmpty}</p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1.5">
                <p className="px-2 text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                  {getGroupLabel(module, group.id, copy)}
                </p>

                <div className="space-y-1">
                  {group.events.map((event) => {
                    const eventCopy = getEventCopy(module, event, copy);
                    const isActive = activeEvent === event;

                    return (
                      <button
                        key={event}
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1C3A34]/15",
                          isActive
                            ? "border-[#1C3A34]/20 bg-white shadow-sm ring-1 ring-[#1C3A34]/10"
                            : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white/80",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            getEventChannelStats(module, event, templates, formState).enabled > 0
                              ? "bg-emerald-500"
                              : "bg-slate-300",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                isActive ? "text-[#1C3A34]" : "text-slate-800",
                              )}
                            >
                              {eventCopy.title}
                            </span>
                            {renderChannelBadge(event)}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {eventCopy.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </nav>
      </div>
    </div>
  );
}
