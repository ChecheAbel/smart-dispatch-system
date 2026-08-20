"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  MessageSquareWarning,
  Route,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AdminDispatchComplaintItem,
  AdminDispatchOverview,
  AdminDispatchQueueItem,
  ComplaintPriority,
  DispatchSlaPriority,
  RideRequestStatus,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatScheduledAt,
  statusBadgeClass,
} from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { AdminRideRequestReviewSheet } from "@/app/admin/ride-requests/_components/admin-ride-request-review-sheet";
import {
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { fetchAdminDispatchOverview } from "@/lib/dispatch-api";
import { canReadDispatch, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { formatMessage, getAdminDispatchMessages, getCustomerRequestsMessages } from "@/translations";

const emptyOverview: AdminDispatchOverview = {
  counts: {
    pending_approval: 0,
    needs_assignment: 0,
    in_progress: 0,
    upcoming_today: 0,
    open_complaints: 0,
    urgent_complaints: 0,
  },
  fleet: null,
  queues: {
    needs_assignment: [],
    in_progress: [],
    upcoming_today: [],
  },
  complaints: [],
};

const SLA_BADGE_CLASS: Record<DispatchSlaPriority, string> = {
  overdue: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  due_soon: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  on_track: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
  unscheduled: "border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
};

const SLA_CARD_CLASS: Record<DispatchSlaPriority, string> = {
  overdue:
    "border-l-[3px] border-l-red-500 border-red-100 bg-red-50/40 dark:border-red-400/25 dark:border-l-red-400 dark:bg-red-400/8",
  due_soon:
    "border-l-[3px] border-l-amber-500 border-amber-100 bg-amber-50/30 dark:border-amber-400/25 dark:border-l-amber-400 dark:bg-amber-400/8",
  on_track:
    "border-l-[3px] border-l-emerald-500 border-slate-200/80 bg-white dark:border-border dark:border-l-emerald-400 dark:bg-card",
  unscheduled:
    "border-l-[3px] border-l-slate-300 border-slate-200/80 bg-white dark:border-border dark:border-l-muted-foreground/40 dark:bg-card",
};

const PRIORITY_BADGE_CLASS: Record<ComplaintPriority, string> = {
  urgent: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  high: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200",
  medium: "border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
  low: "border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
};

type OverviewCopy = ReturnType<typeof getAdminDispatchMessages>;

function slaLabel(priority: DispatchSlaPriority, copy: OverviewCopy) {
  if (priority === "overdue") return copy.sla.overdue;
  if (priority === "due_soon") return copy.sla.dueSoon;
  if (priority === "on_track") return copy.sla.onTrack;
  return copy.sla.unscheduled;
}

function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  count,
  href,
  viewAll,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  href: string;
  viewAll: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-border">
      <div className="flex min-w-0 items-start gap-3">
        <div className={adminIconBoxClass}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn("text-base font-semibold", adminHeadingClass)}>{title}</h2>
            {typeof count === "number" ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-muted dark:text-muted-foreground">
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
        {action}
        <Button variant="outline" size="sm" render={<Link href={href} />} nativeButton={false}>
          {viewAll}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center sm:px-6">
      <div
        className={cn(
          "mb-3 flex size-11 items-center justify-center rounded-full",
          tone === "success"
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-300"
            : "bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">{hint}</p>
    </div>
  );
}

function AssignmentCard({
  item,
  copy,
  locale,
  statusLabels,
  onReview,
}: {
  item: AdminDispatchQueueItem;
  copy: OverviewCopy;
  locale: string;
  statusLabels: Record<RideRequestStatus, string>;
  onReview: (id: string) => void;
}) {
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
        "rounded-xl border p-4 shadow-sm transition-colors",
        SLA_CARD_CLASS[sla],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onReview(item.id)}
          className="min-w-0 flex-1 rounded-md text-left"
        >
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-foreground">
            {item.requester_name}
          </p>
        </button>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Badge variant="outline" className={SLA_BADGE_CLASS[sla]}>
            {slaLabel(sla, copy)}
          </Badge>
          <Badge variant="outline" className={cn("capitalize", statusBadgeClass(item.status))}>
            {statusLabels[item.status]}
          </Badge>
        </div>
      </div>

      <button type="button" onClick={() => onReview(item.id)} className="mt-3 w-full rounded-md text-left">
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" />
            <div className="min-w-0">
              <p className={adminEyebrowClass}>{copy.pickup}</p>
              <p className="mt-0.5 truncate text-sm text-slate-700 dark:text-foreground">{item.pickup}</p>
            </div>
          </div>
          <div className="ml-[3px] h-3 w-px bg-slate-200 dark:bg-border" />
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 size-2 shrink-0 rounded-full border-2 border-red-400 bg-white dark:bg-card" />
            <div className="min-w-0">
              <p className={adminEyebrowClass}>{copy.dropoff}</p>
              <p className="mt-0.5 truncate text-sm text-slate-700 dark:text-foreground">{item.dropoff}</p>
            </div>
          </div>
        </div>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3.5" />
          {formatScheduledAt(item.scheduled_at, locale)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {formatMessage(copy.passengerCount, { count: String(item.passenger_count) })}
        </span>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 dark:border-border dark:bg-muted/30">
        <CarFront className="mt-0.5 size-4 shrink-0 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
        <div className="min-w-0 flex-1">
          <p className={adminEyebrowClass}>{copy.allocation.suggested}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-foreground">
            {suggestionLabel}
          </p>
          {distanceLabel ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">{distanceLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onReview(item.id)}>
          {copy.review}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}

function AssignmentBoard({
  copy,
  items,
  loading,
  locale,
  statusLabels,
  onReview,
}: {
  copy: OverviewCopy;
  items: AdminDispatchQueueItem[];
  loading: boolean;
  locale: string;
  statusLabels: Record<RideRequestStatus, string>;
  onReview: (id: string) => void;
}) {
  return (
    <section id="dispatch-needs" className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24")}>
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
              <div key={index} className="space-y-3 rounded-xl border border-slate-200/80 p-4 dark:border-border">
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
          <div className="grid gap-3">
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

function CompactQueue({
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
  onReview,
}: {
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
  onReview: (id: string) => void;
}) {
  return (
    <section id={id} className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24")}>
      <SectionHeader
        icon={Icon}
        title={title}
        description={description}
        count={loading ? undefined : items.length}
        href={href}
        viewAll={viewAll}
      />

      <div className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto dark:divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState icon={Icon} title={empty} hint={emptyHint} />
        ) : (
          items.map((item) => {
            const assignment = item.assigned_vehicle_plate
              ? [item.assigned_vehicle_plate, item.assigned_driver_name].filter(Boolean).join(" · ")
              : unassignedLabel;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onReview(item.id)}
                className="flex w-full flex-col gap-1 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/90 sm:px-6 dark:hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-foreground">
                    {item.requester_name}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-muted-foreground">
                    {formatScheduledAt(item.scheduled_at, locale)}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 truncate text-sm text-slate-600 dark:text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {item.pickup} → {item.dropoff}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-muted-foreground">{assignment}</p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function ComplaintsSection({
  copy,
  items,
  loading,
}: {
  copy: OverviewCopy;
  items: AdminDispatchComplaintItem[];
  loading: boolean;
}) {
  return (
    <section id="dispatch-complaints" className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24")}>
      <SectionHeader
        icon={MessageSquareWarning}
        title={copy.complaints.title}
        description={copy.complaints.description}
        count={loading ? undefined : items.length}
        href="/admin/complaints"
        viewAll={copy.viewAll}
      />

      <div className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto dark:divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState icon={MessageSquareWarning} title={copy.complaints.empty} hint={copy.complaints.emptyHint} />
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href="/admin/complaints"
              className="flex flex-col gap-1.5 px-5 py-3.5 transition-colors hover:bg-slate-50/90 sm:px-6 dark:hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-foreground">
                  {item.subject}
                </p>
                <Badge variant="outline" className={cn("capitalize", PRIORITY_BADGE_CLASS[item.priority])}>
                  {copy.complaints[item.priority]}
                </Badge>
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-muted-foreground">
                {item.requester_name} · {item.reference_number}
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function FleetStrip({
  copy,
  fleet,
  loading,
}: {
  copy: OverviewCopy;
  fleet: { dispatchable: number; available: number; busy: number };
  loading: boolean;
}) {
  return (
    <section id="dispatch-fleet" className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24")}>
      <SectionHeader
        icon={Truck}
        title={copy.fleet.title}
        description={copy.fleet.description}
        href="/admin/fleet/vehicles"
        viewAll={copy.fleet.viewVehicles}
      />
      <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-border">
        {[
          {
            label: copy.fleet.dispatchable,
            value: fleet.dispatchable,
            className: "text-slate-800 dark:text-foreground",
          },
          {
            label: copy.fleet.available,
            value: fleet.available,
            className: "text-emerald-700 dark:text-emerald-300",
          },
          {
            label: copy.fleet.busy,
            value: fleet.busy,
            className: "text-amber-700 dark:text-amber-200",
          },
        ].map((tile) => (
          <div key={tile.label} className="px-4 py-4 text-center sm:px-5">
            <p className="text-[11px] font-medium leading-tight text-slate-500 dark:text-muted-foreground">
              {tile.label}
            </p>
            {loading ? (
              <Skeleton className="mx-auto mt-2 h-7 w-10" />
            ) : (
              <p className={cn("mt-1 text-2xl font-bold tabular-nums tracking-tight", tile.className)}>
                {tile.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DispatchOverviewPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDispatchMessages(locale);
  const requestCopy = getCustomerRequestsMessages(locale);
  const canRead = canReadDispatch(hasPermission);
  const canReadRideRequests = hasPermission(PERMISSIONS.ride_requests.read);
  const canReadComplaints = hasPermission(PERMISSIONS.complaints.read);
  const canReadVehicles = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.ride_requests.write);

  const [overview, setOverview] = useState<AdminDispatchOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);

  const loadOverview = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const next = await fetchAdminDispatchOverview(locale);
      setOverview(next);
    } catch {
      if (!options?.silent) {
        setOverview(emptyOverview);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [locale]);

  useEffect(() => {
    if (!canRead) {
      return;
    }

    void loadOverview();
  }, [canRead, loadOverview]);

  function openReview(id: string) {
    setReviewRequestId(id);
    setReviewOpen(true);
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const data = overview;
  const showFleet = canReadVehicles;
  const fleet = data.fleet ?? { dispatchable: 0, available: 0, busy: 0 };
  const waitingLabel = formatMessage(copy.waitingCount, {
    count: String(data.counts.needs_assignment),
  });

  return (
    <div className="w-full max-w-none space-y-6">
      <header className="space-y-1">
        <h1 className={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}>
          {copy.title}
        </h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">{copy.description}</p>
      </header>

      {!loading && data.counts.urgent_complaints > 0 ? (
        <button
          type="button"
          onClick={() => scrollToSection("dispatch-complaints")}
          className="flex w-full items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-left text-sm text-red-900 transition-colors hover:bg-red-50 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100 dark:hover:bg-red-400/15"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {formatMessage(copy.attentionUrgentComplaints, {
              count: String(data.counts.urgent_complaints),
            })}
          </span>
          <span className="shrink-0 font-semibold">{copy.attentionView}</span>
        </button>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {canReadRideRequests ? (
          <>
            <StatCard
              title={copy.stats.needsAssignment}
              value={data.counts.needs_assignment}
              description={
                data.counts.needs_assignment > 0 ? waitingLabel : copy.stats.needsAssignmentDescription
              }
              icon={ClipboardList}
              loading={loading}
              active={data.counts.needs_assignment > 0}
              onClick={() => scrollToSection("dispatch-needs")}
            />
            <StatCard
              title={copy.stats.liveNow}
              value={data.counts.in_progress}
              description={copy.stats.liveNowDescription}
              icon={Route}
              loading={loading}
              onClick={() => scrollToSection("dispatch-live")}
            />
            <StatCard
              title={copy.stats.upcomingToday}
              value={data.counts.upcoming_today}
              description={copy.stats.upcomingTodayDescription}
              icon={CalendarClock}
              loading={loading}
              onClick={() => scrollToSection("dispatch-upcoming")}
            />
          </>
        ) : null}
        {showFleet ? (
          <StatCard
            title={copy.stats.availableVehicles}
            value={fleet.available}
            description={copy.stats.availableVehiclesDescription}
            icon={Truck}
            loading={loading}
            onClick={() => scrollToSection("dispatch-fleet")}
          />
        ) : null}
        {canReadComplaints ? (
          <StatCard
            title={copy.stats.openComplaints}
            value={data.counts.open_complaints}
            description={copy.stats.openComplaintsDescription}
            icon={MessageSquareWarning}
            loading={loading}
            active={data.counts.urgent_complaints > 0}
            onClick={() => scrollToSection("dispatch-complaints")}
          />
        ) : null}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
        <div className="min-w-0 space-y-5">
          {canReadRideRequests ? (
            <AssignmentBoard
              copy={copy}
              items={data.queues.needs_assignment}
              loading={loading}
              locale={locale}
              statusLabels={requestCopy.status}
              onReview={openReview}
            />
          ) : null}
        </div>

        <div className="min-w-0 space-y-5">
          {showFleet ? <FleetStrip copy={copy} fleet={fleet} loading={loading} /> : null}
          {canReadRideRequests ? (
            <>
              <CompactQueue
                id="dispatch-live"
                title={copy.queues.liveNow}
                description={copy.queues.liveNowDescription}
                href="/admin/ride-requests"
                icon={Route}
                items={data.queues.in_progress}
                empty={copy.queues.emptyLiveNow}
                emptyHint={copy.queues.emptyLiveHint}
                loading={loading}
                viewAll={copy.viewAll}
                unassignedLabel={copy.unassigned}
                locale={locale}
                onReview={openReview}
              />
              <CompactQueue
                id="dispatch-upcoming"
                title={copy.queues.upcomingToday}
                description={copy.queues.upcomingTodayDescription}
                href="/admin/ride-requests"
                icon={CalendarClock}
                items={data.queues.upcoming_today}
                empty={copy.queues.emptyUpcomingToday}
                emptyHint={copy.queues.emptyUpcomingHint}
                loading={loading}
                viewAll={copy.viewAll}
                unassignedLabel={copy.unassigned}
                locale={locale}
                onReview={openReview}
              />
            </>
          ) : null}
          {canReadComplaints ? (
            <ComplaintsSection copy={copy} items={data.complaints} loading={loading} />
          ) : null}
        </div>
      </div>

      <AdminRideRequestReviewSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        requestId={reviewRequestId}
        locale={locale}
        canWrite={canWrite}
        onSuccess={() => {
          void loadOverview({ silent: true });
        }}
      />
    </div>
  );
}
