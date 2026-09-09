"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Car,
  Check,
  ChevronRight,
  FileText,
  MapPin,
  ShieldAlert,
  Bell,
  Clock,
} from "lucide-react";
import type { InAppNotification, InAppNotificationCategory } from "@smart-dispatch/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NotificationItemProps {
  notification: InAppNotification;
  onMarkAsRead: (id: string) => void;
  formatRelativeTime: (isoDate: string) => string;
  categoryLabel: string;
}

function getCategoryConfig(category: InAppNotificationCategory) {
  switch (category) {
    case "ride_request":
      return {
        icon: <Car className="size-4 text-sky-600 dark:text-sky-300" />,
        container:
          "bg-sky-50 text-sky-600 border-sky-200/70 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
      };
    case "dispatch_escalation":
      return {
        icon: <AlertTriangle className="size-4 text-rose-600 dark:text-rose-300" />,
        container:
          "bg-rose-50 text-rose-600 border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
      };
    case "compliance":
      return {
        icon: <ShieldAlert className="size-4 text-amber-600 dark:text-amber-300" />,
        container:
          "bg-amber-50 text-amber-600 border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      };
    case "invoice":
      return {
        icon: <FileText className="size-4 text-violet-600 dark:text-violet-300" />,
        container:
          "bg-violet-50 text-violet-600 border-violet-200/70 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
      };
    case "geofence":
      return {
        icon: <MapPin className="size-4 text-teal-600 dark:text-teal-300" />,
        container:
          "bg-teal-50 text-teal-600 border-teal-200/70 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
      };
    default:
      return {
        icon: <Bell className="size-4 text-slate-600 dark:text-muted-foreground" />,
        container:
          "bg-slate-100 text-slate-600 border-slate-200/70 dark:bg-muted dark:text-muted-foreground dark:border-border",
      };
  }
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  formatRelativeTime,
  categoryLabel,
}: NotificationItemProps) {
  const isUnread = !notification.read_at;
  const isUrgent = notification.priority === "urgent" || notification.priority === "high";
  const { icon, container } = getCategoryConfig(notification.category);

  const card = (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl p-3 transition-all duration-150 text-left border",
        isUnread
          ? isUrgent
            ? "bg-rose-50/40 border-rose-200/70 hover:bg-rose-50/70 dark:bg-destructive/10 dark:border-destructive/30 dark:hover:bg-destructive/15"
            : "bg-slate-50/90 border-slate-200/80 hover:bg-slate-100/70 dark:bg-card dark:border-border dark:hover:bg-muted/60"
          : "bg-transparent border-transparent hover:bg-slate-50/80 dark:hover:bg-muted/40",
      )}
    >
      {/* Category Icon Container */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs mt-0.5",
          container,
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Eyebrow Row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
            {categoryLabel}
          </span>

          {isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-500/25">
              <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
              {notification.priority}
            </span>
          )}

          {isUnread && !isUrgent && (
            <span className="size-2 rounded-full bg-emerald-500" title="Unread" />
          )}

          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-muted-foreground font-medium">
            <Clock className="size-3 text-slate-400 dark:text-muted-foreground" />
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        {/* Title */}
        <p
          className={cn(
            "mt-1 text-xs font-bold leading-snug line-clamp-1 transition-colors",
            isUnread
              ? "text-slate-900 dark:text-foreground group-hover:text-[var(--brand-primary)] dark:group-hover:text-[var(--brand-accent)]"
              : "text-slate-700 dark:text-foreground/85",
          )}
        >
          {notification.title}
        </p>

        {/* Body Message */}
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Trailing Actions */}
      <div className="flex items-center gap-1 shrink-0 self-center">
        {isUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 dark:text-muted-foreground dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Mark as read"
            aria-label="Mark as read"
          >
            <Check className="size-4" />
          </Button>
        )}

        {notification.action_url && (
          <ChevronRight className="size-4 text-slate-300 dark:text-muted-foreground/40 group-hover:text-slate-600 dark:group-hover:text-foreground transition-colors" />
        )}
      </div>
    </div>
  );

  if (notification.action_url) {
    return (
      <Link
        href={notification.action_url}
        onClick={() => {
          if (isUnread) {
            onMarkAsRead(notification.id);
          }
        }}
        className="block"
      >
        {card}
      </Link>
    );
  }

  return (
    <div
      onClick={() => {
        if (isUnread) {
          onMarkAsRead(notification.id);
        }
      }}
      className="cursor-pointer"
    >
      {card}
    </div>
  );
}
