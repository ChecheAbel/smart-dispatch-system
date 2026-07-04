"use client";

import { useEffect, useState } from "react";
import { MapPin, MapPinOff, MapPinned } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminLocationsMessages } from "@/translations";
import { fetchLocationCount } from "@/lib/location-api";
import type { SupportedLocale } from "@/lib/locale";

type LocationStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type LocationStatsState = {
  total: number;
  active: number;
  inactive: number;
};

const emptyStats: LocationStatsState = {
  total: 0,
  active: 0,
  inactive: 0,
};

export function LocationStats({ locale, refreshKey }: LocationStatsProps) {
  const copy = getAdminLocationsMessages(locale);
  const [stats, setStats] = useState<LocationStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active] = await Promise.all([
          fetchLocationCount(),
          fetchLocationCount({ is_active: true }),
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
        icon={MapPin}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={MapPinned}
        loading={loading}
      />
      <StatCard
        title={copy.stats.inactiveTitle}
        value={stats.inactive}
        description={copy.stats.inactiveDescription}
        icon={MapPinOff}
        loading={loading}
      />
    </div>
  );
}
