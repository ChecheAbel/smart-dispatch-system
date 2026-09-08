"use client";

import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Clock3,
  MessageSquareWarning,
  Route,
  Truck,
} from "lucide-react";
import type { AdminDispatchOverview } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { formatMessage } from "@/translations";
import {
  DisruptedTripsHelp,
  scrollToSection,
  type OverviewCopy,
} from "./dispatch-overview-types";

interface DispatchOverviewStatsProps {
  data: AdminDispatchOverview;
  loading: boolean;
  canReadRideRequests: boolean;
  canReadComplaints: boolean;
  showFleet: boolean;
  fleet: { dispatchable: number; available: number; busy: number };
  copy: OverviewCopy;
}

export function DispatchOverviewStats({
  data,
  loading,
  canReadRideRequests,
  canReadComplaints,
  showFleet,
  fleet,
  copy,
}: DispatchOverviewStatsProps) {
  const waitingLabel = formatMessage(copy.waitingCount, {
    count: String(data.counts.needs_assignment),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {canReadRideRequests ? (
        <>
          <StatCard
            title={copy.stats.disrupted}
            value={data.counts.disrupted}
            description={copy.stats.disruptedDescription}
            icon={AlertTriangle}
            loading={loading}
            active={data.counts.disrupted > 0}
            onClick={() => scrollToSection("dispatch-disrupted")}
            titleAccessory={<DisruptedTripsHelp copy={copy} />}
          />
          <StatCard
            title={copy.stats.notStarted}
            value={data.counts.not_started}
            description={copy.stats.notStartedDescription}
            icon={Clock3}
            loading={loading}
            active={data.counts.not_started > 0}
            onClick={() => scrollToSection("dispatch-not-started")}
          />
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
  );
}
