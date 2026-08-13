"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Clock3, Wrench } from "lucide-react";
import type { VehicleMaintenanceStats } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import type { SupportedLocale } from "@/lib/locale";
import { fetchFleetMaintenanceStats } from "@/lib/vehicle-api";
import { getTranslations } from "@/translations";

const emptyStats: VehicleMaintenanceStats = {
  total: 0,
  open: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
};

export function MaintenanceManagementStats({
  locale,
  refreshKey,
}: {
  locale: SupportedLocale;
  refreshKey: number;
}) {
  const copy = getTranslations(locale).adminVehicleOperations.maintenance.stats;
  const [stats, setStats] = useState<VehicleMaintenanceStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const result = await fetchFleetMaintenanceStats();
        if (!cancelled) setStats(result);
      } catch {
        if (!cancelled) setStats(emptyStats);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={copy.totalTitle}
        value={stats.total}
        description={copy.totalDescription}
        icon={Wrench}
        loading={loading}
      />
      <StatCard
        title={copy.activeTitle}
        value={stats.open + stats.in_progress}
        description={copy.activeDescription}
        icon={Clock3}
        loading={loading}
      />
      <StatCard
        title={copy.completedTitle}
        value={stats.completed}
        description={copy.completedDescription}
        icon={CheckCircle2}
        loading={loading}
      />
      <StatCard
        title={copy.cancelledTitle}
        value={stats.cancelled}
        description={copy.cancelledDescription}
        icon={Ban}
        loading={loading}
      />
    </div>
  );
}
