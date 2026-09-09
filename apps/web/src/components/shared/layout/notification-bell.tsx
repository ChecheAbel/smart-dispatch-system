"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import { getInAppNotificationsMessages } from "@/translations";
import { useInAppNotifications } from "@/hooks/use-in-app-notifications";
import { NotificationItem } from "./notification-item";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { adminHeaderIconButtonClass } from "@/lib/admin-theme";

export function NotificationBell() {
  const { locale } = useLocale();
  const copy = getInAppNotificationsMessages(locale);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    webPush,
  } = useInAppNotifications();

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.read_at);
    }
    return notifications;
  }, [activeTab, notifications]);

  const visibleNotifications = useMemo(() => {
    return filteredNotifications.slice(0, displayLimit);
  }, [filteredNotifications, displayLimit]);

  function formatRelativeTime(isoDate: string): string {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return copy.justNow;
    if (diffMins < 60) return copy.minutesAgo.replace("{{count}}", String(diffMins));
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return copy.hoursAgo.replace("{{count}}", String(diffHours));
    const diffDays = Math.floor(diffHours / 24);
    return copy.daysAgo.replace("{{count}}", String(diffDays));
  }

  function getCategoryLabel(category: string): string {
    const categories = copy.categories as Record<string, string> | undefined;
    return categories?.[category] || category;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(adminHeaderIconButtonClass, "relative")}
            aria-label={copy.title}
          />
        }
      >
        <Bell className="size-4 text-[#1C3A34] dark:text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 border border-slate-200/80 bg-white shadow-xl dark:border-border dark:bg-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#1C3A34] dark:text-foreground">
              {copy.title}
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                {copy.unreadCountBadge.replace("{{count}}", String(unreadCount))}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={markAllAsRead}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              {copy.markAllAsRead}
            </Button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-slate-100 bg-slate-50/60 px-4 py-1.5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setDisplayLimit(10);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === "all"
                  ? "bg-white text-[#1C3A34] shadow-2xs dark:bg-slate-800 dark:text-foreground"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
              )}
            >
              {copy.allTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("unread");
                setDisplayLimit(10);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === "unread"
                  ? "bg-white text-[#1C3A34] shadow-2xs dark:bg-slate-800 dark:text-foreground"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400",
              )}
            >
              {copy.unreadTab}
              {unreadCount > 0 && ` (${unreadCount})`}
            </button>
          </div>
        </div>

        {/* Browser Web Push Banner (if permission is default) */}
        {webPush.isSupported && webPush.permission === "default" && (
          <div className="border-b border-amber-100 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <div className="flex items-start gap-2.5">
              <Volume2 className="size-4 shrink-0 text-amber-700 mt-0.5 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  {copy.enableDesktopPush}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 leading-snug">
                  {copy.desktopPushDesc}
                </p>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => void webPush.requestPermission()}
                  className="mt-2 text-xs border-amber-300 bg-white text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200"
                >
                  {copy.enableDesktopPush}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100/60 dark:divide-slate-800/60">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Inbox className="size-5 text-slate-400" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {copy.emptyTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 max-w-[240px]">
                {copy.emptyDescription}
              </p>
            </div>
          ) : (
            <>
              {visibleNotifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onMarkAsRead={markAsRead}
                  formatRelativeTime={formatRelativeTime}
                  categoryLabel={getCategoryLabel(notif.category)}
                />
              ))}

              {filteredNotifications.length > displayLimit && (
                <div className="pt-2 pb-1 text-center">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setDisplayLimit((prev) => prev + 10)}
                    className="w-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {copy.showMore} (+{Math.min(10, filteredNotifications.length - displayLimit)})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Sparkles className="size-3 text-[var(--brand-accent)]" />
            Smart Dispatch Real-time
          </span>
          {filteredNotifications.length > 0 && (
            <span className="text-[10px] font-medium text-slate-400">
              {copy.showingCount
                .replace("{{shown}}", String(visibleNotifications.length))
                .replace("{{total}}", String(filteredNotifications.length))}
            </span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
