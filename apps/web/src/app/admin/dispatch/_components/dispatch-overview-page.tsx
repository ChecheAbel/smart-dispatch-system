"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, CalendarClock, Route } from "lucide-react";
import type { AdminDispatchOverview } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { AdminRideRequestReviewSheet } from "@/app/admin/ride-requests/_components/admin-ride-request-review-sheet";
import { adminHeadingClass } from "@/lib/admin-theme";
import { fetchAdminDispatchOverview } from "@/lib/dispatch-api";
import { canReadDispatch, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getAdminDispatchMessages, getCustomerRequestsMessages } from "@/translations";
import { DispatchLiveBoard } from "./dispatch-live-board";
import { emptyOverview } from "./dispatch-overview-types";
import { DispatchAlertsBanner } from "./dispatch-alerts-banner";
import { DispatchOverviewStats } from "./dispatch-overview-stats";
import { FleetStrip } from "./dispatch-fleet-strip";
import { AssignmentBoard } from "./dispatch-assignment-board";
import { DisruptionBoard } from "./dispatch-disruption-board";
import { CompactQueue } from "./dispatch-compact-queue";
import { ComplaintsSection } from "./dispatch-complaints-section";

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

  const loadOverview = useCallback(
    async (options?: { silent?: boolean }) => {
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
    },
    [locale],
  );

  useEffect(() => {
    if (!canRead) return;
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

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Page Header */}
      <header className="space-y-1">
        <h1 className={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}>
          {copy.title}
        </h1>
        <p className="max-w-2xl text-xs text-slate-500 dark:text-muted-foreground">
          {copy.description}
        </p>
      </header>

      {/* Triage Alerts Banner */}
      <DispatchAlertsBanner
        overview={data}
        loading={loading}
        canReadRideRequests={canReadRideRequests}
        locale={locale}
        copy={copy}
      />

      {/* Operational Metric Cards */}
      <DispatchOverviewStats
        data={data}
        loading={loading}
        canReadRideRequests={canReadRideRequests}
        canReadComplaints={canReadComplaints}
        showFleet={showFleet}
        fleet={fleet}
        copy={copy}
      />

      {/* Live Board Map & Real-time Vehicle Tracking */}
      {canReadRideRequests && showFleet ? (
        <DispatchLiveBoard
          locale={locale}
          copy={copy}
          onReviewTrip={openReview}
        />
      ) : null}

      {/* Dispatch Queues & Operations Grid */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
        {/* Left Column: Disrupted Trips, Not Started, and Needs Assignment */}
        <div className="min-w-0 space-y-5">
          {canReadRideRequests ? (
            <>
              <DisruptionBoard
                copy={copy}
                items={data.queues.disrupted}
                loading={loading}
                locale={locale}
                statusLabels={requestCopy.status}
                onReview={openReview}
              />

              <CompactQueue
                id="dispatch-not-started"
                title={copy.queues.notStarted}
                description={copy.queues.notStartedDescription}
                href="/admin/ride-requests"
                icon={Clock3}
                items={data.queues.not_started}
                empty={copy.queues.emptyNotStarted}
                emptyHint={copy.queues.emptyNotStartedHint}
                loading={loading}
                viewAll={copy.viewAll}
                unassignedLabel={copy.unassigned}
                locale={locale}
                copy={copy}
                onReview={openReview}
              />

              <AssignmentBoard
                copy={copy}
                items={data.queues.needs_assignment}
                loading={loading}
                locale={locale}
                statusLabels={requestCopy.status}
                onReview={openReview}
              />
            </>
          ) : null}
        </div>

        {/* Right Column: Fleet Strip, Live Now, Upcoming Today, and Complaints */}
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
                copy={copy}
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
                copy={copy}
                onReview={openReview}
              />
            </>
          ) : null}

          {canReadComplaints ? (
            <ComplaintsSection copy={copy} items={data.complaints} loading={loading} />
          ) : null}
        </div>
      </div>

      {/* Review & Reassignment Drawer */}
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
