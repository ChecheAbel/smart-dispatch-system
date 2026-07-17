"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CircleCheck, CircleHelp } from "lucide-react";
import type { VehicleComplianceStatus, VehicleComplianceSummary } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { fetchVehicleComplianceSummary } from "@/lib/vehicle-api";
import type { SupportedLocale } from "@/lib/locale";
import { getAdminComplianceMessages } from "@/translations";

type ComplianceStatsType = "insurance" | "inspection";

type ComplianceStatsProps = {
  type: ComplianceStatsType;
  locale: SupportedLocale;
  refreshKey: number;
  activeStatus: string;
  onStatusSelect: (status: VehicleComplianceStatus | "all") => void;
};

const emptyBucket: Record<VehicleComplianceStatus, number> = {
  expired: 0,
  due_soon: 0,
  ok: 0,
  not_set: 0,
};

export function ComplianceStats({
  type,
  locale,
  refreshKey,
  activeStatus,
  onStatusSelect,
}: ComplianceStatsProps) {
  const copy = getAdminComplianceMessages(locale);
  const [stats, setStats] = useState(emptyBucket);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const summary: VehicleComplianceSummary = await fetchVehicleComplianceSummary();
        if (!cancelled) {
          setStats(summary[type] ?? emptyBucket);
        }
      } catch {
        if (!cancelled) {
          setStats(emptyBucket);
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
  }, [locale, refreshKey, type]);

  const toggleStatus = (status: VehicleComplianceStatus) => {
    onStatusSelect(activeStatus === status ? "all" : status);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={copy.stats.expired}
        value={stats.expired}
        description={copy.stats.expiredDescription}
        icon={AlertTriangle}
        loading={loading}
        active={activeStatus === "expired"}
        onClick={() => toggleStatus("expired")}
      />
      <StatCard
        title={copy.stats.dueSoon}
        value={stats.due_soon}
        description={copy.stats.dueSoonDescription}
        icon={CalendarClock}
        loading={loading}
        active={activeStatus === "due_soon"}
        onClick={() => toggleStatus("due_soon")}
      />
      <StatCard
        title={copy.stats.ok}
        value={stats.ok}
        description={copy.stats.okDescription}
        icon={CircleCheck}
        loading={loading}
        active={activeStatus === "ok"}
        onClick={() => toggleStatus("ok")}
      />
      <StatCard
        title={copy.stats.notSet}
        value={stats.not_set}
        description={copy.stats.notSetDescription}
        icon={CircleHelp}
        loading={loading}
        active={activeStatus === "not_set"}
        onClick={() => toggleStatus("not_set")}
      />
    </div>
  );
}
