"use client";

import { useId, useMemo, type ReactNode } from "react";
import type {
  AdminDashboardAnalytics,
  InvoiceStatus,
  RideRequestStatus,
  VehicleComplianceStatus,
  VehicleStatus,
} from "@smart-dispatch/types";
import {
  Activity,
  CalendarDays,
  Fuel,
  MapPinned,
  Receipt,
  ShieldAlert,
  TrendingUp,
  Truck,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import {
  DashboardChartTooltip,
  dashboardChartTooltipWrapperStyle,
} from "@/components/shared/dashboard-chart-tooltip";
import { adminEyebrowClass, adminHeadingClass } from "@/lib/admin-theme";
import type { SupportedLocale } from "@/lib/locale";
import { formatMessage, getAdminDashboardMessages } from "@/translations";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<RideRequestStatus, string> = {
  pending: "#C9B87A",
  confirmed: "#4C8578",
  in_progress: "#1C3A34",
  completed: "#8FB5A8",
  cancelled: "#94a3b8",
};

const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  active: "#1C3A34",
  maintenance: "#C9B87A",
  retired: "#94a3b8",
};

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "#94a3b8",
  issued: "#C9B87A",
  paid: "#1C3A34",
  void: "#cbd5e1",
};

const REGION_BAR_COLORS = [
  "#1C3A34",
  "#2F5E54",
  "#4C8578",
  "#6BA08F",
  "#8FB5A8",
  "#A8C4BB",
  "#C9B87A",
  "#64748b",
];

