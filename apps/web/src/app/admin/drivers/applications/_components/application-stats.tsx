"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { fetchDriverApplicationCount } from "@/lib/driver-application-api";
import type { SupportedLocale } from "@/lib/locale";
import { getAdminDriverApplicationsMessages } from "@/translations";

type ApplicationStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

export function ApplicationStats({ locale, refreshKey }: ApplicationStatsProps) {
  const copy = getAdminDriverApplicationsMessages(locale);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const count = await fetchDriverApplicationCount();
        if (!cancelled) {
          setPendingCount(count);
        }
      } catch {
        if (!cancelled) {
          setPendingCount(0);
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
        title={copy.pendingTitle}
        value={pendingCount}
        description={copy.pendingDescription}
        icon={ClipboardCheck}
        loading={loading}
      />
    </div>
  );
}
