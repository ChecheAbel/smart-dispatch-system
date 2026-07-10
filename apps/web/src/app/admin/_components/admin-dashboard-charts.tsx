"use client";

import { useId, useMemo, type ReactNode } from "react";
import type {
  AdminDashboardAnalytics,
  RideRequestStatus,
  VehicleComplianceStatus,
  VehicleStatus,
} from "@smart-dispatch/types";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardChartCard } from "@/components/shared/dashboard-chart-card";
import {
  DashboardChartLegend,
  type DashboardChartLegendItem,
} from "@/components/shared/dashboard-chart-legend";
import {
  dashboardChartAxisTick,
  dashboardChartGrid,
  dashboardChartMargins,
  dashboardChartTheme,
} from "@/components/shared/dashboard-chart-theme";
import { DashboardChartTooltip } from "@/components/shared/dashboard-chart-tooltip";
import { adminEyebrowClass, adminHeadingClass } from "@/lib/admin-theme";
import type { SupportedLocale } from "@/lib/locale";
import { formatMessage, getAdminDashboardMessages } from "@/translations";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<RideRequestStatus, string> = {
  pending: "#d97706",
  confirmed: "#2563eb",
  in_progress: "#1C3A34",
  completed: "#64748b",
  cancelled: "#dc2626",
};

const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  active: "#1C3A34",
  maintenance: "#d97706",
  retired: "#94a3b8",
};

const REGION_BAR_COLORS = [
  "#1C3A34",
  "#2F5E54",
  "#4C8578",
  "#6BA08F",
  "#8FB5A8",
  "#A8C4BB",
  "#C2D9D2",
  "#64748b",
];

type AdminDashboardChartsProps = {
  analytics: AdminDashboardAnalytics | null;
  loading: boolean;
  locale: SupportedLocale;
  canReadRideRequests: boolean;
  canReadVehicles: boolean;
  canViewCompliance: boolean;
  canViewRegistrations: boolean;
};

type DonutSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
};

