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
import { formatMessage, getAdminNotificationTemplatesMessages } from "@/translations";
import { cn } from "@/lib/utils";
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

type EventCopy = { title: string; description: string };

function getEventCopy(
  module: NotificationModule,
  event: string,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
): EventCopy {
  const events = copy.events[module] as Record<string, EventCopy | undefined>;
  return events[event] ?? { title: event, description: "" };
}

function getGroupLabel(
  module: NotificationModule,
  groupId: string,
  copy: ReturnType<typeof getAdminNotificationTemplatesMessages>,
) {
  const groups = copy.eventGroups[module] as Record<string, string | undefined>;
  return groups[groupId] ?? groupId;
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

    return (
      <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
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
          items={EVENT_GROUPS[module].flatMap((group) =>
            group.events.map((event) => ({
              value: event,
              label: getEventCopy(module, event, copy).title,
            })),
          )}
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
              <div key={group.id} className="space-y-1">
                <p className="px-2.5 pb-1 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                  {getGroupLabel(module, group.id, copy)}
                </p>

                <div className="space-y-0.5">
                  {group.events.map((event) => {
                    const eventCopy = getEventCopy(module, event, copy);
                    const isActive = activeEvent === event;
                    const enabled =
                      getEventChannelStats(module, event, templates, formState).enabled > 0;

                    return (
                      <button
                        key={event}
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C3A34]/20",
                          isActive
                            ? "bg-white shadow-sm ring-1 ring-slate-200/80"
                            : "hover:bg-white/70",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            isActive
                              ? "bg-[#1C3A34]"
                              : enabled
                                ? "bg-emerald-500"
                                : "bg-slate-300",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "text-sm",
                                isActive
                                  ? "font-semibold text-[#1C3A34]"
                                  : "font-medium text-slate-700",
                              )}
                            >
                              {eventCopy.title}
                            </span>
                            {renderChannelBadge(event)}
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-slate-500">
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
