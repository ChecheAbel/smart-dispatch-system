"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Mail, MessageSquare, ScrollText, Send, Smartphone } from "lucide-react";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Button } from "@/components/ui/button";
import {
  adminCardClass,
  adminHeadingClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { getAdminNotificationsMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { EmailNotificationSettings } from "./email-notification-settings";
import { PushNotificationSettings } from "./push-notification-settings";
import { SmsNotificationSettings } from "./sms-notification-settings";

type NotificationTab = "email" | "sms" | "push";

function parseTab(value: string | null): NotificationTab {
  if (value === "sms") {
    return "sms";
  }

  if (value === "push") {
    return "push";
  }

  return "email";
}

type ChannelOption = {
  id: NotificationTab;
  title: string;
  description: string;
  icon: typeof Mail;
  badge?: string;
};

export function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminNotificationsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);
  const canWrite = hasPermission(PERMISSIONS.notifications.write);
  const [activeTab, setActiveTab] = useState<NotificationTab>(() =>
    parseTab(searchParams.get("tab")),
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "ride-requests") {
      router.replace("/admin/notification-templates", { scroll: false });
      return;
    }

    setActiveTab(parseTab(tab));
  }, [router, searchParams]);

  function selectTab(tab: NotificationTab) {
    setActiveTab(tab);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/admin/notifications?${params.toString()}`, { scroll: false });
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const channels: ChannelOption[] = [
    {
      id: "email",
      title: copy.channels.email.title,
      description: copy.channels.email.description,
      icon: Mail,
    },
    {
      id: "sms",
      title: copy.channels.sms.title,
      description: copy.channels.sms.description,
      icon: MessageSquare,
    },
    {
      id: "push",
      title: copy.channels.push.title,
      description: copy.channels.push.description,
      icon: Smartphone,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Header / Quick Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={cn("text-base font-bold", adminHeadingClass)}>
            {copy.channels.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-muted-foreground">
            {copy.channels.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/admin/notification-logs" />}
            nativeButton={false}
            className="h-9 gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-border dark:text-slate-200 dark:hover:bg-muted"
          >
            <ScrollText className="size-3.5 text-slate-500 dark:text-muted-foreground" />
            {copy.logsAction ?? "Delivery logs"}
          </Button>

          {canWrite ? (
            <Button
              size="sm"
              render={<Link href="/admin/notifications/send" />}
              nativeButton={false}
              className="h-9 gap-1.5 bg-[#1C3A34] text-xs font-semibold text-white shadow-sm hover:bg-[#152e29] dark:bg-[var(--brand-accent)] dark:text-[#10211d] dark:hover:bg-[#d8c77f]"
            >
              <Send className="size-3.5" />
              {copy.broadcastAction ?? "Send broadcast"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Interactive Channel Selector Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const isActive = activeTab === channel.id;

          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => selectTab(channel.id)}
              aria-pressed={isActive}
              className={cn(
                "group relative flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C3A34]/20 dark:focus-visible:ring-[var(--brand-accent)]/30",
                isActive
                  ? "border-[#1C3A34]/30 bg-white shadow-[inset_3px_0_0_0_#C9B87A] dark:border-[var(--brand-accent)]/45 dark:bg-[#1d242d]"
                  : cn(
                      adminCardClass,
                      "hover:border-slate-300 hover:bg-slate-50/70 dark:hover:border-border/90 dark:hover:bg-muted/30",
                    ),
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-[#1C3A34] text-white dark:bg-[var(--brand-accent)] dark:text-[#10211d]"
                    : "bg-[#1C3A34]/[0.08] text-[#1C3A34] group-hover:bg-[#1C3A34]/[0.12] dark:bg-[var(--brand-accent)]/12 dark:text-[var(--brand-accent)] dark:group-hover:bg-[var(--brand-accent)]/18",
                )}
              >
                <Icon className="size-5" />
              </div>

              <div className="min-w-0 flex-1 space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm font-bold text-slate-900 dark:text-foreground")}>
                    {channel.title}
                  </p>
                  {isActive ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-muted-foreground">
                  {channel.description}
                </p>
              </div>

              {isActive ? (
                <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-[#1C3A34] text-white dark:bg-[var(--brand-accent)] dark:text-[#10211d]">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Active Tab Settings Container */}
      <div className="min-w-0">
        {activeTab === "email" ? (
          <EmailNotificationSettings canWrite={canWrite} />
        ) : activeTab === "sms" ? (
          <SmsNotificationSettings canWrite={canWrite} />
        ) : (
          <PushNotificationSettings />
        )}
      </div>
    </div>
  );
}
