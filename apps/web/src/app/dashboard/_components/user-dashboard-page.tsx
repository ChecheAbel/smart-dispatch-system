"use client";

import { useId, useState, useEffect, useMemo } from "react";
import { CalendarCheck, Car, ClipboardList, UserRound } from "lucide-react";
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
import { DashboardChartLegend } from "@/components/shared/dashboard-chart-legend";
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
import { adminHeadingClass } from "@/lib/admin-theme";
import { formatMessage, getCustomerDashboardMessages } from "@/translations";
import { fetchRideRequests } from "@/lib/ride-request-api";
import { fetchMyInvoices } from "@/lib/customer-billing-api";
import type { RideRequest, CustomerInvoice, RideRequestStatus } from "@smart-dispatch/types";

type DonutSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
};

const STATUS_COLORS: Record<RideRequestStatus, string> = {
  pending: "#d97706",
  confirmed: "#2563eb",
  in_progress: "#1C3A34",
  completed: "#10b981",
  cancelled: "#dc2626",
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
          <Tooltip
            wrapperStyle={dashboardChartTooltipWrapperStyle}
            content={<DashboardChartTooltip valueFormatter={(value) => String(value)} />}
          />
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

export function UserDashboardPage() {
  const { user, hasPermission } = useAuth();
  const { locale } = useLocale();
  const copy = getCustomerDashboardMessages(locale);
  const rideTrendGradientId = useId().replace(/:/g, "");
  const spendingBarGradientId = useId().replace(/:/g, "");

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

  // Stats
  const totalBookings = requests.length;
  const activeRequests = requests.filter((r) => r.status === "pending").length;
  const tripsInProgress = requests.filter((r) => r.status === "in_progress").length;

  // Chart datasets
  const bookingTrend = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map((dateStr) => {
      const count = requests.filter((r) => r.created_at.slice(0, 10) === dateStr).length;
      return { date: dateStr, count };
    });
  }, [requests]);

  const spendingTrend = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map((dateStr) => {
      const total_cost = invoices
        .filter((inv) => inv.issued_at?.slice(0, 10) === dateStr)
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      return { date: dateStr, total_cost };
    });
  }, [invoices]);

  const requestStatuses = useMemo(() => {
    const statuses: RideRequestStatus[] = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
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
      const name = r.vehicle_class?.name || r.vehicle_type?.name || (locale === "am" ? "መደበኛ" : "Standard");
      counts[name] = (counts[name] || 0) + 1;
    });
    const colors = ["#1C3A34", "#2F5E54", "#4C8578", "#6BA08F", "#8FB5A8", "#C2D9D2", "#64748b"];
    return Object.keys(counts).map((name, index) => ({
      key: name,
      label: name,
      count: counts[name],
      color: colors[index % colors.length],
    }));
  }, [requests, locale]);

  const requestStatusLegend = useMemo(
    () =>
      requestStatuses
        .filter((item) => item.count > 0)
        .map((item) => ({
          key: item.status,
          label: item.label,
          color: item.color,
        })),
    [requestStatuses],
  );

  const tripTypesLegend = useMemo(
    () =>
      tripTypes.map((item) => ({
        key: item.key,
        label: item.label,
        color: item.color,
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

      <div className="space-y-10">
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <DashboardChartCard
              title={copy.comingSoonCharts.bookingsTrendTitle}
              description={copy.comingSoonCharts.bookingsTrendDescription}
              highlight={totalBookings}
              highlightLabel={locale === "am" ? "አጠቃላይ" : "Total"}
              loading={loading}
              empty={!loading && totalBookings === 0}
              emptyLabel={locale === "am" ? "የጉዞ መረጃ የለም" : "No bookings found"}
              className="lg:col-span-8"
            >
              {!loading ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bookingTrend} margin={dashboardChartMargins}>
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
                      wrapperStyle={dashboardChartTooltipWrapperStyle}
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
                      name={locale === "am" ? "ጥያቄዎች" : "Requests"}
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
              title={copy.comingSoonCharts.requestStatusTitle}
              description={copy.comingSoonCharts.requestStatusDescription}
              highlight={totalBookings}
              highlightLabel={locale === "am" ? "አጠቃላይ" : "Total"}
              loading={loading}
              empty={!loading && totalBookings === 0}
              emptyLabel={locale === "am" ? "የጉዞ መረጃ የለም" : "No bookings found"}
              className="lg:col-span-4"
              footer={!loading && requestStatusLegend.length > 0 ? <DashboardChartLegend items={requestStatusLegend} /> : undefined}
            >
              {!loading ? (
                <DashboardDonutChart
                  slices={requestStatuses}
                  total={totalBookings}
                  centerLabel={locale === "am" ? "ጥያቄዎች" : "Requests"}
                />
              ) : null}
            </DashboardChartCard>
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <DashboardChartCard
              title={copy.comingSoonCharts.tripTypesTitle}
              description={copy.comingSoonCharts.tripTypesDescription}
              highlight={totalBookings}
              highlightLabel={locale === "am" ? "አጠቃላይ" : "Total"}
              loading={loading}
              empty={!loading && totalBookings === 0}
              emptyLabel={locale === "am" ? "የጉዞ መረጃ የለም" : "No bookings found"}
              className="lg:col-span-4"
              footer={!loading && tripTypesLegend.length > 0 ? <DashboardChartLegend items={tripTypesLegend} /> : undefined}
            >
              {!loading ? (
                <DashboardDonutChart
                  slices={tripTypes}
                  total={totalBookings}
                  centerLabel={locale === "am" ? "ጉዞዎች" : "Trips"}
                />
              ) : null}
            </DashboardChartCard>

            <DashboardChartCard
              title={copy.comingSoonCharts.spendingTrendTitle}
              description={copy.comingSoonCharts.spendingTrendDescription}
              highlight={`${formatCurrency(totalSpent, locale)} ETB`}
              highlightLabel={locale === "am" ? "አጠቃላይ ወጪ" : "Total Spent"}
              loading={loading}
              empty={!loading && totalSpent === 0}
              emptyLabel={locale === "am" ? "የክፍያ መረጃ የለም" : "No spending recorded"}
              className="lg:col-span-8"
            >
              {!loading ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingTrend} margin={dashboardChartMargins} barCategoryGap="28%">
                    <defs>
                      <linearGradient id={spendingBarGradientId} x1="0" y1="0" x2="0" y2="1">
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
                      width={52}
                      tickFormatter={(value) => `${formatCurrency(Number(value), locale)}`}
                    />
                    <Tooltip
                      wrapperStyle={dashboardChartTooltipWrapperStyle}
                      cursor={{ fill: "rgba(28, 58, 52, 0.04)" }}
                      content={
                        <DashboardChartTooltip
                          labelFormatter={(value) => formatShortDate(value, locale)}
                          valueFormatter={(value) => `${formatCurrency(Number(value), locale)} ETB`}
                        />
                      }
                    />
                    <Bar
                      dataKey="total_cost"
                      name={locale === "am" ? "ወጪ" : "Cost"}
                      fill={`url(#${spendingBarGradientId})`}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </DashboardChartCard>
          </div>
        </section>
      </div>
    </div>
  );
}
