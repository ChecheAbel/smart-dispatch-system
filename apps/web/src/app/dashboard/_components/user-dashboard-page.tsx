"use client";

import { useId, useState, useEffect, useMemo, type ReactNode } from "react";
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  Car,
  ClipboardList,
  TrendingUp,
  UserRound,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth, useLocale } from "@/components/shared/providers";
import { StatCard } from "@/components/shared/stat-card";
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
import { formatMessage, getCustomerDashboardMessages } from "@/translations";
import { fetchRideRequests } from "@/lib/ride-request-api";
import { fetchMyInvoices } from "@/lib/customer-billing-api";
import type { RideRequest, CustomerInvoice, RideRequestStatus } from "@smart-dispatch/types";
import { cn } from "@/lib/utils";

type DonutSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
};

const STATUS_COLORS: Record<RideRequestStatus, string> = {
  pending: "#C9B87A",
  confirmed: "#4C8578",
  in_progress: "#1C3A34",
  completed: "#8FB5A8",
  cancelled: "#94a3b8",
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

function formatShortDate(value: string, locale: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoney(value: number, locale: string) {
  return `${formatCurrency(value, locale)} ETB`;
}

function buildLast30Days() {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function UserDashboardPage() {
  const { user, hasPermission } = useAuth();
  const { locale } = useLocale();
  const copy = getCustomerDashboardMessages(locale);
  const charts = copy.comingSoonCharts;
  const rideTrendGradientId = useId().replace(/:/g, "");

  const canReadRequests = hasPermission("customer_requests.read");
  const canReadInvoices = hasPermission("customer_invoices.read");

  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const [requestsRes, invoicesRes] = await Promise.all([
          canReadRequests ? fetchRideRequests({ limit: 100 }) : { data: [] },
          canReadInvoices ? fetchMyInvoices({ limit: 100 }) : { data: [] },
        ]);
        if (active) {
          setRequests(requestsRes.data);
          setInvoices(invoicesRes.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard metrics", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadData();
    return () => {
      active = false;
    };
  }, [canReadRequests, canReadInvoices]);

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email;

  const totalBookings = requests.length;
  const activeRequests = requests.filter((r) => r.status === "pending").length;
  const tripsInProgress = requests.filter((r) => r.status === "in_progress").length;

  const bookingTrend = useMemo(() => {
    return buildLast30Days().map((dateStr) => {
      const count = requests.filter((r) => r.created_at.slice(0, 10) === dateStr).length;
      return { date: dateStr, count };
    });
  }, [requests]);

  const spendingTrend = useMemo(() => {
    return buildLast30Days().map((dateStr) => {
      const total_cost = invoices
        .filter((inv) => inv.issued_at?.slice(0, 10) === dateStr)
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      return { date: dateStr, total_cost };
    });
  }, [invoices]);

  const requestStatuses = useMemo(() => {
    const statuses: RideRequestStatus[] = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ];
    const labels: Record<RideRequestStatus, string> = {
      pending: locale === "am" ? "በመጠባበቅ ላይ" : "Pending",
      confirmed: locale === "am" ? "የተረጋገጠ" : "Confirmed",
      in_progress: locale === "am" ? "በሂደት ላይ" : "In progress",
      completed: locale === "am" ? "የተጠናቀቀ" : "Completed",
      cancelled: locale === "am" ? "የተሰረዘ" : "Cancelled",
    };
    return statuses.map((status) => {
      const count = requests.filter((r) => r.status === status).length;
      return {
        key: status,
        status,
        label: labels[status],
        count,
        color: STATUS_COLORS[status],
      };
    });
  }, [requests, locale]);

  const tripTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      const name =
        r.vehicle_class?.name ||
        r.vehicle_type?.name ||
        (locale === "am" ? "መደበኛ" : "Standard");
      counts[name] = (counts[name] || 0) + 1;
    });
    const colors = ["#1C3A34", "#2F5E54", "#4C8578", "#6BA08F", "#8FB5A8", "#C9B87A", "#64748b"];
    return Object.keys(counts).map((name, index) => ({
      key: name,
      label: name,
      count: counts[name],
      color: colors[index % colors.length],
    }));
  }, [requests, locale]);

  const requestStatusLegend: DashboardChartLegendItem[] = useMemo(
    () =>
      requestStatuses
        .filter((item) => item.count > 0)
        .map((item) => ({
          key: item.status,
          label: item.label,
          color: item.color,
          value: item.count,
        })),
    [requestStatuses],
  );

  const tripTypesLegend: DashboardChartLegendItem[] = useMemo(
    () =>
      tripTypes.map((item) => ({
        key: item.key,
        label: item.label,
        color: item.color,
        value: item.count,
      })),
    [tripTypes],
  );

  const totalSpent = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}>
          {formatMessage(copy.welcome, { name: displayName })}
        </h2>
        <p className="max-w-2xl text-sm text-slate-500">{copy.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={copy.stats.bookingsTitle}
          value={totalBookings}
          description={copy.stats.bookingsDescription}
          icon={CalendarCheck}
          loading={loading}
        />
        <StatCard
          title={copy.stats.requestsTitle}
          value={activeRequests}
          description={copy.stats.requestsDescription}
          icon={ClipboardList}
          loading={loading}
        />
        <StatCard
          title={copy.stats.tripsTitle}
          value={tripsInProgress}
          description={copy.stats.tripsDescription}
          icon={Car}
          loading={loading}
        />
        <StatCard
          title={copy.stats.profileTitle}
          value={locale === "am" ? "ንቁ" : "Active"}
          description={copy.stats.profileDescription}
          icon={UserRound}
          loading={loading}
        />
      </div>

      <div className="space-y-12">
        <ChartSection
          icon={Activity}
          eyebrow={charts.activityEyebrow}
          title={charts.activityTitle}
          description={charts.activityDescription}
          periodLabel={charts.periodLabel}
        >
          <div className="grid gap-5 xl:grid-cols-12">
            <DashboardChartCard
              icon={TrendingUp}
              title={charts.bookingsTrendTitle}
              description={charts.bookingsTrendDescription}
              highlight={totalBookings}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && totalBookings === 0}
              emptyLabel={charts.emptyBookings}
              className="xl:col-span-8"
            >
              {!loading && totalBookings > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bookingTrend} margin={dashboardChartMargins}>
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
                      domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
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
              icon={ClipboardList}
              title={charts.requestStatusTitle}
              description={charts.requestStatusDescription}
              highlight={totalBookings}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && totalBookings === 0}
              emptyLabel={charts.emptyBookings}
              className="xl:col-span-4"
              footer={
                !loading && requestStatusLegend.length > 0 ? (
                  <DashboardChartLegend items={requestStatusLegend} variant="rows" />
                ) : undefined
              }
            >
              {!loading && totalBookings > 0 ? (
                <DashboardDonutChart
                  slices={requestStatuses}
                  total={totalBookings}
                  centerLabel={charts.requestsLabel}
                />
              ) : null}
            </DashboardChartCard>
          </div>
        </ChartSection>

        <ChartSection
          icon={Wallet}
          eyebrow={charts.billingEyebrow}
          title={charts.billingTitle}
          description={charts.billingDescription}
          periodLabel={charts.periodLabel}
        >
          <div className="grid gap-5 xl:grid-cols-12">
            <DashboardChartCard
              icon={Car}
              title={charts.tripTypesTitle}
              description={charts.tripTypesDescription}
              highlight={totalBookings}
              highlightLabel={charts.totalLabel}
              loading={loading}
              empty={!loading && totalBookings === 0}
              emptyLabel={charts.emptyBookings}
              className="xl:col-span-4"
              footer={
                !loading && tripTypesLegend.length > 0 ? (
                  <DashboardChartLegend items={tripTypesLegend} variant="rows" />
                ) : undefined
              }
            >
              {!loading && totalBookings > 0 ? (
                <DashboardDonutChart
                  slices={tripTypes}
                  total={totalBookings}
                  centerLabel={charts.tripsLabel}
                />
              ) : null}
            </DashboardChartCard>

            <DashboardChartCard
              icon={Wallet}
              title={charts.spendingTrendTitle}
              description={charts.spendingTrendDescription}
              highlight={formatMoney(totalSpent, locale)}
              highlightLabel={charts.spentLabel}
              loading={loading}
              empty={!loading && totalSpent === 0}
              emptyLabel={charts.emptySpending}
              className="xl:col-span-8"
            >
              {!loading && totalSpent > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingTrend} margin={dashboardChartMargins} barCategoryGap="18%">
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
                          valueFormatter={(value) => formatMoney(Number(value), locale)}
                        />
                      }
                    />
                    <Bar
                      dataKey="total_cost"
                      name={charts.costLabel}
                      fill={dashboardChartTheme.brand}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                      minPointSize={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </DashboardChartCard>
          </div>
        </ChartSection>
      </div>
    </div>
  );
}
