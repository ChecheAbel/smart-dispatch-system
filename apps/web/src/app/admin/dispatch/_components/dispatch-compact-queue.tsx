"use client";

import {
  ArrowRight,
  Car,
  Clock3,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { AdminDispatchQueueItem } from "@smart-dispatch/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatScheduledAt } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { adminCardClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  EscalationBadge,
  SectionHeader,
  type OverviewCopy,
} from "./dispatch-overview-types";

interface CompactQueueProps {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  items: AdminDispatchQueueItem[];
  empty: string;
  emptyHint: string;
  loading: boolean;
  viewAll: string;
  unassignedLabel: string;
  locale: string;
  copy: OverviewCopy;
  onReview: (id: string) => void;
}

export function CompactQueue({
  id,
  title,
  description,
  href,
  icon: Icon,
  items,
  empty,
  emptyHint,
  loading,
  viewAll,
  unassignedLabel,
  locale,
  copy,
  onReview,
}: CompactQueueProps) {
  return (
    <section
      id={id}
      className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24 shadow-sm")}
    >
      <SectionHeader
        icon={Icon}
        title={title}
        description={description}
        count={loading ? undefined : items.length}
        href={href}
        viewAll={viewAll}
      />

      <div className="max-h-[24rem] divide-y divide-slate-100 overflow-y-auto dark:divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2.5 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState icon={Icon} title={empty} hint={emptyHint} />
        ) : (
          items.map((item) => {
            const hasVehicle = Boolean(item.assigned_vehicle_plate);
            const assignment = hasVehicle
              ? [item.assigned_vehicle_plate, item.assigned_driver_name].filter(Boolean).join(" · ")
              : unassignedLabel;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onReview(item.id)}
                className="group flex w-full flex-col gap-1.5 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/90 sm:px-6 dark:hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] text-[10px] font-bold text-[var(--brand-primary)] dark:bg-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)] dark:text-[var(--brand-accent)]">
                      {item.requester_name ? item.requester_name.slice(0, 1).toUpperCase() : "?"}
                    </span>
                    <p className="truncate text-xs font-bold text-slate-900 group-hover:text-[var(--brand-primary)] dark:text-foreground dark:group-hover:text-[var(--brand-accent)]">
                      {item.requester_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <EscalationBadge level={item.escalation_level} copy={copy} />
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-muted dark:text-muted-foreground">
                      <Clock3 className="size-2.5 text-slate-400" />
                      {formatScheduledAt(item.scheduled_at, locale)}
                    </span>
                  </div>
                </div>

                <p className="flex items-center gap-1.5 truncate text-xs text-slate-600 dark:text-muted-foreground">
                  <MapPin className="size-3 shrink-0 text-slate-400" />
                  <span className="truncate">{item.pickup}</span>
                  <ArrowRight className="size-2.5 shrink-0 text-slate-300" />
                  <span className="truncate">{item.dropoff}</span>
                </p>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <Car className="size-3 shrink-0 text-slate-400" />
                  <span
                    className={cn(
                      "truncate font-medium",
                      hasVehicle
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {assignment}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