function DashboardDonutChart({
  slices,
  total,
  centerLabel,
}: {
  slices: DonutSlice[];
  total: number;
  centerLabel: string;
}) {
  const visibleSlices = slices.filter((slice) => slice.count > 0);

  return (
    <div className="relative h-full min-h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
          <Pie
            data={visibleSlices}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="44%"
            outerRadius="62%"
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {visibleSlices.map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<DashboardChartTooltip valueFormatter={(value) => String(value)} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tabular-nums text-[#1C3A34]">{total}</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

function ChartSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#1C3A34]/[0.05] via-white to-white px-4 py-4 sm:px-5">
        <p className={adminEyebrowClass}>{eyebrow}</p>
        <h3 className={cn("mt-1 text-lg font-bold", adminHeadingClass)}>{title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function formatShortDate(value: string, locale: SupportedLocale) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCurrency(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function hasTrendData(points: Array<{ count?: number; total_cost?: number }>) {
  return points.some((point) => (point.count ?? point.total_cost ?? 0) > 0);
}

function sumCounts(points: Array<{ count: number }>) {
  return points.reduce((total, point) => total + point.count, 0);
}

type RegionChartRow = {
  region_id: string | null;
  region_name: string;
  count: number;
  label: string;
};

function getRegionChartRows(
  entries: Array<{ region_id: string | null; region_name: string; count: number }>,
  unassignedLabel: string,
): RegionChartRow[] {
  return entries.map((entry) => ({
    ...entry,
    label: entry.region_id && entry.region_name.trim() ? entry.region_name : unassignedLabel,
  }));
}

function getAxisWidth(labels: string[]) {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
  return Math.min(240, Math.max(112, longest * 7.5));
}

function toLegendItems(
  items: Array<{ key: string; label: string; color: string; value: number }>,
): DashboardChartLegendItem[] {
  return items.filter((item) => item.value > 0);
}

export function AdminDashboardCharts({
  analytics,
  loading,
  locale,
  canReadRideRequests,
  canReadVehicles,
  canViewCompliance,
  canViewRegistrations,
}: AdminDashboardChartsProps) {
  const copy = getAdminDashboardMessages(locale);
  const charts = copy.charts;
  const rideTrendGradientId = useId().replace(/:/g, "");
  const fuelBarGradientId = useId().replace(/:/g, "");
  const registrationLineGradientId = useId().replace(/:/g, "");

  const rideStatuses = useMemo(
    () =>
      (Object.keys(STATUS_COLORS) as RideRequestStatus[]).map((status) => ({
        status,
        label: charts.rideStatuses[status],
        count: analytics?.ride_requests?.by_status[status] ?? 0,
      })),
    [analytics?.ride_requests?.by_status, charts.rideStatuses],
  );

  const fleetStatuses = useMemo(
    () =>
      (Object.keys(VEHICLE_STATUS_COLORS) as VehicleStatus[]).map((status) => ({
        status,
        label: charts.vehicleStatuses[status],
        count: analytics?.fleet?.by_status[status] ?? 0,
      })),
    [analytics?.fleet?.by_status, charts.vehicleStatuses],
  );

  const complianceChartData = useMemo(() => {
    const compliance = analytics?.fleet?.compliance;
    if (!compliance) return [];

    return (["expired", "due_soon", "ok", "not_set"] as VehicleComplianceStatus[]).map(
      (status) => ({
        status,
        label: charts.complianceStatuses[status],
        insurance: compliance.insurance.find((point) => point.status === status)?.count ?? 0,
        inspection: compliance.inspection.find((point) => point.status === status)?.count ?? 0,
      }),
    );
  }, [analytics?.fleet?.compliance, charts.complianceStatuses]);

  const periodLabel = formatMessage(charts.periodLabel, {
    days: String(analytics?.period_days ?? 30),
  });

  const rideTrendTotal = analytics?.ride_requests ? sumCounts(analytics.ride_requests.trend) : 0;
  const rideStatusTotal = sumCounts(rideStatuses);
  const fleetStatusTotal = sumCounts(fleetStatuses);
  const registrationTotal = analytics?.registrations ? sumCounts(analytics.registrations.trend) : 0;
  const fuelSpendTotal = analytics?.fuel
    ? analytics.fuel.trend.reduce((total, point) => total + point.total_cost, 0)
    : 0;

  const regionChartRows = analytics?.ride_requests
    ? getRegionChartRows(analytics.ride_requests.by_region, charts.unassignedRegion)
    : [];

  const regionAxisWidth = getAxisWidth(regionChartRows.map((row) => row.label));
  const regionChartHeight = Math.max(256, regionChartRows.length * 48);

  const rideStatusLegend = toLegendItems(
    rideStatuses.map((item) => ({
      key: item.status,
      label: item.label,
      color: STATUS_COLORS[item.status],
      value: item.count,
    })),
  );

  const fleetStatusLegend = toLegendItems(
    fleetStatuses.map((item) => ({
      key: item.status,
      label: item.label,
      color: VEHICLE_STATUS_COLORS[item.status],
      value: item.count,
    })),
  );

  const complianceLegend: DashboardChartLegendItem[] = [
    { key: "insurance", label: charts.insuranceLabel, color: dashboardChartTheme.brand },
    { key: "inspection", label: charts.inspectionLabel, color: dashboardChartTheme.accent },
  ];

  const showRideRequests = (loading && canReadRideRequests) || Boolean(analytics?.ride_requests);
  const showFleetSection =
    (loading && canReadVehicles) || Boolean(analytics?.fleet || analytics?.fuel);
  const showFleetStatus = (loading && canReadVehicles) || Boolean(analytics?.fleet);
  const showCompliance =
    (loading && (canReadVehicles || canViewCompliance)) ||
    Boolean(analytics?.fleet?.compliance);
  const showFuel = (loading && canReadVehicles) || Boolean(analytics?.fuel);
  const showRegistrations =
    (loading && canViewRegistrations) || Boolean(analytics?.registrations);

  const rideRequests = analytics?.ride_requests;
  const fleet = analytics?.fleet;
  const fuel = analytics?.fuel;
  const registrations = analytics?.registrations;

  return (
    <div className="space-y-6">
      {showRideRequests ? (
        <ChartSection
          eyebrow={charts.operationsEyebrow}
          title={charts.operationsTitle}
          description={charts.operationsDescription}
        >
          <div className="grid gap-4 xl:grid-cols-12">
            <DashboardChartCard
              title={charts.rideTrendTitle}
              description={periodLabel}
              highlight={rideTrendTotal}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && rideRequests ? !hasTrendData(rideRequests.trend) : false}
              emptyLabel={charts.empty}
              className="xl:col-span-8"
            >
              {!loading && rideRequests ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rideRequests.trend} margin={dashboardChartMargins}>
                  <defs>
                    <linearGradient id={rideTrendGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={dashboardChartTheme.brand} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={dashboardChartTheme.brand} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...dashboardChartGrid} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={dashboardChartAxisTick}
                    tickFormatter={(value) => formatShortDate(String(value), locale)}
                    interval="preserveStartEnd"
                    dy={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={dashboardChartAxisTick}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ stroke: dashboardChartTheme.accent, strokeWidth: 1, strokeDasharray: "4 4" }}
                    content={
                      <DashboardChartTooltip
                        labelFormatter={(value) => formatShortDate(value, locale)}
                        valueFormatter={(value) => String(value)}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={charts.requestsLabel}
                    stroke={dashboardChartTheme.brand}
                    fill={`url(#${rideTrendGradientId})`}
                    strokeWidth={2.5}
                    activeDot={{ r: 5, fill: dashboardChartTheme.brand, stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              ) : null}
            </DashboardChartCard>

            <DashboardChartCard
              title={charts.rideStatusTitle}
              description={charts.rideStatusDescription}
              highlight={rideStatusTotal}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && rideStatusTotal === 0}
              emptyLabel={charts.empty}
              className="xl:col-span-4"
              footer={!loading ? <DashboardChartLegend items={rideStatusLegend} /> : undefined}
            >
              {!loading ? (
              <DashboardDonutChart
                slices={rideStatuses.map((item) => ({
                  key: item.status,
                  label: item.label,
                  count: item.count,
                  color: STATUS_COLORS[item.status],
                }))}
                total={rideStatusTotal}
                centerLabel={charts.totalLabel}
              />
              ) : null}
            </DashboardChartCard>

            <DashboardChartCard
              title={charts.rideRegionTitle}
              description={charts.rideRegionDescription}
              highlight={regionChartRows.reduce((total, row) => total + row.count, 0)}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && regionChartRows.length === 0}
              emptyLabel={charts.empty}
              className="xl:col-span-12"
              contentClassName="!h-auto"
            >
              {!loading && rideRequests ? (
              <div style={{ height: regionChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionChartRows}
                    layout="vertical"
                    margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid {...dashboardChartGrid} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={dashboardChartAxisTick}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={regionAxisWidth}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: dashboardChartTheme.brand, fontWeight: 600 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                      content={
                        <DashboardChartTooltip
                          labelFormatter={(value) => String(value)}
                          valueFormatter={(value) => String(value)}
                        />
                      }
                    />
                    <Bar dataKey="count" name={charts.requestsLabel} radius={[0, 6, 6, 0]}>
                      {regionChartRows.map((entry, index) => (
                        <Cell
                          key={entry.region_id ?? entry.label}
                          fill={REGION_BAR_COLORS[index % REGION_BAR_COLORS.length]}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        fill={dashboardChartTheme.muted}
                        fontSize={11}
                        fontWeight={700}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              ) : null}
            </DashboardChartCard>
          </div>
        </ChartSection>
      ) : null}

      {showFleetSection ? (
        <ChartSection
          eyebrow={charts.fleetEyebrow}
          title={charts.fleetTitle}
          description={charts.fleetDescription}
        >
          <div className="grid gap-4 xl:grid-cols-12">
            {showFleetStatus ? (
              <DashboardChartCard
                title={charts.fleetStatusTitle}
                description={charts.fleetStatusDescription}
                highlight={fleetStatusTotal}
                highlightLabel={charts.vehiclesLabel}
                loading={loading}
                empty={!loading && fleetStatusTotal === 0}
                emptyLabel={charts.empty}
                className="xl:col-span-4"
                footer={!loading ? <DashboardChartLegend items={fleetStatusLegend} /> : undefined}
              >
                {!loading ? (
                <DashboardDonutChart
                  slices={fleetStatuses.map((item) => ({
                    key: item.status,
                    label: item.label,
                    count: item.count,
                    color: VEHICLE_STATUS_COLORS[item.status],
                  }))}
                  total={fleetStatusTotal}
                  centerLabel={charts.vehiclesLabel}
                />
                ) : null}
              </DashboardChartCard>
            ) : null}

            {showCompliance ? (
              <DashboardChartCard
                title={charts.complianceTitle}
                description={formatMessage(charts.complianceDescription, {
                  count: String(fleet?.compliance?.vehicles_needing_attention ?? 0),
                })}
                highlight={fleet?.compliance?.vehicles_needing_attention}
                highlightLabel={charts.attentionLabel}
                loading={loading}
                empty={
                  !loading
                    ? complianceChartData.every(
                        (item) => item.insurance === 0 && item.inspection === 0,
                      )
                    : false
                }
                emptyLabel={charts.empty}
                className="xl:col-span-8"
                footer={!loading ? <DashboardChartLegend items={complianceLegend} /> : undefined}
              >
                {!loading && fleet?.compliance ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceChartData} margin={dashboardChartMargins} barGap={6}>
                    <CartesianGrid {...dashboardChartGrid} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={dashboardChartAxisTick}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={dashboardChartAxisTick}
                      width={32}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                      content={
                        <DashboardChartTooltip valueFormatter={(value) => String(value)} />
                      }
                    />
                    <Bar
                      dataKey="insurance"
                      name={charts.insuranceLabel}
                      fill={dashboardChartTheme.brand}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="inspection"
                      name={charts.inspectionLabel}
                      fill={dashboardChartTheme.accent}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
                ) : null}
              </DashboardChartCard>
            ) : null}

            {showFuel ? (
              <DashboardChartCard
                title={charts.fuelSpendTitle}
                description={periodLabel}
                highlight={formatCurrency(fuelSpendTotal, locale)}
                highlightLabel={charts.fuelCostLabel}
                loading={loading}
                empty={!loading && fuel ? !hasTrendData(fuel.trend) : false}
                emptyLabel={charts.empty}
                className="xl:col-span-12"
              >
                {!loading && fuel ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fuel.trend} margin={dashboardChartMargins} barCategoryGap="28%">
                    <defs>
                      <linearGradient id={fuelBarGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={dashboardChartTheme.brandMid} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={dashboardChartTheme.brand} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...dashboardChartGrid} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={dashboardChartAxisTick}
                      tickFormatter={(value) => formatShortDate(String(value), locale)}
                      interval="preserveStartEnd"
                      dy={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={dashboardChartAxisTick}
                      width={44}
                      tickFormatter={(value) => formatCurrency(Number(value), locale)}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                      content={
                        <DashboardChartTooltip
                          labelFormatter={(value) => formatShortDate(value, locale)}
                          valueFormatter={(value, name) =>
                            name === charts.fuelCostLabel
                              ? formatCurrency(value, locale)
                              : String(value)
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="total_cost"
                      name={charts.fuelCostLabel}
                      fill={`url(#${fuelBarGradientId})`}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
                ) : null}
              </DashboardChartCard>
            ) : null}
          </div>
        </ChartSection>
      ) : null}

      {showRegistrations ? (
        <ChartSection
          eyebrow={charts.registrationsEyebrow}
          title={charts.registrationsTitle}
          description={charts.registrationsDescription}
        >
          <DashboardChartCard
            title={charts.registrationTrendTitle}
            description={periodLabel}
            highlight={registrationTotal}
            highlightLabel={charts.totalLabel}
            loading={loading}
            empty={!loading && registrations ? !hasTrendData(registrations.trend) : false}
            emptyLabel={charts.empty}
          >
            {!loading && registrations ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={registrations.trend} margin={dashboardChartMargins}>
                  <defs>
                    <linearGradient id={registrationLineGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={dashboardChartTheme.gold} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={dashboardChartTheme.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...dashboardChartGrid} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={dashboardChartAxisTick}
                    tickFormatter={(value) => formatShortDate(String(value), locale)}
                    interval="preserveStartEnd"
                    dy={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={dashboardChartAxisTick}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ stroke: dashboardChartTheme.gold, strokeWidth: 1, strokeDasharray: "4 4" }}
                    content={
                      <DashboardChartTooltip
                        labelFormatter={(value) => formatShortDate(value, locale)}
                        valueFormatter={(value) => String(value)}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="none"
                    fill={`url(#${registrationLineGradientId})`}
                    legendType="none"
                    tooltipType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={charts.registrationsLabel}
                    stroke={dashboardChartTheme.gold}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: dashboardChartTheme.gold, stroke: "#fff", strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </DashboardChartCard>
        </ChartSection>
      ) : null}
    </div>
  );
}
