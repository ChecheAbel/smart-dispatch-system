"use client";

import {
  AlertTriangle,
  ArrowRight,
  CarFront,
  CheckCircle2,
  Clock3,
  Truck,
} from "lucide-react";
import type { AdminDispatchQueueItem, RideRequestStatus } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatScheduledAt, statusBadgeClass } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { adminCardClass, adminEyebrowClass, adminHeadingClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/translations";
import {
  DisruptedTripsHelp,
  EmptyState,
  EscalationBadge,
  SectionHeader,
  disruptionLabel,
  formatDistance,
  type OverviewCopy,
} from "./dispatch-overview-types";

interface DisruptionCardProps {
  item: AdminDispatchQueueItem;
  copy: OverviewCopy;
  locale: string;
  statusLabels: Record<RideRequestStatus, string>;
  onReview: (id: string) => void;
}

export function DisruptionCard({
  item,
  copy,
  locale,
  statusLabels,
  onReview,
}: DisruptionCardProps) {
  const suggestion = item.suggested_vehicle;
  const suggestionLabel = suggestion
    ? [suggestion.plate_number, suggestion.driver_name].filter(Boolean).join(" · ")
    : copy.allocation.noVehicle;
  const currentLabel = [item.assigned_vehicle_plate, item.assigned_driver_name]
    .filter(Boolean)
    .join(" · ");
  const distanceLabel =
    suggestion?.distance_meters != null
      ? formatMessage(copy.allocation.distance, {
          distance: formatDistance(suggestion.distance_meters),
        })
      : null;

  return (
    <article className="rounded-xl border border-red-200/90 border-l-[4px] border-l-red-500 bg-red-50/30 p-4.5 shadow-sm transition-all hover:shadow-md dark:border-red-400/25 dark:border-l-red-400 dark:bg-red-400/8">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onReview(item.id)}
          className="group min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/30"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-800 dark:bg-red-950/40 dark:text-red-300">
              {item.requester_name ? item.requester_name.slice(0, 1).toUpperCase() : "?"}
            </span>
            <p className="truncate text-sm font-bold text-slate-900 group-hover:text-red-600 dark:text-foreground dark:group-hover:text-red-300">
              {item.requester_name}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {item.disruption_reason ? (
            <Badge
              variant="outline"
              className="border-red-200 bg-red-100/70 font-semibold text-red-800 dark:border-red-400/30 dark:bg-red-400/15 dark:text-red-200"
            >
              <AlertTriangle className="mr-1 size-3 text-red-600 dark:text-red-400" />
              {disruptionLabel(item.disruption_reason, copy)}
            </Badge>
          ) : null}
          <EscalationBadge level={item.escalation_level} copy={copy} />
          <Badge variant="outline" className={cn("capitalize font-medium", statusBadgeClass(item.status))}>
            {statusLabels[item.status]}
          </Badge>
        </div>
      </div>

      {/* Pickup & Dropoff Route */}
      <button
        type="button"
        onClick={() => onReview(item.id)}
        className="mt-3.5 w-full rounded-lg bg-white/80 p-3 text-left transition-colors hover:bg-white dark:bg-muted/30 dark:hover:bg-muted/50"
      >
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500 shadow-xs" />
            <div className="min-w-0">
              <p className={cn(adminEyebrowClass, "text-[10px]")}>{copy.pickup}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-foreground">
                {item.pickup}
              </p>
            </div>
          </div>
          <div className="ml-[4px] h-3 w-px bg-slate-200 dark:bg-border" />
          <div className="flex items-start gap-2.5">
            <span className="mt-1 size-2.5 shrink-0 rounded-full border-2 border-red-500 bg-white dark:bg-card shadow-xs" />
            <div className="min-w-0">
              <p className={cn(adminEyebrowClass, "text-[10px]")}>{copy.dropoff}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-foreground">
                {item.dropoff}
              </p>
            </div>
          </div>
        </div>
      </button>

      {/* Timing and Disrupted Assignment */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-500 dark:text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Clock3 className="size-3.5 text-slate-400" />
          {formatScheduledAt(item.scheduled_at, locale)}
        </span>
        {currentLabel ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <Truck className="size-3.5 text-amber-500" />
            {currentLabel}
          </span>
        ) : null}
      </div>

      {/* AI Suggested Reassignment */}
      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-2xs dark:border-border dark:bg-muted/40">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] text-[var(--brand-primary)] dark:bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] dark:text-[var(--brand-accent)]">
          <CarFront className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn(adminEyebrowClass, "text-[10px]")}>{copy.allocation.suggested}</p>
          <p className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-foreground">
            {suggestionLabel}
          </p>
          {distanceLabel ? (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-muted-foreground">
              {distanceLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-950/40"
          onClick={() => onReview(item.id)}
        >
          <span>{copy.review}</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}

interface DisruptionBoardProps {
  copy: OverviewCopy;
  items: AdminDispatchQueueItem[];
  loading: boolean;
  locale: string;
  statusLabels: Record<RideRequestStatus, string>;
  onReview: (id: string) => void;
}

export function DisruptionBoard({
  copy,
  items,
  loading,
  locale,
  statusLabels,
  onReview,
}: DisruptionBoardProps) {
  return (
    <section
      id="dispatch-disrupted"
      className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24 shadow-sm")}
    >
      <SectionHeader
        icon={AlertTriangle}
        title={copy.queues.disrupted}
        description={copy.queues.disruptedDescription}
        count={loading ? undefined : items.length}
        href="/admin/ride-requests"
        viewAll={copy.viewAll}
        titleHint={
          <h2 className={cn("text-base font-semibold", adminHeadingClass)}>
            <DisruptedTripsHelp
              copy={copy}
              label={copy.queues.disrupted}
              labelClassName="text-base font-semibold"
            />
          </h2>
        }
      />

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-slate-200/80 p-4 dark:border-border"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={copy.queues.emptyDisrupted}
            hint={copy.queues.emptyDisruptedHint}
            tone="success"
          />
        ) : (
          <div className="grid gap-3.5">
            {items.map((item) => (
              <DisruptionCard
                key={item.id}
                item={item}
                copy={copy}
                locale={locale}
                statusLabels={statusLabels}
                onReview={onReview}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
