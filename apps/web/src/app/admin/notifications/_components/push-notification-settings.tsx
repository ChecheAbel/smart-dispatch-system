"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CarFront,
  CheckCircle2,
  ScrollText,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminCardClass, adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { fetchPushStatus } from "@/lib/notification-api";
import { cn } from "@/lib/utils";
import { getAdminNotificationsPushMessages } from "@/translations";

function PushSettingsSkeleton() {
  return <Skeleton className="h-64 w-full rounded-2xl" />;
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
    <div className={cn(adminCardClass, "overflow-hidden rounded-2xl border")}>
      {/* Card Header with Connection Status */}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#1C3A34]/8 text-[#1C3A34] dark:bg-[var(--brand-accent)]/12 dark:text-[var(--brand-accent)]">
            <Smartphone className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={cn("text-base font-bold", adminHeadingClass)}>
                {copy.title}
              </h3>
              {configured ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {copy.status.configuredTitle}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400" />
                  {copy.status.notConfiguredTitle}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">
              {copy.description}
            </p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="space-y-5 p-5 sm:p-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {/* Status Callout */}
        {configured ? (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {copy.status.configuredTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800/90 dark:text-emerald-200/90">
              {copy.status.configuredDescription}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {copy.status.notConfiguredTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              {copy.status.notConfiguredDescription}
            </p>
          </div>
        )}

        {/* Supported Mobile Push Targets */}
        <div>
          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-muted-foreground pb-3">
            Supported notification targets
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-[#1C3A34] shadow-xs dark:border-border dark:bg-card dark:text-foreground">
                  <CarFront className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-foreground">
                    Driver Mobile App
                  </p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    Instant trip dispatch, status updates, and broadcast alerts
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-border dark:bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-[#1C3A34] shadow-xs dark:border-border dark:bg-card dark:text-foreground">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-foreground">
                    Customer Mobile App
                  </p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">
                    Ride confirmation, driver arrival, receipts, and announcements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attached Card Footer */}
      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-border dark:bg-card/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/admin/notification-logs?channel=push" />}
          nativeButton={false}
          className="text-xs font-semibold text-slate-700 dark:border-border dark:text-slate-200"
        >
          <ScrollText className="size-3.5 mr-1.5 text-slate-500" />
          View push delivery logs
        </Button>

        <Button
          className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
          render={<Link href="/admin/notifications/send" />}
          nativeButton={false}
        >
          <Send className="size-4 mr-1.5" />
          {copy.sendCta.button}
        </Button>
      </div>
    </div>
  );
}
