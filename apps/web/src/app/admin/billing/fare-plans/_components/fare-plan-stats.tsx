"use client";

import { useEffect, useState } from "react";
import { Coins, Gauge, Receipt } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminFarePlansMessages } from "@/translations";
import { fetchFarePlanCount } from "@/lib/fare-plan-api";
import type { SupportedLocale } from "@/lib/locale";

type FarePlanStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type FarePlanStatsState = {
  total: number;
  active: number;
  distanceTime: number;
};

const emptyStats: FarePlanStatsState = {
  total: 0,
  active: 0,
  distanceTime: 0,
};

export function FarePlanStats({ locale, refreshKey }: FarePlanStatsProps) {
  const copy = getAdminFarePlansMessages(locale);
  const [stats, setStats] = useState<FarePlanStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active, distanceTime] = await Promise.all([
          fetchFarePlanCount(),
          fetchFarePlanCount({ is_active: true }),
          fetchFarePlanCount({ pricing_model: "distance_time" }),
        ]);

        if (!cancelled) {
          setStats({ total, active, distanceTime });
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        title={copy.stats.title}
        value={stats.total}
        description={copy.stats.description}
        icon={Receipt}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={Coins}
        loading={loading}
      />
      <StatCard
        title={copy.stats.distanceTimeTitle}
        value={stats.distanceTime}
        description={copy.stats.distanceTimeDescription}
        icon={Gauge}
        loading={loading}
      />
    </div>
  );
}
