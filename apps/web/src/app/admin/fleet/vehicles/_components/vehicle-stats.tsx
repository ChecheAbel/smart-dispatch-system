"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Truck, UserCheck, Wrench } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminVehiclesMessages } from "@/translations";
import { fetchVehicleCount } from "@/lib/vehicle-api";
import type { SupportedLocale } from "@/lib/locale";

type VehicleStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type VehicleStatsState = {
  total: number;
  active: number;
  maintenance: number;
  assigned: number;
};

const emptyStats: VehicleStatsState = {
  total: 0,
  active: 0,
  maintenance: 0,
  assigned: 0,
};

export function VehicleStats({ locale, refreshKey }: VehicleStatsProps) {
  const copy = getAdminVehiclesMessages(locale);
  const [stats, setStats] = useState<VehicleStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active, maintenance, assigned] = await Promise.all([
          fetchVehicleCount(),
          fetchVehicleCount({ status: "active" }),
          fetchVehicleCount({ status: "maintenance" }),
          fetchVehicleCount({ assigned_only: true }),
        ]);

        if (!cancelled) {
          setStats({ total, active, maintenance, assigned });
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
        icon={Truck}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={CircleCheck}
        loading={loading}
      />
      <StatCard
        title={copy.stats.maintenanceTitle}
        value={stats.maintenance}
        description={copy.stats.maintenanceDescription}
        icon={Wrench}
        loading={loading}
      />
      <StatCard
        title={copy.stats.assignedTitle}
        value={stats.assigned}
        description={copy.stats.assignedDescription}
        icon={UserCheck}
        loading={loading}
      />
    </div>
  );
}
