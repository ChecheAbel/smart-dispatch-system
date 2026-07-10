"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ClipboardCheck,
  Map,
  MapPinned,
  Radio,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import type { AdminDashboardAnalytics } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { adminHeadingClass } from "@/lib/admin-theme";
import type { SupportedLocale } from "@/lib/locale";
import { fetchLocationCount } from "@/lib/location-api";
import { fetchRegionCount } from "@/lib/region-api";
import { fetchUserCount } from "@/lib/user-api";
import { fetchVehicleCount } from "@/lib/vehicle-api";
import { formatMessage, getAdminDashboardMessages } from "@/translations";

type CoreStats = {
  usersTotal: number;
  usersActive: number;
  vehiclesTotal: number;
  vehiclesActive: number;
  locationsTotal: number;
  locationsActive: number;
  regionsTotal: number;
  registrationsPending: number;
};

const emptyCoreStats: CoreStats = {
  usersTotal: 0,
  usersActive: 0,
  vehiclesTotal: 0,
  vehiclesActive: 0,
  locationsTotal: 0,
  locationsActive: 0,
  regionsTotal: 0,
  registrationsPending: 0,
};

async function loadCount(loader: () => Promise<number>) {
  try {
    return await loader();
  } catch {
    return 0;
  }
}

type AdminDashboardStatsProps = {
  locale: SupportedLocale;
  analytics: AdminDashboardAnalytics | null;
  analyticsLoading: boolean;
  canReadUsers: boolean;
  canReadVehicles: boolean;
  canReadLocations: boolean;
  canReadRegions: boolean;
  canReadRideRequests: boolean;
  canViewCompliance: boolean;
  canViewRegistrations: boolean;
};

