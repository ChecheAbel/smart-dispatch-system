"use client";

import Link from "next/link";
import { Bell, ChevronRight, ScrollText } from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import { adminHeadingClass } from "@/lib/admin-theme";
import {
  getAdminNotificationTemplatesMessages,
  getAdminNotificationsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";

type NotificationTemplatesChannelsSummaryProps = {
  enabled: number;
  total: number;
  className?: string;
  compact?: boolean;
};

function getProgressColor(enabled: number, total: number) {
  if (enabled === 0 || total === 0) {
    return "#94a3b8";
  }

  if (enabled === total) {
    return "#1C3A34";
  }

  return "#10b981";
}

export function NotificationTemplatesChannelsSummary({
  enabled,
  total,
  className,
  compact = false,
}: NotificationTemplatesChannelsSummaryProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);
  const percent = total > 0 ? (enabled / total) * 100 : 0;
  const progressColor = getProgressColor(enabled, total);

  if (total === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white shadow-sm",
        compact ? "px-3 py-2" : "px-3.5 py-2.5",
        className,
      )}
      aria-label={copy.shell.channelsSummaryAria
        .replace("{enabled}", String(enabled))
        .replace("{total}", String(total))}
    >
      <div
        className={cn(
          "relative grid shrink-0 place-items-center",
          compact ? "size-9" : "size-10",
        )}
      >
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 36 36"
          aria-hidden
        >
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className="stroke-slate-200"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={progressColor}
            strokeWidth="3"
            strokeDasharray={`${percent} 100`}
            pathLength={100}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-bold text-[#1C3A34] tabular-nums">{enabled}</span>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
          {copy.shell.channelsSummaryLabel}
        </p>
        <p className={cn("font-bold text-[#1C3A34] tabular-nums", compact ? "text-sm" : "text-sm")}>
          {enabled}
          <span className="mx-1 font-medium text-slate-300">/</span>
          {total}
        </p>
      </div>
    </div>
  );
}

export function NotificationDeliveryLogsLink({ className }: { className?: string }) {
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);

  return (
    <Link
      href="/admin/notification-logs"
      className={cn(
        "group inline-flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left shadow-sm transition-all",
        "hover:border-[#C9B87A]/50 hover:bg-[#f8fafb] hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1C3A34]/15",
        className,
      )}
    >
      <div className="rounded-lg bg-[#1C3A34]/8 p-2 text-[#1C3A34] transition-colors group-hover:bg-[#1C3A34]/12">
        <ScrollText className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold leading-tight", adminHeadingClass)}>
          {copy.shell.deliveryLogLinkTitle}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-slate-500">
          {copy.shell.deliveryLogLinkDescription}
        </p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1C3A34]" />
    </Link>
  );
}

export function NotificationProvidersLink({ className }: { className?: string }) {
  const { locale } = useLocale();
  const templatesCopy = getAdminNotificationTemplatesMessages(locale);
  const notificationsCopy = getAdminNotificationsMessages(locale);

  return (
    <Link
      href="/admin/notifications"
      className={cn(
        "group inline-flex items-center gap-3 rounded-xl border border-[#1C3A34]/15 bg-[#1C3A34]/[0.03] px-3.5 py-2.5 text-left shadow-sm transition-all",
        "hover:border-[#1C3A34]/25 hover:bg-[#1C3A34]/[0.06] hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1C3A34]/15",
        className,
      )}
    >
      <div className="rounded-lg bg-[#1C3A34] p-2 text-white shadow-sm transition-transform group-hover:scale-105">
        <Bell className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold leading-tight", adminHeadingClass)}>
          {notificationsCopy.title}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-slate-500">
          {templatesCopy.shell.notificationsLinkDescription}
        </p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1C3A34]" />
    </Link>
  );
}