type AdminDashboardChartsProps = {
  analytics: AdminDashboardAnalytics | null;
  loading: boolean;
  locale: SupportedLocale;
  canReadRideRequests: boolean;
  canReadVehicles: boolean;
  canViewCompliance: boolean;
  canReadInvoices: boolean;
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
    <div className="relative h-full min-h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={visibleSlices}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="78%"
            paddingAngle={3}
            cornerRadius={4}
            stroke="#fff"
            strokeWidth={3}
          >
            {visibleSlices.map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={dashboardChartTooltipWrapperStyle}
            content={<DashboardChartTooltip valueFormatter={(value) => String(value)} />}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums tracking-tight text-[#1C3A34]">
          {total}
        </span>
        <span className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
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
  periodLabel,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  periodLabel?: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1C3A34] text-white shadow-sm">
            <Icon className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-1">
            <p className={adminEyebrowClass}>{eyebrow}</p>
            <h3 className={cn("text-xl font-extrabold tracking-tight", adminHeadingClass)}>
              {title}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        {periodLabel ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#C9B87A]/35 bg-[#C9B87A]/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#8f7d45]">
            <CalendarDays className="size-3.5" />
            {periodLabel}
          </span>
        ) : null}
      </div>
      <div>{children}</div>
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

function formatMoney(value: number, locale: SupportedLocale) {
  return `${formatCurrency(value, locale)} ETB`;
}

function hasTrendData(points: Array<{ count?: number; total_cost?: number; paid_amount?: number; issued_amount?: number }>) {
  return points.some(
    (point) =>
      Number(point.count ?? point.total_cost ?? point.paid_amount ?? point.issued_amount ?? 0) > 0,
  );
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
  return Math.min(220, Math.max(100, longest * 7.2));
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
  canReadInvoices,
  canViewRegistrations,
}: AdminDashboardChartsProps) {
  const copy = getAdminDashboardMessages(locale);
  const charts = copy.charts;
  const rideTrendGradientId = useId().replace(/:/g, "");
  const paymentPaidColor = dashboardChartTheme.brand;

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

  const invoiceStatuses = useMemo(
    () =>
      (Object.keys(INVOICE_STATUS_COLORS) as InvoiceStatus[]).map((status) => ({
        status,
        label: charts.invoiceStatuses[status],
        count: analytics?.payments?.by_status[status] ?? 0,
      })),
    [analytics?.payments?.by_status, charts.invoiceStatuses],
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
  const invoiceStatusTotal = sumCounts(invoiceStatuses);
  const registrationTotal = analytics?.registrations ? sumCounts(analytics.registrations.trend) : 0;
  const fuelSpendTotal = analytics?.fuel
    ? analytics.fuel.trend.reduce((total, point) => total + Number(point.total_cost ?? 0), 0)
    : 0;
  const paidTotal = analytics?.payments?.paid_total ?? 0;
  const outstandingTotal = analytics?.payments?.outstanding_total ?? 0;

  const regionChartRows = analytics?.ride_requests
    ? getRegionChartRows(analytics.ride_requests.by_region, charts.unassignedRegion)
    : [];

  const regionAxisWidth = getAxisWidth(regionChartRows.map((row) => row.label));
  const regionChartHeight = Math.max(280, regionChartRows.length * 44);

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

  const invoiceStatusLegend = toLegendItems(
    invoiceStatuses.map((item) => ({
      key: item.status,
      label: item.label,
      color: INVOICE_STATUS_COLORS[item.status],
      value: item.count,
    })),
  );

  const complianceLegend: DashboardChartLegendItem[] = [
    { key: "insurance", label: charts.insuranceLabel, color: dashboardChartTheme.brand },
    { key: "inspection", label: charts.inspectionLabel, color: dashboardChartTheme.gold },
  ];

  const paymentTrendLegend: DashboardChartLegendItem[] = [
    { key: "paid", label: charts.paidAmountLabel, color: dashboardChartTheme.brand },
    { key: "issued", label: charts.issuedAmountLabel, color: dashboardChartTheme.gold },
  ];

  const showRideRequests = (loading && canReadRideRequests) || Boolean(analytics?.ride_requests);
  const showFleetSection =
    (loading && canReadVehicles) || Boolean(analytics?.fleet || analytics?.fuel);
  const showFleetStatus = (loading && canReadVehicles) || Boolean(analytics?.fleet);
  const showCompliance =
    (loading && (canReadVehicles || canViewCompliance)) ||
    Boolean(analytics?.fleet?.compliance);
  const showFuel = (loading && canReadVehicles) || Boolean(analytics?.fuel);
  const showPayments = (loading && canReadInvoices) || Boolean(analytics?.payments);
  const showRegistrations =
    (loading && canViewRegistrations) || Boolean(analytics?.registrations);

  const rideRequests = analytics?.ride_requests;
  const fleet = analytics?.fleet;
  const fuel = analytics?.fuel;
  const payments = analytics?.payments;
  const registrations = analytics?.registrations;

  return (
    <div className="space-y-12">
      {showRideRequests ? (
        <ChartSection
          icon={Activity}
          eyebrow={charts.operationsEyebrow}
          title={charts.operationsTitle}
          description={charts.operationsDescription}
          periodLabel={periodLabel}
        >
          <div className="grid gap-5 xl:grid-cols-12">
            <DashboardChartCard
              icon={TrendingUp}
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
                        <stop offset="0%" stopColor={dashboardChartTheme.brand} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={dashboardChartTheme.brand} stopOpacity={0} />
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
                      wrapperStyle={dashboardChartTooltipWrapperStyle}
                      cursor={{
                        stroke: dashboardChartTheme.gold,
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
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
                      activeDot={{
                        r: 5,
                        fill: dashboardChartTheme.brand,
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </DashboardChartCard>

            <DashboardChartCard
              icon={Activity}
              title={charts.rideStatusTitle}
              description={charts.rideStatusDescription}
              highlight={rideStatusTotal}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && rideStatusTotal === 0}
              emptyLabel={charts.empty}
              className="xl:col-span-4"
              footer={
                !loading ? (
                  <DashboardChartLegend items={rideStatusLegend} variant="rows" />
                ) : undefined
              }
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
              icon={MapPinned}
              title={charts.rideRegionTitle}
              description={charts.rideRegionDescription}
              highlight={regionChartRows.reduce((total, row) => total + row.count, 0)}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && regionChartRows.length === 0}
              emptyLabel={charts.empty}
              className="xl:col-span-12"
              contentClassName="!h-auto !min-h-0"
            >
              {!loading && rideRequests ? (
                <div style={{ height: regionChartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={regionChartRows}
                      layout="vertical"
                      margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
                      barCategoryGap="24%"
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
                        wrapperStyle={dashboardChartTooltipWrapperStyle}
                        cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                        content={
                          <DashboardChartTooltip
                            labelFormatter={(value) => String(value)}
                            valueFormatter={(value) => String(value)}
                          />
                        }
                      />
                      <Bar dataKey="count" name={charts.requestsLabel} radius={[0, 8, 8, 0]}>
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
          icon={Truck}
          eyebrow={charts.fleetEyebrow}
          title={charts.fleetTitle}
          description={charts.fleetDescription}
          periodLabel={periodLabel}
        >
          <div className="grid gap-5 xl:grid-cols-12">
            {showFleetStatus ? (
              <DashboardChartCard
                icon={Truck}
                title={charts.fleetStatusTitle}
                description={charts.fleetStatusDescription}
                highlight={fleetStatusTotal}
                highlightLabel={charts.vehiclesLabel}
                loading={loading}
                empty={!loading && fleetStatusTotal === 0}
                emptyLabel={charts.empty}
                className="xl:col-span-4"
                footer={
                  !loading ? (
                    <DashboardChartLegend items={fleetStatusLegend} variant="rows" />
                  ) : undefined
                }
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
                icon={ShieldAlert}
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
                    <BarChart data={complianceChartData} margin={dashboardChartMargins} barGap={8}>
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
                        wrapperStyle={dashboardChartTooltipWrapperStyle}
                        cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                        content={
                          <DashboardChartTooltip valueFormatter={(value) => String(value)} />
                        }
                      />
                      <Bar
                        dataKey="insurance"
                        name={charts.insuranceLabel}
                        fill={dashboardChartTheme.brand}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={32}
                      />
                      <Bar
                        dataKey="inspection"
                        name={charts.inspectionLabel}
                        fill={dashboardChartTheme.gold}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </DashboardChartCard>
            ) : null}

            {showFuel ? (
              <DashboardChartCard
                icon={Fuel}
                title={charts.fuelSpendTitle}
                description={periodLabel}
                highlight={formatMoney(fuelSpendTotal, locale)}
                highlightLabel={charts.fuelCostLabel}
                loading={loading}
                empty={!loading && fuelSpendTotal <= 0}
                emptyLabel={charts.empty}
                className="xl:col-span-12"
              >
                {!loading && fuel && fuelSpendTotal > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fuel.trend} margin={dashboardChartMargins} barCategoryGap="18%">
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
                        width={56}
                        tickFormatter={(value) => formatCurrency(Number(value), locale)}
                        allowDecimals={false}
                        domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                      />
                      <Tooltip
                        wrapperStyle={dashboardChartTooltipWrapperStyle}
                        cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                        content={
                          <DashboardChartTooltip
                            labelFormatter={(value) => formatShortDate(value, locale)}
                            valueFormatter={(value) => formatMoney(value, locale)}
                          />
                        }
                      />
                      <Bar
                        dataKey="total_cost"
                        name={charts.fuelCostLabel}
                        fill={dashboardChartTheme.brand}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                        minPointSize={4}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </DashboardChartCard>
            ) : null}
          </div>
        </ChartSection>
      ) : null}

      {showPayments ? (
        <ChartSection
          icon={Wallet}
          eyebrow={charts.paymentsEyebrow}
          title={charts.paymentsTitle}
          description={charts.paymentsDescription}
          periodLabel={periodLabel}
        >
          <div className="grid gap-5 xl:grid-cols-12">
            <DashboardChartCard
              icon={Receipt}
              title={charts.paymentStatusTitle}
              description={charts.paymentStatusDescription}
              highlight={invoiceStatusTotal}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && invoiceStatusTotal === 0}
              emptyLabel={charts.empty}
              className="xl:col-span-4"
              footer={
                !loading ? (
                  <DashboardChartLegend items={invoiceStatusLegend} variant="rows" />
                ) : undefined
              }
            >
              {!loading ? (
                <DashboardDonutChart
                  slices={invoiceStatuses.map((item) => ({
                    key: item.status,
                    label: item.label,
                    count: item.count,
                    color: INVOICE_STATUS_COLORS[item.status],
                  }))}
                  total={invoiceStatusTotal}
                  centerLabel={charts.totalLabel}
                />
              ) : null}
            </DashboardChartCard>

            <DashboardChartCard
              icon={Wallet}
              title={charts.paymentTrendTitle}
              description={periodLabel}
              highlight={formatMoney(paidTotal, locale)}
              highlightLabel={charts.paidLabel}
              loading={loading}
              empty={!loading && payments ? !hasTrendData(payments.trend) : false}
              emptyLabel={charts.empty}
              className="xl:col-span-8"
              footer={
                !loading ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <DashboardChartLegend items={paymentTrendLegend} />
                    <span className="text-[11px] font-semibold tabular-nums text-slate-500">
                      {charts.outstandingLabel}: {formatMoney(outstandingTotal, locale)}
                    </span>
                  </div>
                ) : undefined
              }
            >
              {!loading && payments ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payments.trend} margin={dashboardChartMargins} barGap={6}>
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
                      width={56}
                      tickFormatter={(value) => formatCurrency(Number(value), locale)}
                      allowDecimals={false}
                      domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                    />
                    <Tooltip
                      wrapperStyle={dashboardChartTooltipWrapperStyle}
                      cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                      content={
                        <DashboardChartTooltip
                          labelFormatter={(value) => formatShortDate(value, locale)}
                          valueFormatter={(value) => formatMoney(value, locale)}
                        />
                      }
                    />
                    <Bar
                      dataKey="paid_amount"
                      name={charts.paidAmountLabel}
                      fill={paymentPaidColor}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                      minPointSize={4}
                    />
                    <Bar
                      dataKey="issued_amount"
                      name={charts.issuedAmountLabel}
                      fill={dashboardChartTheme.gold}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                      minPointSize={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </DashboardChartCard>
          </div>
        </ChartSection>
      ) : null}

      {showRegistrations ? (
        <ChartSection
          icon={UserPlus}
          eyebrow={charts.registrationsEyebrow}
          title={charts.registrationsTitle}
          description={charts.registrationsDescription}
          periodLabel={periodLabel}
        >
          <DashboardChartCard
            icon={UserPlus}
            title={charts.registrationTrendTitle}
            description={periodLabel}
            highlight={registrationTotal}
            highlightLabel={charts.totalLabel}
            loading={loading}
            empty={!loading && registrationTotal <= 0}
            emptyLabel={charts.empty}
          >
            {!loading && registrations && registrationTotal > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={registrations.trend}
                  margin={dashboardChartMargins}
                  barCategoryGap="18%"
                >
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
                    domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                  />
                  <Tooltip
                    wrapperStyle={dashboardChartTooltipWrapperStyle}
                    cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                    content={
                      <DashboardChartTooltip
                        labelFormatter={(value) => formatShortDate(value, locale)}
                        valueFormatter={(value) => String(value)}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    name={charts.registrationsLabel}
                    fill={dashboardChartTheme.gold}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                    minPointSize={6}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </DashboardChartCard>
        </ChartSection>
      ) : null}
    </div>
  );
}
