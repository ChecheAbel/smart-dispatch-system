"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CalendarCheck, Car, ClipboardList, Receipt } from "lucide-react";
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
import type { CustomerInvoice, RideRequest } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { StatCard } from "@/components/shared/stat-card";
import { DashboardChartCard } from "@/components/shared/dashboard-chart-card";
import { DashboardChartLegend } from "@/components/shared/dashboard-chart-legend";
import { DashboardChartTooltip } from "@/components/shared/dashboard-chart-tooltip";
import {
  dashboardChartAxisTick,
  dashboardChartGrid,
  dashboardChartMargins,
  dashboardChartTheme,
} from "@/components/shared/dashboard-chart-theme";
import { Badge } from "@/components/ui/badge";
import { adminBadgeGoldClass, adminHeadingClass } from "@/lib/admin-theme";
import { formatMessage, getCustomerDashboardMessages } from "@/translations";
import { fetchRideRequestCount, fetchRideRequests } from "@/lib/ride-request-api";
import { fetchMyInvoiceCount, fetchMyInvoices } from "@/lib/customer-billing-api";

function formatShortDate(value: string, locale: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function UserDashboardPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getCustomerDashboardMessages(locale);
  const rideTrendGradientId = useId().replace(/:/g, "");
  const spendingTrendGradientId = useId().replace(/:/g, "");

  const [stats, setStats] = useState({
    bookings: 0,
    activeRequests: 0,
    tripsInProgress: 0,
    unpaidInvoices: 0,
  });
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email;

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setLoadingCharts(true);
      try {
        const [
          totalBookings,
          pendingCount,
          confirmedCount,
          inProgressCount,
          unpaidInvoicesCount,
          invoicesPage,
          rideRequestsPage,
        ] = await Promise.all([
          fetchRideRequestCount({ locale }),
          fetchRideRequestCount({ locale, status: "pending" }),
          fetchRideRequestCount({ locale, status: "confirmed" }),
          fetchRideRequestCount({ locale, status: "in_progress" }),
          fetchMyInvoiceCount({ status: "issued" }),
          fetchMyInvoices({ limit: 100, locale }),
          fetchRideRequests({ limit: 100, locale }),
        ]);

        if (!cancelled) {
          setStats({
            bookings: totalBookings,
            activeRequests: pendingCount + confirmedCount,
            tripsInProgress: inProgressCount,
            unpaidInvoices: unpaidInvoicesCount,
          });
          setInvoices(invoicesPage.data);
          setRideRequests(rideRequestsPage.data);
        }
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingCharts(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [locale, user]);

  const bookingTrendData = useMemo(() => {
    const data: { date: string; count: number }[] = [];
    const daysLimit = 30;
    const now = new Date();

    const countByDate = new Map<string, number>();
    for (const request of rideRequests) {
      const dateStr = new Date(request.created_at).toISOString().slice(0, 10);
      countByDate.set(dateStr, (countByDate.get(dateStr) || 0) + 1);
    }

    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      data.push({
        date: dateStr,
        count: countByDate.get(dateStr) || 0,
      });
    }

    return data;
  }, [rideRequests]);

  const bookingsTrendTotal = useMemo(() => {
    return bookingTrendData.reduce((sum, item) => sum + item.count, 0);
  }, [bookingTrendData]);

  const spendingTrendData = useMemo(() => {
    const data: { date: string; amount: number }[] = [];
    const daysLimit = 30;
    const now = new Date();

    const spendByDate = new Map<string, number>();
    for (const invoice of invoices) {
      const dateStr = new Date(invoice.created_at).toISOString().slice(0, 10);
      spendByDate.set(dateStr, (spendByDate.get(dateStr) || 0) + Number(invoice.total_amount));
    }

    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      data.push({
        date: dateStr,
        amount: spendByDate.get(dateStr) || 0,
      });
    }

    return data;
  }, [invoices]);

  const spendingTrendTotal = useMemo(() => {
    return spendingTrendData.reduce((sum, item) => sum + item.amount, 0);
  }, [spendingTrendData]);

  const tripTypesData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of rideRequests) {
      const className = request.vehicle_class?.name || "Unspecified";
      counts.set(className, (counts.get(className) || 0) + 1);
    }

    const colors = ["#1C3A34", "#C9B87A", "#2F5E54", "#4C8578", "#6BA08F", "#8FB5A8", "#dc2626"];
    return Array.from(counts.entries()).map(([label, count], index) => ({
      key: label,
      label,
      count,
      color: colors[index % colors.length] || "#64748b",
    }));
  }, [rideRequests]);

  const requestStatusData = useMemo(() => {
    const counts = {
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const request of rideRequests) {
      const status = request.status;
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    }

    const labelMap: Record<string, string> = {
      pending: locale === "am" ? "የሚጠባበቅ" : "Pending",
      confirmed: locale === "am" ? "ተረጋግጧል" : "Confirmed",
      in_progress: locale === "am" ? "በጉዞ ላይ" : "In progress",
      completed: locale === "am" ? "የተጠናቀቀ" : "Completed",
      cancelled: locale === "am" ? "የተሰረዘ" : "Cancelled",
    };

    const statusColors: Record<string, string> = {
      pending: "#d97706",
      confirmed: "#2563eb",
      in_progress: "#10b981",
      completed: "#1C3A34",
      cancelled: "#dc2626",
    };

    return Object.entries(counts).map(([status, count]) => ({
      status,
      label: labelMap[status] || status,
      count,
      color: statusColors[status] || "#64748b",
    }));
  }, [rideRequests, locale]);

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
          value={stats.bookings}
          description={copy.stats.bookingsDescription}
          icon={CalendarCheck}
          loading={loading}
        />
        <StatCard
          title={copy.stats.requestsTitle}
          value={stats.activeRequests}
          description={copy.stats.requestsDescription}
          icon={ClipboardList}
          loading={loading}
        />
        <StatCard
          title={copy.stats.tripsTitle}
          value={stats.tripsInProgress}
          description={copy.stats.tripsDescription}
          icon={Car}
          loading={loading}
        />
        <StatCard
          title={copy.stats.invoicesTitle}
          value={stats.unpaidInvoices}
          description={copy.stats.invoicesDescription}
          icon={Receipt}
          loading={loading}
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
          <DashboardChartCard
            title={copy.comingSoonCharts.bookingsTrendTitle}
            description={copy.comingSoonCharts.bookingsTrendDescription}
            highlight={bookingsTrendTotal}
            highlightLabel={locale === "am" ? "በጠቅላላ" : "Total"}
            loading={loadingCharts}
            empty={!loadingCharts && rideRequests.length === 0}
            emptyLabel={locale === "am" ? "ምንም መረጃ የለም" : "No data"}
          >
            {!loadingCharts && rideRequests.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookingTrendData} margin={dashboardChartMargins}>
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
                    name={locale === "am" ? "ቦታ ማስያዞች" : "Bookings"}
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
            title={copy.comingSoonCharts.spendingTrendTitle}
            description={copy.comingSoonCharts.spendingTrendDescription}
            highlight={formatCurrency(
              spendingTrendTotal,
              invoices[0]?.currency || "ETB",
              locale,
            )}
            highlightLabel={locale === "am" ? "በጠቅላላ" : "Total spent"}
            loading={loadingCharts}
            empty={!loadingCharts && invoices.length === 0}
            emptyLabel={locale === "am" ? "ምንም መረጃ የለም" : "No data"}
          >
            {!loadingCharts && invoices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrendData} margin={dashboardChartMargins}>
                  <defs>
                    <linearGradient id={spendingTrendGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={dashboardChartTheme.brandMid} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={dashboardChartTheme.brandMid} stopOpacity={0.02} />
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
                    width={60}
                    tickFormatter={(value) =>
                      formatCurrency(Number(value), invoices[0]?.currency || "ETB", locale)
                    }
                  />
                  <Tooltip
                    cursor={{ stroke: dashboardChartTheme.accent, strokeWidth: 1, strokeDasharray: "4 4" }}
                    content={
                      <DashboardChartTooltip
                        labelFormatter={(value) => formatShortDate(value, locale)}
                        valueFormatter={(value) =>
                          formatCurrency(Number(value), invoices[0]?.currency || "ETB", locale)
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name={locale === "am" ? "ወጪ" : "Amount"}
                    stroke={dashboardChartTheme.brandMid}
                    fill={`url(#${spendingTrendGradientId})`}
                    strokeWidth={2.5}
                    activeDot={{ r: 5, fill: dashboardChartTheme.brandMid, stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </DashboardChartCard>

          <DashboardChartCard
            title={copy.comingSoonCharts.tripTypesTitle}
            description={copy.comingSoonCharts.tripTypesDescription}
            highlight={rideRequests.length}
            highlightLabel={locale === "am" ? "ጉዞዎች" : "Trips"}
            loading={loadingCharts}
            empty={!loadingCharts && rideRequests.length === 0}
            emptyLabel={locale === "am" ? "ምንም መረጃ የለም" : "No data"}
            footer={
              !loadingCharts && tripTypesData.length > 0 ? (
                <DashboardChartLegend
                  items={tripTypesData.map((item) => ({
                    key: item.key,
                    label: item.label,
                    color: item.color,
                    value: item.count,
                  }))}
                />
              ) : undefined
            }
          >
            {!loadingCharts && rideRequests.length > 0 ? (
              <div className="relative h-full min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                    <Pie
                      data={tripTypesData}
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
                      {tripTypesData.map((slice) => (
                        <Cell key={slice.key} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardChartTooltip valueFormatter={(value) => String(value)} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold tabular-nums text-[#1C3A34]">{rideRequests.length}</span>
                  <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    {locale === "am" ? "በጠቅላላ" : "Total"}
                  </span>
                </div>
              </div>
            ) : null}
          </DashboardChartCard>

          <DashboardChartCard
            title={copy.comingSoonCharts.requestStatusTitle}
            description={copy.comingSoonCharts.requestStatusDescription}
            highlight={rideRequests.length}
            highlightLabel={locale === "am" ? "ቦታ ማስያዞች" : "Bookings"}
            loading={loadingCharts}
            empty={!loadingCharts && rideRequests.length === 0}
            emptyLabel={locale === "am" ? "ምንም መረጃ የለም" : "No data"}
          >
            {!loadingCharts && rideRequests.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestStatusData} margin={dashboardChartMargins} barCategoryGap="28%">
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
                    content={<DashboardChartTooltip valueFormatter={(value) => String(value)} />}
                  />
                  <Bar dataKey="count" name={locale === "am" ? "ብዛት" : "Count"} radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {requestStatusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </DashboardChartCard>
        </div>
      </div>
    </div>
  );
}
