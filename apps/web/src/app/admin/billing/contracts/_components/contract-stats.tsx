"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContractStatus } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminContractsMessages } from "@/translations";
import { fetchContractCount } from "@/lib/contract-api";
import type { SupportedLocale } from "@/lib/locale";
import { FileText, ShieldCheck } from "lucide-react";

type ContractStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

export function ContractStats({ locale, refreshKey }: ContractStatsProps) {
  const copy = getAdminContractsMessages(locale);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const [total, active] = await Promise.all([
          fetchContractCount(),
          fetchContractCount({ status: "active" }),
        ]);

        if (!cancelled) {
          setStats({ total, active });
        }
      } catch {
        if (!cancelled) {
          setStats({ total: 0, active: 0 });
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
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        title={copy.stats.title}
        value={stats.total}
        description={copy.stats.description}
        icon={FileText}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={ShieldCheck}
        loading={loading}
      />
    </div>
  );
}
