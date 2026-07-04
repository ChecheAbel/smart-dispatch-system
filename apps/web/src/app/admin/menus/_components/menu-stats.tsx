"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminMenusMessages } from "@/translations";
import { fetchMenuCount } from "@/lib/menu-api";
import type { SupportedLocale } from "@/lib/locale";

type MenuStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

export function MenuStats({ locale, refreshKey }: MenuStatsProps) {
  const copy = getAdminMenusMessages(locale);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const count = await fetchMenuCount(locale);
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
        icon={Menu}
        loading={loading}
      />
    </div>
  );
}
