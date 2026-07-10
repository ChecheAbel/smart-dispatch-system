"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagesSquare } from "lucide-react";
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
import { NotificationTemplatesSettings } from "./notification-templates-settings";
import {
  NOTIFICATION_MODULE_ORDER,
  parseNotificationModule,
} from "./notification-template-modules";
import { MODULE_EVENTS } from "./notification-template-shared";

export function NotificationTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const accessCopy = getAdminNotificationsMessages(locale);
  const copy = getAdminNotificationTemplatesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);
  const canWrite = hasPermission(PERMISSIONS.notifications.write);

  useEffect(() => {
    if (!searchParams.get("module")) {
      const defaultModule = NOTIFICATION_MODULE_ORDER[0];
      const params = new URLSearchParams(searchParams.toString());
      params.set("module", defaultModule);
      params.set("event", MODULE_EVENTS[defaultModule][0]);
      router.replace(`/admin/notification-templates?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  if (!canRead) {
    return <PageAccessDenied copy={accessCopy.accessDenied} />;
  }

  return (
    <div className="min-w-0 space-y-6">
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

      <NotificationTemplatesSettings canWrite={canWrite} />
    </div>
  );
}
