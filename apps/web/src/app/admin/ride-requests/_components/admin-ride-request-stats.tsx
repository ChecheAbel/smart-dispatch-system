"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Route, XCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { fetchAdminRideRequestCount } from "@/lib/admin-ride-request-api";
import type { SupportedLocale } from "@/lib/locale";
import { getAdminRideRequestsMessages } from "@/translations";

type AdminRideRequestStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type AdminRideRequestStatsState = {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
};

const emptyStats: AdminRideRequestStatsState = {
  total: 0,
  pending: 0,
  confirmed: 0,
  cancelled: 0,
};

export function AdminRideRequestStats({ locale, refreshKey }: AdminRideRequestStatsProps) {
  const copy = getAdminRideRequestsMessages(locale);
  const [stats, setStats] = useState<AdminRideRequestStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isStale = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, pending, confirmed, cancelledCount] = await Promise.all([
          fetchAdminRideRequestCount({ locale }),
          fetchAdminRideRequestCount({ locale, status: "pending" }),
          fetchAdminRideRequestCount({ locale, status: "confirmed" }),
          fetchAdminRideRequestCount({ locale, status: "cancelled" }),
        ]);

        if (!isStale) {
          setStats({ total, pending, confirmed, cancelled: cancelledCount });
        }
      } catch {
        if (!isStale) {
          setStats(emptyStats);
        }
      } finally {
        if (!isStale) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      isStale = true;
    };
  }, [locale, refreshKey]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={copy.stats.title}
        value={stats.total}
        description={copy.stats.description}
        icon={ClipboardList}
        loading={loading}
      />
      <StatCard
        title={copy.stats.pendingTitle}
        value={stats.pending}
        description={copy.stats.pendingDescription}
        icon={Route}
        loading={loading}
      />
      <StatCard
        title={copy.stats.confirmedTitle}
        value={stats.confirmed}
        description={copy.stats.confirmedDescription}
        icon={CheckCircle2}
        loading={loading}
      />
      <StatCard
        title={copy.stats.cancelledTitle}
        value={stats.cancelled}
        description={copy.stats.cancelledDescription}
        icon={XCircle}
        loading={loading}
      />
    </div>
  );
}
