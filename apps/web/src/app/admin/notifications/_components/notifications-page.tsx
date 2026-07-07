"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Check, Mail, MessageSquare } from "lucide-react";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { getAdminNotificationsMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { EmailNotificationSettings } from "./email-notification-settings";
import { SmsNotificationSettings } from "./sms-notification-settings";

type NotificationTab = "email" | "sms";

function parseTab(value: string | null): NotificationTab {
  return value === "sms" ? "sms" : "email";
}

type ChannelOption = {
  id: NotificationTab;
  title: string;
  description: string;
  icon: typeof Mail;
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
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

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
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <Bell className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}>
              {copy.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              {copy.description}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className={cn("text-sm font-bold", adminHeadingClass)}>{copy.channels.title}</h2>
          <p className="text-sm text-slate-500">{copy.channels.description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
                  "group relative flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#1C3A34]/15",
                  isActive
                    ? "border-[#1C3A34]/25 bg-[#1C3A34]/[0.04] shadow-sm ring-1 ring-[#1C3A34]/10"
                    : cn(adminCardClass, "hover:border-[#C9B87A]/40 hover:bg-[#f8fafb]"),
                )}
              >
                <div
                  className={cn(
                    "rounded-xl p-3 transition-colors",
                    isActive
                      ? "bg-[#1C3A34] text-white"
                      : "bg-[#1C3A34]/8 text-[#1C3A34] group-hover:bg-[#1C3A34]/12",
                  )}
                >
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1 pr-6">
                  <p className={cn("text-sm font-bold", adminHeadingClass)}>{channel.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{channel.description}</p>
                </div>

                {isActive ? (
                  <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-[#1C3A34] text-white">
                    <Check className="size-3" aria-hidden />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {activeTab === "email" ? copy.channels.email.title : copy.channels.sms.title}
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {activeTab === "email" ? (
          <EmailNotificationSettings canWrite={canWrite} />
        ) : (
          <SmsNotificationSettings canWrite={canWrite} />
        )}
      </section>
    </div>
  );
}
