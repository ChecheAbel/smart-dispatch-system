"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagesSquare, Settings2 } from "lucide-react";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import {
  adminBadgeGoldClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getAdminNotificationTemplatesMessages,
  getAdminNotificationsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatTemplatesEnabledSummary } from "./notification-template-placeholders-guide";
import { NotificationTemplatesSettings } from "./notification-templates-settings";

export function NotificationTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const accessCopy = getAdminNotificationsMessages(locale);
  const copy = getAdminNotificationTemplatesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);
  const canWrite = hasPermission(PERMISSIONS.notifications.write);
  const [stats, setStats] = useState({ enabled: 0, total: 0 });

  useEffect(() => {
    if (!searchParams.get("module")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("module", "ride_requests");
      params.set("event", "created");
      router.replace(`/admin/notification-templates?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  if (!canRead) {
    return <PageAccessDenied copy={accessCopy.accessDenied} />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
          <div className="flex items-start gap-3">
            <div className={adminIconBoxClass}>
              <MessagesSquare className="size-5" />
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

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {stats.total > 0 ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
            >
              {formatTemplatesEnabledSummary(locale, stats.enabled, stats.total)}
            </Badge>
          ) : null}

          <Link
            href="/admin/notifications"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#1C3A34] shadow-sm transition-colors hover:bg-[#f8fafb]"
          >
            <Settings2 className="size-4" />
            {accessCopy.title}
          </Link>
        </div>
      </div>

      <NotificationTemplatesSettings canWrite={canWrite} onStatsChange={setStats} />
    </div>
  );
}
