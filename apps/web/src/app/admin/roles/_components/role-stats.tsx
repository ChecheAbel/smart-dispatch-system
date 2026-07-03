"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminRolesMessages } from "@/translations";
import { fetchRoleCount } from "@/lib/role-api";
import type { SupportedLocale } from "@/lib/locale";

type RoleStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

export function RoleStats({ locale, refreshKey }: RoleStatsProps) {
  const copy = getAdminRolesMessages(locale);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const count = await fetchRoleCount(locale);
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
        icon={Shield}
        loading={loading}
      />
    </div>
  );
}
