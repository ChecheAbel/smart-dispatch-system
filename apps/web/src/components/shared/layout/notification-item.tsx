"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Car,
  Check,
  FileText,
  MapPin,
  ShieldAlert,
  Bell,
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

function getCategoryIcon(category: InAppNotificationCategory) {
  switch (category) {
    case "ride_request":
      return <Car className="size-4 text-sky-600 dark:text-sky-400" />;
    case "dispatch_escalation":
      return <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />;
    case "compliance":
      return <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />;
    case "invoice":
      return <FileText className="size-4 text-violet-600 dark:text-violet-400" />;
    case "geofence":
      return <MapPin className="size-4 text-amber-600 dark:text-amber-400" />;
    default:
      return <Bell className="size-4 text-slate-600 dark:text-slate-400" />;
  }
}

function getCategoryBadgeClass(category: InAppNotificationCategory) {
  switch (category) {
    case "ride_request":
      return "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300";
    case "dispatch_escalation":
      return "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300";
    case "compliance":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    case "invoice":
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300";
    case "geofence":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  formatRelativeTime,
  categoryLabel,
}: NotificationItemProps) {
  const isUnread = !notification.read_at;

  const content = (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg p-3 transition-colors text-left",
        isUnread
          ? "bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-900/60 dark:hover:bg-slate-800/60"
          : "hover:bg-slate-50 dark:hover:bg-slate-900/40",
      )}
    >
      {/* Category Icon Container */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/60 shadow-2xs dark:border-slate-800",
          getCategoryBadgeClass(notification.category),
        )}
      >
        {getCategoryIcon(notification.category)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {categoryLabel}
          </span>
          {isUnread && (
            <span
              className={cn(
                "size-2 rounded-full",
                notification.priority === "urgent" || notification.priority === "high"
                  ? "bg-red-500 animate-pulse"
                  : "bg-emerald-500",
              )}
            />
          )}
          <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        <p className="mt-0.5 text-xs font-semibold text-slate-900 line-clamp-1 dark:text-slate-100">
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 dark:text-slate-400">
          {notification.message}
        </p>
      </div>

      {/* Mark as read quick action */}
      {isUnread && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
          title="Mark as read"
        >
          <Check className="size-3.5" />
        </Button>
      )}
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
        {content}
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
      {content}
    </div>
  );
}
