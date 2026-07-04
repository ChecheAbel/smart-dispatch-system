"use client";

import { useEffect, useState } from "react";
import { UserCheck, UserX, Users } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminUsersMessages } from "@/translations";
import { fetchUserCount } from "@/lib/user-api";
import type { SupportedLocale } from "@/lib/locale";

type UserStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type UserStatsState = {
  total: number;
  active: number;
  inactive: number;
};

const emptyStats: UserStatsState = {
  total: 0,
  active: 0,
  inactive: 0,
};

export function UserStats({ locale, refreshKey }: UserStatsProps) {
  const copy = getAdminUsersMessages(locale);
  const [stats, setStats] = useState<UserStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, active] = await Promise.all([
          fetchUserCount(),
          fetchUserCount({ account_status: "active" }),
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
        icon={Users}
        loading={loading}
      />
      <StatCard
        title={copy.stats.activeTitle}
        value={stats.active}
        description={copy.stats.activeDescription}
        icon={UserCheck}
        loading={loading}
      />
      <StatCard
        title={copy.stats.inactiveTitle}
        value={stats.inactive}
        description={copy.stats.inactiveDescription}
        icon={UserX}
        loading={loading}
      />
    </div>
  );
}
