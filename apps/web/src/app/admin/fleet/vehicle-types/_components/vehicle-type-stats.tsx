"use client";

import { useEffect, useState } from "react";
import { Layers, Layers2, Layers3 } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminVehicleTypesMessages } from "@/translations";
import { fetchVehicleTypeCount } from "@/lib/vehicle-type-api";
import type { SupportedLocale } from "@/lib/locale";

type VehicleTypeStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type VehicleTypeStatsState = {
  total: number;
  active: number;
  inactive: number;
};

const emptyStats: VehicleTypeStatsState = {
  total: 0,
  active: 0,
  inactive: 0,
};

export function VehicleTypeStats({ locale, refreshKey }: VehicleTypeStatsProps) {
  const copy = getAdminVehicleTypesMessages(locale);
  const [stats, setStats] = useState<VehicleTypeStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active] = await Promise.all([
          fetchVehicleTypeCount(),
          fetchVehicleTypeCount({ is_active: true }),
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
        icon={Layers}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={Layers2}
        loading={loading}
      />
      <StatCard
        title={copy.stats.inactiveTitle}
        value={stats.inactive}
        description={copy.stats.inactiveDescription}
        icon={Layers3}
        loading={loading}
      />
    </div>
  );
}
