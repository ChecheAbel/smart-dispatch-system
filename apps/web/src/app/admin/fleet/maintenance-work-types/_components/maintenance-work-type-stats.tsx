"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminMaintenanceWorkTypesMessages } from "@/translations";
import { fetchMaintenanceWorkTypeCount } from "@/lib/maintenance-work-type-api";
import type { SupportedLocale } from "@/lib/locale";

type MaintenanceWorkTypeStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type MaintenanceWorkTypeStatsState = {
  total: number;
  active: number;
  inactive: number;
};

const emptyStats: MaintenanceWorkTypeStatsState = {
  total: 0,
  active: 0,
  inactive: 0,
};

export function MaintenanceWorkTypeStats({ locale, refreshKey }: MaintenanceWorkTypeStatsProps) {
  const copy = getAdminMaintenanceWorkTypesMessages(locale);
  const [stats, setStats] = useState<MaintenanceWorkTypeStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active] = await Promise.all([
          fetchMaintenanceWorkTypeCount(),
          fetchMaintenanceWorkTypeCount({ is_active: true }),
        ]);

        if (!cancelled) {
          setStats({
            total,
            active,
            inactive: Math.max(total - active, 0),
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        title={copy.stats.title}
        value={stats.total}
        description={copy.stats.description}
        icon={Wrench}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={Wrench}
        loading={loading}
      />
      <StatCard
        title={copy.stats.inactiveTitle}
        value={stats.inactive}
        description={copy.stats.inactiveDescription}
        icon={Wrench}
        loading={loading}
      />
    </div>
  );
}
