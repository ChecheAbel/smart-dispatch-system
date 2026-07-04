"use client";

import { useEffect, useState } from "react";
import { Route } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminEndpointsMessages } from "@/translations";
import { fetchEndpointCount } from "@/lib/endpoint-api";
import type { SupportedLocale } from "@/lib/locale";

type EndpointStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

export function EndpointStats({ locale, refreshKey }: EndpointStatsProps) {
  const copy = getAdminEndpointsMessages(locale);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const count = await fetchEndpointCount();
        if (!cancelled) {
          setTotal(count);
        }
      } catch {
        if (!cancelled) {
          setTotal(0);
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
    <div className="max-w-sm">
      <StatCard
        title={copy.stats.title}
        value={total}
        description={copy.stats.description}
        icon={Route}
        loading={loading}
      />
    </div>
  );
}