export function AdminDashboardStats({
  locale,
  analytics,
  analyticsLoading,
  canReadUsers,
  canReadVehicles,
  canReadLocations,
  canReadRegions,
  canReadRideRequests,
  canViewCompliance,
  canViewRegistrations,
}: AdminDashboardStatsProps) {
  const copy = getAdminDashboardMessages(locale);
  const [coreStats, setCoreStats] = useState<CoreStats>(emptyCoreStats);
  const [coreLoading, setCoreLoading] = useState(true);

  const showSection =
    canReadUsers ||
    canReadVehicles ||
    canReadLocations ||
    canReadRegions ||
    canReadRideRequests ||
    canViewCompliance ||
    canViewRegistrations;

  const ridePending = analytics?.ride_requests?.by_status.pending ?? 0;
  const rideInProgress = analytics?.ride_requests?.by_status.in_progress ?? 0;
  const complianceAttention = analytics?.fleet?.compliance?.vehicles_needing_attention ?? 0;

  useEffect(() => {
    if (!showSection) {
      setCoreLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCoreStats() {
      setCoreLoading(true);

      const loaders: Promise<number>[] = [];
      const keys: Array<keyof CoreStats> = [];

      if (canReadUsers) {
        loaders.push(loadCount(() => fetchUserCount()));
        keys.push("usersTotal");
        loaders.push(loadCount(() => fetchUserCount({ account_status: "active" })));
        keys.push("usersActive");
      }

      if (canReadVehicles) {
        loaders.push(loadCount(() => fetchVehicleCount()));
        keys.push("vehiclesTotal");
        loaders.push(loadCount(() => fetchVehicleCount({ status: "active" })));
        keys.push("vehiclesActive");
      }

      if (canReadLocations) {
        loaders.push(loadCount(() => fetchLocationCount()));
        keys.push("locationsTotal");
        loaders.push(loadCount(() => fetchLocationCount({ is_active: true })));
        keys.push("locationsActive");
      }

      if (canReadRegions) {
        loaders.push(loadCount(() => fetchRegionCount()));
        keys.push("regionsTotal");
      }

      if (canViewRegistrations) {
        loaders.push(
          loadCount(() =>
            fetchUserCount({
              account_activation: "pending",
              account_status: "active",
              has_requester_profile: true,
            }),
          ),
        );
        keys.push("registrationsPending");
      }

      const values = await Promise.all(loaders);

      if (!cancelled) {
        const next = { ...emptyCoreStats };
        keys.forEach((key, index) => {
          next[key] = values[index] ?? 0;
        });
        setCoreStats(next);
        setCoreLoading(false);
      }
    }

    void loadCoreStats();

    return () => {
      cancelled = true;
    };
  }, [
    canReadLocations,
    canReadRegions,
    canReadUsers,
    canReadVehicles,
    canViewRegistrations,
    showSection,
  ]);

  const cards = useMemo(() => {
    const items = [];

    if (canReadUsers) {
      items.push(
        <StatCard
          key="users"
          title={copy.stats.usersTitle}
          value={coreStats.usersTotal}
          description={formatMessage(copy.stats.usersDescription, {
            active: coreStats.usersActive,
          })}
          icon={Users}
          loading={coreLoading}
        />,
      );
    }

    if (canReadVehicles) {
      items.push(
        <StatCard
          key="vehicles"
          title={copy.stats.vehiclesTitle}
          value={coreStats.vehiclesTotal}
          description={formatMessage(copy.stats.vehiclesDescription, {
            active: coreStats.vehiclesActive,
          })}
          icon={Truck}
          loading={coreLoading}
        />,
      );
    }

    if (canReadLocations) {
      items.push(
        <StatCard
          key="locations"
          title={copy.stats.locationsTitle}
          value={coreStats.locationsTotal}
          description={formatMessage(copy.stats.locationsDescription, {
            active: coreStats.locationsActive,
          })}
          icon={MapPinned}
          loading={coreLoading}
        />,
      );
    }

    if (canReadRegions) {
      items.push(
        <StatCard
          key="regions"
          title={copy.stats.regionsTitle}
          value={coreStats.regionsTotal}
          description={copy.stats.regionsDescription}
          icon={Map}
          loading={coreLoading}
        />,
      );
    }

    if (canReadRideRequests) {
      items.push(
        <StatCard
          key="ride-pending"
          title={copy.operations.pendingTitle}
          value={ridePending}
          description={copy.operations.pendingDescription}
          icon={CalendarCheck}
          loading={analyticsLoading}
        />,
        <StatCard
          key="ride-in-progress"
          title={copy.operations.inProgressTitle}
          value={rideInProgress}
          description={copy.operations.inProgressDescription}
          icon={Radio}
          loading={analyticsLoading}
        />,
      );
    }

    if (canViewCompliance) {
      items.push(
        <StatCard
          key="compliance"
          title={copy.compliance.attentionTitle}
          value={complianceAttention}
          description={copy.compliance.attentionDescription}
          icon={ShieldCheck}
          loading={analyticsLoading}
        />,
      );
    }

    if (canViewRegistrations) {
      items.push(
        <StatCard
          key="registrations"
          title={copy.stats.pendingRegistrationsTitle}
          value={coreStats.registrationsPending}
          description={copy.stats.pendingRegistrationsDescription}
          icon={ClipboardCheck}
          loading={coreLoading}
        />,
      );
    }

    return items;
  }, [
    analyticsLoading,
    canReadLocations,
    canReadRegions,
    canReadRideRequests,
    canReadUsers,
    canReadVehicles,
    canViewCompliance,
    canViewRegistrations,
    complianceAttention,
    copy.compliance.attentionDescription,
    copy.compliance.attentionTitle,
    copy.operations.inProgressDescription,
    copy.operations.inProgressTitle,
    copy.operations.pendingDescription,
    copy.operations.pendingTitle,
    copy.stats,
    coreLoading,
    coreStats,
    rideInProgress,
    ridePending,
  ]);

  if (!showSection) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className={`text-lg font-bold ${adminHeadingClass}`}>{copy.core.title}</h3>
        <p className="text-sm text-slate-500">{copy.core.description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards}</div>
    </section>
  );
}
