"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminUserRegistrationsMessages } from "@/translations";
import { fetchUserCount } from "@/lib/user-api";
import type { SupportedLocale } from "@/lib/locale";

type RegistrationStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

type RegistrationStatsState = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

const emptyStats: RegistrationStatsState = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

export function RegistrationStats({ locale, refreshKey }: RegistrationStatsProps) {
  const copy = getAdminUserRegistrationsMessages(locale);
  const [stats, setStats] = useState<RegistrationStatsState>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      try {
        const [total, pending, approved, rejected] = await Promise.all([
          fetchUserCount({ has_requester_profile: true }),
          fetchUserCount({
            account_activation: "pending",
            account_status: "active",
            has_requester_profile: true,
          }),
          fetchUserCount({
            account_activation: "activated",
            has_requester_profile: true,
          }),
          fetchUserCount({
            account_status: "deactivated",
            has_requester_profile: true,
          }),
        ]);

        if (!cancelled) {
          setStats({ total, pending, approved, rejected });
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={copy.stats.title}
        value={stats.total}
        description={copy.stats.description}
        icon={ClipboardCheck}
        loading={loading}
      />
      <StatCard
        title={copy.stats.pendingTitle}
        value={stats.pending}
        description={copy.stats.pendingDescription}
        icon={ClipboardCheck}
        loading={loading}
      />
      <StatCard
        title={copy.stats.approvedTitle}
        value={stats.approved}
        description={copy.stats.approvedDescription}
        icon={CheckCircle2}
        loading={loading}
      />
      <StatCard
        title={copy.stats.rejectedTitle}
        value={stats.rejected}
        description={copy.stats.rejectedDescription}
        icon={XCircle}
        loading={loading}
      />
    </div>
  );
}
