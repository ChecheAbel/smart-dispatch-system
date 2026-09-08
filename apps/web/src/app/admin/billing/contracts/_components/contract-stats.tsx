"use client";

import { useEffect, useState } from "react";
import { FileClock, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ContractStatus } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminContractsMessages } from "@/translations";
import { fetchContractCount } from "@/lib/contract-api";
import type { SupportedLocale } from "@/lib/locale";

type ContractStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
  selectedStatus?: ContractStatus | "";
  onSelectStatus?: (status: ContractStatus | "") => void;
};

const INITIAL_STATS = { total: 0, active: 0, draft: 0, expired: 0 };

export function ContractStats({
  locale,
  refreshKey,
  selectedStatus,
  onSelectStatus,
}: ContractStatsProps) {
  const copy = getAdminContractsMessages(locale);
  const isAm = locale === "am";
  const [stats, setStats] = useState(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const [total, active, draft, expired] = await Promise.all([
          fetchContractCount(),
          fetchContractCount({ status: "active" }),
          fetchContractCount({ status: "draft" }),
          fetchContractCount({ status: "expired" }),
        ]);

        if (!cancelled) {
          setStats({ total, active, draft, expired });
        }
      } catch {
        if (!cancelled) {
          setStats(INITIAL_STATS);
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
        icon={FileText}
        loading={loading}
        active={selectedStatus === ""}
        onClick={onSelectStatus ? () => onSelectStatus("") : undefined}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={ShieldCheck}
        loading={loading}
        active={selectedStatus === "active"}
        onClick={onSelectStatus ? () => onSelectStatus("active") : undefined}
      />
      <StatCard
        title={isAm ? "ረቂቅ ውሎች" : "Draft Contracts"}
        value={stats.draft}
        description={isAm ? "ገና ያልጸደቁ ወይም ዝግጅት ላይ ያሉ" : "Agreements pending approval or activation"}
        icon={FileClock}
        loading={loading}
        active={selectedStatus === "draft"}
        onClick={onSelectStatus ? () => onSelectStatus("draft") : undefined}
      />
      <StatCard
        title={isAm ? "ጊዜያቸው ያለፈባቸው" : "Expired Contracts"}
        value={stats.expired}
        description={isAm ? "የአገልግሎት ጊዜያቸው የተጠናቀቀ ውሎች" : "Agreements past their conclusion date"}
        icon={ShieldAlert}
        loading={loading}
        active={selectedStatus === "expired"}
        onClick={onSelectStatus ? () => onSelectStatus("expired") : undefined}
      />
    </div>
  );
}
