"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCheck,
  Inbox,
  Loader2,
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
            className={cn(
              adminHeaderIconButtonClass,
              "relative group transition-all duration-200",
              isOpen && "bg-slate-100 dark:bg-accent text-[#1C3A34] dark:text-[var(--brand-accent)]",
            )}
            aria-label={copy.title}
          />
        }
      >
        <Bell
          className={cn(
            "size-4 text-[#1C3A34] dark:text-foreground transition-transform duration-300 group-hover:rotate-12",
          )}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center">
            <span className="absolute inline-flex size-4.5 animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-linear-to-r from-red-600 to-rose-500 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white dark:ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[390px] sm:w-[420px] p-0 border border-slate-200/90 bg-white shadow-2xl dark:border-border dark:bg-popover dark:text-popover-foreground rounded-2xl overflow-hidden"
      >
        {/* Unified Header & Tab Bar */}
        <div className="border-b border-slate-100 dark:border-border px-4 pt-3.5 pb-2.5 bg-slate-50/70 dark:bg-muted/25">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7.5 shrink-0 items-center justify-center rounded-xl bg-[#1C3A34]/8 text-[#1C3A34] dark:bg-accent dark:text-[var(--brand-accent)] border border-[#1C3A34]/15 dark:border-border">
                <Bell className="size-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1C3A34] dark:text-foreground">
                  {copy.title}
                </h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-500/25">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {copy.unreadCountBadge.replace("{{count}}", String(unreadCount))}
                  </span>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={markAllAsRead}
                className="text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-accent gap-1 rounded-lg h-7 px-2"
              >
                <CheckCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                {copy.markAllAsRead}
              </Button>
            )}
          </div>

          {/* Integrated Segmented Tab Controls (seamless with zero dividing border) */}
          <div className="mt-2.5 flex items-center justify-between">
            <div className="inline-flex rounded-lg bg-slate-200/60 dark:bg-muted p-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setDisplayLimit(10);
                }}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                  activeTab === "all"
                    ? "bg-white text-[#1C3A34] shadow-xs dark:bg-card dark:text-foreground"
                    : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
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
                  "rounded-md px-3 py-1 text-xs font-semibold transition-all inline-flex items-center gap-1.5",
                  activeTab === "unread"
                    ? "bg-white text-[#1C3A34] shadow-xs dark:bg-card dark:text-foreground"
                    : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                )}
              >
                {copy.unreadTab}
                {unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Browser Web Push Banner (if permission is default) */}
        {webPush.isSupported && webPush.permission === "default" && (
          <div className="mx-3 my-2 rounded-xl border border-[var(--brand-accent)]/35 bg-linear-to-br from-[#C9B87A]/12 via-amber-500/5 to-transparent dark:from-[#C9B87A]/15 dark:via-accent/40 dark:to-transparent p-3">
            <div className="flex items-start gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-accent)]/20 text-[#1C3A34] dark:text-[var(--brand-accent)] mt-0.5">
                <BellRing className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-foreground">
                  {copy.enableDesktopPush}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-muted-foreground mt-0.5 leading-snug">
                  {copy.desktopPushDesc}
                </p>
                <Button
                  size="xs"
                  onClick={() => void webPush.requestPermission()}
                  className="mt-2 text-xs font-semibold rounded-lg bg-[#1C3A34] hover:bg-[#142a25] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f] dark:hover:bg-[color-mix(in_srgb,var(--brand-accent)_85%,black)] shadow-xs"
                >
                  {copy.enableDesktopPush}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Items List */}
        <div className="max-h-84 overflow-y-auto p-2.5 space-y-1.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-[#1C3A34] dark:text-[var(--brand-accent)]" />
              <span className="text-xs text-slate-400 dark:text-muted-foreground">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200/60 dark:bg-muted dark:border-border">
                <Inbox className="size-5 text-slate-400 dark:text-muted-foreground" />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-800 dark:text-foreground">
                {copy.emptyTitle}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-muted-foreground max-w-[250px] leading-relaxed">
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
                    className="w-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-accent rounded-lg py-2"
                  >
                    {copy.showMore} (+{Math.min(10, filteredNotifications.length - displayLimit)})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Bar */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center justify-center border-t border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/30 px-4 py-2 text-[11px]">
            <span className="text-[11px] font-medium text-slate-400 dark:text-muted-foreground">
              {copy.showingCount
                .replace("{{shown}}", String(visibleNotifications.length))
                .replace("{{total}}", String(filteredNotifications.length))}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
