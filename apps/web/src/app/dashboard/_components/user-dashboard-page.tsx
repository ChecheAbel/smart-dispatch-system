"use client";

import { CalendarCheck, Car, ClipboardList, UserRound } from "lucide-react";
import { useAuth, useLocale } from "@/components/shared/providers";
import { StatCard } from "@/components/shared/stat-card";
import { ComingSoonChartCard } from "@/components/shared/coming-soon-chart-card";
import { Badge } from "@/components/ui/badge";
import { adminBadgeGoldClass, adminHeadingClass } from "@/lib/admin-theme";
import { formatMessage, getCustomerDashboardMessages } from "@/translations";

export function UserDashboardPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getCustomerDashboardMessages(locale);

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email;

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
          title={copy.stats.bookingsTitle}
          value={copy.comingSoon}
          description={copy.stats.bookingsDescription}
          icon={CalendarCheck}
          comingSoon
        />
        <StatCard
          title={copy.stats.requestsTitle}
          value={copy.comingSoon}
          description={copy.stats.requestsDescription}
          icon={ClipboardList}
          comingSoon
        />
        <StatCard
          title={copy.stats.tripsTitle}
          value={copy.comingSoon}
          description={copy.stats.tripsDescription}
          icon={Car}
          comingSoon
        />
        <StatCard
          title={copy.stats.profileTitle}
          value={copy.comingSoon}
          description={copy.stats.profileDescription}
          icon={UserRound}
          comingSoon
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className={`text-lg font-bold ${adminHeadingClass}`}>
            {copy.comingSoonCharts.sectionTitle}
          </h3>
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
            title={copy.comingSoonCharts.spendingTrendTitle}
            description={copy.comingSoonCharts.spendingTrendDescription}
            comingSoonLabel={copy.comingSoon}
            variant="line"
          />
          <ComingSoonChartCard
            title={copy.comingSoonCharts.tripTypesTitle}
            description={copy.comingSoonCharts.tripTypesDescription}
            comingSoonLabel={copy.comingSoon}
            variant="donut"
          />
          <ComingSoonChartCard
            title={copy.comingSoonCharts.requestStatusTitle}
            description={copy.comingSoonCharts.requestStatusDescription}
            comingSoonLabel={copy.comingSoon}
            variant="bar"
          />
        </div>
      </div>
    </div>
  );
}
