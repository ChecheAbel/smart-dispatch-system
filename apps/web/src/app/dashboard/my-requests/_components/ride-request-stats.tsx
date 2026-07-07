"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, ClipboardList, Route } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { fetchRideRequestCount } from "@/lib/ride-request-api";
import type { SupportedLocale } from "@/lib/locale";
import { getCustomerRequestHistoryMessages } from "@/translations";

type RideRequestStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type RideRequestStatsState = {
  total: number;
  pending: number;
  active: number;
  completed: number;
};

const emptyStats: RideRequestStatsState = {
  total: 0,
  pending: 0,
  active: 0,
  completed: 0,
};

export function RideRequestStats({ locale, refreshKey }: RideRequestStatsProps) {
  const copy = getCustomerRequestHistoryMessages(locale);
  const [stats, setStats] = useState<RideRequestStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, pending, confirmed, inProgress, completed] = await Promise.all([
          fetchRideRequestCount({ locale }),
          fetchRideRequestCount({ locale, status: "pending" }),
          fetchRideRequestCount({ locale, status: "confirmed" }),
          fetchRideRequestCount({ locale, status: "in_progress" }),
          fetchRideRequestCount({ locale, status: "completed" }),
        ]);

        if (!cancelled) {
          setStats({
            total,
            pending,
            active: confirmed + inProgress,
            completed,
          });
        }
      } catch {
        if (!cancelled) {
          setStats(emptyStats);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [locale, refreshKey]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={copy.stats.title}
        value={stats.total}
        description={copy.stats.description}
        icon={ClipboardList}
        loading={loading}
      />
      <StatCard
        title={copy.stats.pendingTitle}
        value={stats.pending}
        description={copy.stats.pendingDescription}
        icon={CircleDashed}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={Route}
        loading={loading}
      />
      <StatCard
        title={copy.stats.completedTitle}
        value={stats.completed}
        description={copy.stats.completedDescription}
        icon={CheckCircle2}
        loading={loading}
      />
    </div>
  );
}
