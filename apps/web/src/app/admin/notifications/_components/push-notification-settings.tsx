"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Send, Smartphone } from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminCardClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { fetchPushStatus } from "@/lib/notification-api";
import { cn } from "@/lib/utils";
import { getAdminNotificationsPushMessages } from "@/translations";

function PushSettingsSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

export function PushNotificationSettings() {
  const { locale } = useLocale();
  const copy = getAdminNotificationsPushMessages(locale);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setError(null);

      try {
        const status = await fetchPushStatus();
        if (!cancelled) {
          setConfigured(status.configured);
        }
      } catch {
        if (!cancelled) {
          setError(copy.errors.loadFailed);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [copy.errors.loadFailed]);

  if (loading) {
    return <PushSettingsSkeleton />;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {!configured ? (
        <div
          className={cn(
            adminCardClass,
            "flex items-start gap-3 border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20",
          )}
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-100">{copy.status.notConfiguredTitle}</p>
            <p className="leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              {copy.status.notConfiguredDescription}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            adminCardClass,
            "flex items-start gap-3 border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20",
          )}
        >
          <Smartphone className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">{copy.status.configuredTitle}</p>
            <p className="leading-relaxed text-emerald-800/90 dark:text-emerald-200/90">
              {copy.status.configuredDescription}
            </p>
          </div>
        </div>
      )}

      <div className={cn(adminCardClass, "flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between")}>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{copy.sendCta.title}</p>
          <p className="text-sm leading-relaxed text-slate-500">{copy.sendCta.description}</p>
        </div>
        <Button
          className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
          render={<Link href="/admin/notifications/send" />}
          nativeButton={false}
        >
          <Send className="size-4" />
          {copy.sendCta.button}
        </Button>
      </div>
    </div>
  );
}
