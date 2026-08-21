"use client";

import { useEffect, useState } from "react";
import { IdCard, UserCheck, UserMinus, UserX } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminDriversMessages } from "@/translations";
import { fetchUserCount } from "@/lib/user-api";
import type { SupportedLocale } from "@/lib/locale";

type DriverStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type DriverStatsState = {
  total: number;
  active: number;
  unassigned: number;
  suspended: number;
};

const emptyStats: DriverStatsState = {
  total: 0,
  active: 0,
  unassigned: 0,
  suspended: 0,
};

const hiredDriverFilter = {
  role_slug: "driver" as const,
  account_activation: "activated" as const,
};

export function DriverStats({ locale, refreshKey }: DriverStatsProps) {
  const copy = getAdminDriversMessages(locale).directory;
  const [stats, setStats] = useState<DriverStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active, unassigned, suspended] = await Promise.all([
          fetchUserCount(hiredDriverFilter),
          fetchUserCount({ ...hiredDriverFilter, account_status: "active" }),
          fetchUserCount({ ...hiredDriverFilter, has_assigned_vehicle: false }),
          fetchUserCount({ ...hiredDriverFilter, account_status: "suspended" }),
        ]);

        if (!cancelled) {
          setStats({ total, active, unassigned, suspended });
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
        icon={IdCard}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={UserCheck}
        loading={loading}
      />
      <StatCard
        title={copy.stats.unassignedTitle}
        value={stats.unassigned}
        description={copy.stats.unassignedDescription}
        icon={UserMinus}
        loading={loading}
      />
      <StatCard
        title={copy.stats.suspendedTitle}
        value={stats.suspended}
        description={copy.stats.suspendedDescription}
        icon={UserX}
        loading={loading}
      />
    </div>
  );
}
