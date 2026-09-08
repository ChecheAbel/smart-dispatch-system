"use client";

import {
  ArrowRight,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Users,
} from "lucide-react";
import type { AdminDispatchQueueItem, RideRequestStatus } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatScheduledAt, statusBadgeClass } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { adminCardClass, adminEyebrowClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/translations";
import {
  EmptyState,
  EscalationBadge,
  SectionHeader,
  SLA_BADGE_CLASS,
  SLA_CARD_CLASS,
  formatDistance,
  slaLabel,
  type OverviewCopy,
} from "./dispatch-overview-types";

interface AssignmentCardProps {
  item: AdminDispatchQueueItem;
  copy: OverviewCopy;
  locale: string;
  statusLabels: Record<RideRequestStatus, string>;
  onReview: (id: string) => void;
}

export function AssignmentCard({
  item,
  copy,
  locale,
  statusLabels,
  onReview,
}: AssignmentCardProps) {
  const sla = item.sla_priority ?? "unscheduled";
  const suggestion = item.suggested_vehicle;
  const suggestionLabel = suggestion
    ? [suggestion.plate_number, suggestion.driver_name].filter(Boolean).join(" · ")
    : copy.allocation.noVehicle;
  const distanceLabel =
    suggestion?.distance_meters != null
      ? formatMessage(copy.allocation.distance, {
          distance: formatDistance(suggestion.distance_meters),
        })
      : null;

  return (
    <article
      className={cn(
        "rounded-xl border p-4.5 shadow-sm transition-all hover:shadow-md",
        SLA_CARD_CLASS[sla],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onReview(item.id)}
          className="group min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-muted dark:text-foreground">
              {item.requester_name ? item.requester_name.slice(0, 1).toUpperCase() : "?"}
            </span>
            <p className="truncate text-sm font-bold text-slate-900 group-hover:text-[var(--brand-primary)] dark:text-foreground dark:group-hover:text-[var(--brand-accent)]">
              {item.requester_name}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Badge variant="outline" className={SLA_BADGE_CLASS[sla]}>
            {slaLabel(sla, copy)}
          </Badge>
          <EscalationBadge level={item.escalation_level} copy={copy} />
          <Badge variant="outline" className={cn("capitalize font-medium", statusBadgeClass(item.status))}>
            {statusLabels[item.status]}
          </Badge>
        </div>
      </div>

      {/* Route Pickup & Dropoff Nodes */}
      <button
        type="button"
        onClick={() => onReview(item.id)}
        className="mt-3.5 w-full rounded-lg bg-white/70 p-3 text-left transition-colors hover:bg-white dark:bg-muted/30 dark:hover:bg-muted/50"
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

      {/* Meta Information: Scheduled & Passengers */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-500 dark:text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Clock3 className="size-3.5 text-slate-400" />
          {formatScheduledAt(item.scheduled_at, locale)}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Users className="size-3.5 text-slate-400" />
          {formatMessage(copy.passengerCount, { count: String(item.passenger_count) })}
        </span>
      </div>

      {/* AI / Automated Vehicle Allocation Recommendation */}
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
          className="h-8 gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] dark:text-[var(--brand-accent)]"
          onClick={() => onReview(item.id)}
        >
          <span>{copy.review}</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}

interface AssignmentBoardProps {
  copy: OverviewCopy;
  items: AdminDispatchQueueItem[];
  loading: boolean;
  locale: string;
  statusLabels: Record<RideRequestStatus, string>;
  onReview: (id: string) => void;
}

export function AssignmentBoard({
  copy,
  items,
  loading,
  locale,
  statusLabels,
  onReview,
}: AssignmentBoardProps) {
  return (
    <section
      id="dispatch-needs"
      className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24 shadow-sm")}
    >
      <SectionHeader
        icon={ClipboardList}
        title={copy.queues.needsAssignment}
        description={copy.queues.needsAssignmentDescription}
        count={loading ? undefined : items.length}
        href="/admin/ride-requests"
        viewAll={copy.viewAll}
      />

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
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
            title={copy.queues.emptyNeedsAssignment}
            hint={copy.queues.emptyNeedsHint}
            tone="success"
          />
        ) : (
          <div className="grid gap-3.5">
            {items.map((item) => (
              <AssignmentCard
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
