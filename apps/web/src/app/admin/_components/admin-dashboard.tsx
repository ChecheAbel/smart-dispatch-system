"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Car, Map, MapPinned, Radio, Receipt, Truck, Users } from "lucide-react";
import { useAuth, useLocale, usePermission } from "@/components/shared/providers";
import { StatCard } from "@/components/shared/stat-card";
import { ComingSoonChartCard } from "@/components/shared/coming-soon-chart-card";
import { RegistrationStats } from "@/app/admin/user-registrations/_components/registration-stats";
import { Badge } from "@/components/ui/badge";
import { adminBadgeGoldClass, adminHeadingClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchLocationCount } from "@/lib/location-api";
import { fetchRegionCount } from "@/lib/region-api";
import { fetchUserCount } from "@/lib/user-api";
import { fetchVehicleCount } from "@/lib/vehicle-api";
import { formatMessage, getAdminDashboardMessages } from "@/translations";

type DashboardStats = {
  usersTotal: number;
  usersActive: number;
  vehiclesTotal: number;
  vehiclesActive: number;
  locationsTotal: number;
  locationsActive: number;
  regionsTotal: number;
};

const emptyStats: DashboardStats = {
  usersTotal: 0,
  usersActive: 0,
  vehiclesTotal: 0,
  vehiclesActive: 0,
  locationsTotal: 0,
  locationsActive: 0,
  regionsTotal: 0,
};

async function loadCount(loader: () => Promise<number>) {
  try {
    return await loader();
  } catch {
    return 0;
  }
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getAdminDashboardMessages(locale);
  const canViewRegistrations = usePermission(PERMISSIONS.user_registrations.read);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email;

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);

      const [
        usersTotal,
        usersActive,
        vehiclesTotal,
        vehiclesActive,
        locationsTotal,
        locationsActive,
        regionsTotal,
      ] = await Promise.all([
        loadCount(() => fetchUserCount()),
        loadCount(() => fetchUserCount({ account_status: "active" })),
        loadCount(() => fetchVehicleCount()),
        loadCount(() => fetchVehicleCount({ status: "active" })),
        loadCount(() => fetchLocationCount()),
        loadCount(() => fetchLocationCount({ is_active: true })),
        loadCount(() => fetchRegionCount()),
      ]);

      if (!cancelled) {
        setStats({
          usersTotal,
          usersActive,
          vehiclesTotal,
          vehiclesActive,
          locationsTotal,
          locationsActive,
          regionsTotal,
        });
        setLoading(false);
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <h2 className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}>
          {copy.title}
        </h2>
        <p className="text-sm font-medium text-slate-700">
          {formatMessage(copy.welcome, { name: displayName })}
        </p>
        <p className="max-w-2xl text-sm text-slate-500">{copy.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={copy.stats.usersTitle}
          value={stats.usersTotal}
          description={formatMessage(copy.stats.usersDescription, {
            active: stats.usersActive,
          })}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title={copy.stats.vehiclesTitle}
          value={stats.vehiclesTotal}
          description={formatMessage(copy.stats.vehiclesDescription, {
            active: stats.vehiclesActive,
          })}
          icon={Truck}
          loading={loading}
        />
        <StatCard
          title={copy.stats.locationsTitle}
          value={stats.locationsTotal}
          description={formatMessage(copy.stats.locationsDescription, {
            active: stats.locationsActive,
          })}
          icon={MapPinned}
          loading={loading}
        />
        <StatCard
          title={copy.stats.regionsTitle}
          value={stats.regionsTotal}
          description={copy.stats.regionsDescription}
          icon={Map}
          loading={loading}
        />
        <StatCard
          title={copy.comingSoonStats.bookingsTitle}
          value={copy.comingSoon}
          description={copy.comingSoonStats.bookingsDescription}
          icon={CalendarCheck}
          comingSoon
        />
        <StatCard
          title={copy.comingSoonStats.tripsTitle}
          value={copy.comingSoon}
          description={copy.comingSoonStats.tripsDescription}
          icon={Radio}
          comingSoon
        />
        <StatCard
          title={copy.comingSoonStats.fleetOnlineTitle}
          value={copy.comingSoon}
          description={copy.comingSoonStats.fleetOnlineDescription}
          icon={Car}
          comingSoon
        />
        <StatCard
          title={copy.comingSoonStats.revenueTitle}
          value={copy.comingSoon}
          description={copy.comingSoonStats.revenueDescription}
          icon={Receipt}
          comingSoon
        />
      </div>

      {canViewRegistrations ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className={`text-lg font-bold ${adminHeadingClass}`}>{copy.registrations.title}</h3>
            <p className="text-sm text-slate-500">{copy.registrations.description}</p>
          </div>
          <RegistrationStats locale={locale} refreshKey={0} />
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className={`text-lg font-bold ${adminHeadingClass}`}>{copy.comingSoonCharts.sectionTitle}</h3>
          <p className="text-sm text-slate-500">{copy.comingSoonCharts.sectionDescription}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ComingSoonChartCard
            title={copy.comingSoonCharts.bookingsTrendTitle}
            description={copy.comingSoonCharts.bookingsTrendDescription}
            comingSoonLabel={copy.comingSoon}
            variant="area"
          />
          <ComingSoonChartCard
            title={copy.comingSoonCharts.tripsByRegionTitle}
            description={copy.comingSoonCharts.tripsByRegionDescription}
            comingSoonLabel={copy.comingSoon}
            variant="bar"
          />
          <ComingSoonChartCard
            title={copy.comingSoonCharts.fleetUtilizationTitle}
            description={copy.comingSoonCharts.fleetUtilizationDescription}
            comingSoonLabel={copy.comingSoon}
            variant="donut"
          />
          <ComingSoonChartCard
            title={copy.comingSoonCharts.revenueTrendTitle}
            description={copy.comingSoonCharts.revenueTrendDescription}
            comingSoonLabel={copy.comingSoon}
            variant="line"
          />
        </div>
      </div>
    </div>
  );
}
