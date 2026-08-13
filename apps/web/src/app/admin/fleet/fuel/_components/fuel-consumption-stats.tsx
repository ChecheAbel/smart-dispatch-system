"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Droplets, Fuel, Truck } from "lucide-react";
import type { VehicleFuelStats } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import type { SupportedLocale } from "@/lib/locale";
import { fetchFleetFuelStats } from "@/lib/vehicle-api";
import { getTranslations } from "@/translations";

const emptyStats: VehicleFuelStats = {
  total_logs: 0,
  vehicles_fueled: 0,
  total_liters: 0,
  total_cost: 0,
};

export function FuelConsumptionStats({
  locale,
  refreshKey,
}: {
  locale: SupportedLocale;
  refreshKey: number;
}) {
  const copy = getTranslations(locale).adminVehicleOperations.fuel.stats;
  const [stats, setStats] = useState<VehicleFuelStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const numberFormat = new Intl.NumberFormat(
    locale === "am" ? "am-ET" : "en-US",
    {
      maximumFractionDigits: 2,
    },
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const result = await fetchFleetFuelStats();
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
        title={copy.refillsTitle}
        value={stats.total_logs}
        description={copy.refillsDescription}
        icon={Fuel}
        loading={loading}
      />
      <StatCard
        title={copy.vehiclesTitle}
        value={stats.vehicles_fueled}
        description={copy.vehiclesDescription}
        icon={Truck}
        loading={loading}
      />
      <StatCard
        title={copy.litersTitle}
        value={numberFormat.format(stats.total_liters)}
        description={copy.litersDescription}
        icon={Droplets}
        loading={loading}
      />
      <StatCard
        title={copy.costTitle}
        value={`${numberFormat.format(stats.total_cost)} ETB`}
        description={copy.costDescription}
        icon={CircleDollarSign}
        loading={loading}
      />
    </div>
  );
}
