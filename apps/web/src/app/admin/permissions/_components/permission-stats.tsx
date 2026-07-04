"use client";

import { useEffect, useState } from "react";
import { Key } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminPermissionsMessages } from "@/translations";
import { fetchPermissionCount } from "@/lib/permission-api";
import type { SupportedLocale } from "@/lib/locale";

type PermissionStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

export function PermissionStats({ locale, refreshKey }: PermissionStatsProps) {
  const copy = getAdminPermissionsMessages(locale);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const count = await fetchPermissionCount();
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
        icon={Key}
        loading={loading}
      />
    </div>
  );
}
