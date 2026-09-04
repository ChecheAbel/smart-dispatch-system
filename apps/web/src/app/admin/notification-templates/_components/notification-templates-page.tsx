"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { PERMISSIONS } from "@/lib/permissions";
import { getAdminNotificationsMessages } from "@/translations";
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
      <NotificationTemplatesSettings canWrite={canWrite} />
    </div>
  );
}
