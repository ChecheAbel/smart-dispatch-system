"use client";

import { useEffect, useState } from "react";
import { Award, Medal, Trophy } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminVehicleClassesMessages } from "@/translations";
import { fetchVehicleClassCount } from "@/lib/vehicle-class-api";
import type { SupportedLocale } from "@/lib/locale";

type VehicleClassStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type VehicleClassStatsState = {
  total: number;
  active: number;
  inactive: number;
};

const emptyStats: VehicleClassStatsState = {
  total: 0,
  active: 0,
  inactive: 0,
};

export function VehicleClassStats({ locale, refreshKey }: VehicleClassStatsProps) {
  const copy = getAdminVehicleClassesMessages(locale);
  const [stats, setStats] = useState<VehicleClassStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active] = await Promise.all([
          fetchVehicleClassCount(),
          fetchVehicleClassCount({ is_active: true }),
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
        icon={Award}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={Trophy}
        loading={loading}
      />
      <StatCard
        title={copy.stats.inactiveTitle}
        value={stats.inactive}
        description={copy.stats.inactiveDescription}
        icon={Medal}
        loading={loading}
      />
    </div>
  );
}
