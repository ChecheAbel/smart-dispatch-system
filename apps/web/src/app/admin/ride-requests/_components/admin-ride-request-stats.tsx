"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleCheckBig,
  ClipboardList,
  Route,
  Truck,
  XCircle,
} from "lucide-react";
import type { RideRequestStatus } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { fetchAdminRideRequestCount } from "@/lib/admin-ride-request-api";
import type { SupportedLocale } from "@/lib/locale";
import { getAdminRideRequestsMessages } from "@/translations";

export type AdminRideRequestListFilter = RideRequestStatus | "all" | "upcoming";

type AdminRideRequestStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
  activeFilter: AdminRideRequestListFilter;
  onFilterChange: (filter: AdminRideRequestListFilter) => void;
};

type AdminRideRequestStatsState = {
  total: number;
  pending: number;
  confirmed: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

const emptyStats: AdminRideRequestStatsState = {
  total: 0,
  pending: 0,
  confirmed: 0,
  upcoming: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
};

export function AdminRideRequestStats({
  locale,
  refreshKey,
  activeFilter,
  onFilterChange,
}: AdminRideRequestStatsProps) {
  const copy = getAdminRideRequestsMessages(locale);
  const [stats, setStats] = useState<AdminRideRequestStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isStale = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, pending, confirmed, upcoming, inProgress, completed, cancelledCount] =
          await Promise.all([
            fetchAdminRideRequestCount({ locale }),
            fetchAdminRideRequestCount({ locale, status: "pending" }),
            fetchAdminRideRequestCount({ locale, status: "confirmed" }),
            fetchAdminRideRequestCount({ locale, upcoming: true }),
            fetchAdminRideRequestCount({ locale, status: "in_progress" }),
            fetchAdminRideRequestCount({ locale, status: "completed" }),
            fetchAdminRideRequestCount({ locale, status: "cancelled" }),
          ]);

        if (!isStale) {
          setStats({
            total,
            pending,
            confirmed,
            upcoming,
            inProgress,
            completed,
            cancelled: cancelledCount,
          });
        }
      } catch {
        if (!isStale) {
          setStats(emptyStats);
        }
      } finally {
        if (!isStale) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      isStale = true;
    };
  }, [locale, refreshKey]);

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.5rem),1fr))] gap-4">
      <StatCard
        title={copy.stats.title}
        value={stats.total}
        description={copy.stats.description}
        icon={ClipboardList}
        loading={loading}
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <StatCard
        title={copy.stats.pendingTitle}
        value={stats.pending}
        description={copy.stats.pendingDescription}
        icon={Route}
        loading={loading}
        active={activeFilter === "pending"}
        onClick={() => onFilterChange("pending")}
      />
      <StatCard
        title={copy.stats.confirmedTitle}
        value={stats.confirmed}
        description={copy.stats.confirmedDescription}
        icon={CheckCircle2}
        loading={loading}
        active={activeFilter === "confirmed"}
        onClick={() => onFilterChange("confirmed")}
      />
      <StatCard
        title={copy.stats.upcomingTitle}
        value={stats.upcoming}
        description={copy.stats.upcomingDescription}
        icon={CalendarClock}
        loading={loading}
        active={activeFilter === "upcoming"}
        onClick={() => onFilterChange("upcoming")}
      />
      <StatCard
        title={copy.stats.inProgressTitle}
        value={stats.inProgress}
        description={copy.stats.inProgressDescription}
        icon={Truck}
        loading={loading}
        active={activeFilter === "in_progress"}
        onClick={() => onFilterChange("in_progress")}
      />
      <StatCard
        title={copy.stats.completedTitle}
        value={stats.completed}
        description={copy.stats.completedDescription}
        icon={CircleCheckBig}
        loading={loading}
        active={activeFilter === "completed"}
        onClick={() => onFilterChange("completed")}
      />
      <StatCard
        title={copy.stats.cancelledTitle}
        value={stats.cancelled}
        description={copy.stats.cancelledDescription}
        icon={XCircle}
        loading={loading}
        active={activeFilter === "cancelled"}
        onClick={() => onFilterChange("cancelled")}
      />
    </div>
  );
}
