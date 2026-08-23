"use client";

import { useId, useState, useEffect, useMemo, type ReactNode } from "react";
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Car,
  ChevronDown,
  ClipboardList,
  RefreshCcw,
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

type DashboardPreset = "today" | "week" | "month" | "year" | "custom";

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
  no_show: "#ea580c",
};

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const value = startOfLocalDay(date);
  const day = value.getDay();
  const offset = day === 0 ? 6 : day - 1;
  value.setDate(value.getDate() - offset);
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function dateDiffDays(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

function rangeForPreset(preset: Exclude<DashboardPreset, "custom">) {
  const now = new Date();
  const today = toIsoDate(now);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: toIsoDate(startOfWeek(now)), to: today };
    case "month":
      return { from: toIsoDate(startOfMonth(now)), to: today };
    case "year":
      return { from: toIsoDate(startOfYear(now)), to: today };
  }
}

function buildDateBuckets(fromIso: string, toIso: string) {
  const days: string[] = [];
  const count = Math.max(1, dateDiffDays(fromIso, toIso));
  const start = new Date(`${fromIso}T00:00:00`);

  for (let index = 0; index < count; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    days.push(toIsoDate(date));
  }

  return days;
}

function isDateInRange(value: string | null | undefined, fromIso: string, toIso: string) {
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= fromIso && day <= toIso;
}

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

export function UserDashboardPage() {
  const { user, hasPermission } = useAuth();
  const { locale } = useLocale();
  const copy = getCustomerDashboardMessages(locale);
  const charts = copy.comingSoonCharts;
  const filters = copy.filters;
  const rideTrendGradientId = useId().replace(/:/g, "");

  const canReadRequests = hasPermission("customer_requests.read");
  const canReadInvoices = hasPermission("customer_invoices.read");

  const initialRange = useMemo(() => rangeForPreset("month"), []);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preset, setPreset] = useState<DashboardPreset>("month");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [appliedFromDate, setAppliedFromDate] = useState(initialRange.from);
  const [appliedToDate, setAppliedToDate] = useState(initialRange.to);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const [requestsRes, invoicesRes] = await Promise.all([
          canReadRequests ? fetchRideRequests({ limit: 200 }) : { data: [] as RideRequest[] },
          canReadInvoices ? fetchMyInvoices({ limit: 200 }) : { data: [] as CustomerInvoice[] },
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

  function applyRange(from: string, to: string) {
    const normalizedFrom = from <= to ? from : to;
    const normalizedTo = to >= from ? to : from;
    setFromDate(normalizedFrom);
    setToDate(normalizedTo);
    setAppliedFromDate(normalizedFrom);
    setAppliedToDate(normalizedTo);
  }

  function selectPreset(nextPreset: DashboardPreset) {
    setPreset(nextPreset);
    if (nextPreset === "custom") return;
    const range = rangeForPreset(nextPreset);
    applyRange(range.from, range.to);
  }

  function applyCustomFilters() {
    applyRange(fromDate, toDate);
  }

  function resetFilters() {
    const range = rangeForPreset("month");
    setPreset("month");
    applyRange(range.from, range.to);
  }

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email;

  const periodRequests = useMemo(
    () =>
      requests.filter((request) =>
        isDateInRange(request.created_at, appliedFromDate, appliedToDate),
      ),
    [requests, appliedFromDate, appliedToDate],
  );

  const periodInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        isDateInRange(invoice.issued_at ?? invoice.created_at, appliedFromDate, appliedToDate),
      ),
    [invoices, appliedFromDate, appliedToDate],
  );

  const totalBookings = periodRequests.length;
  const activeRequests = requests.filter((r) => r.status === "pending").length;
  const tripsInProgress = requests.filter((r) => r.status === "in_progress").length;

  const periodLabel = formatMessage(filters.selectedRange, {
    from: appliedFromDate,
    to: appliedToDate,
  });

  const bookingTrend = useMemo(() => {
    return buildDateBuckets(appliedFromDate, appliedToDate).map((dateStr) => {
      const count = periodRequests.filter((r) => r.created_at.slice(0, 10) === dateStr).length;
      return { date: dateStr, count };
    });
  }, [periodRequests, appliedFromDate, appliedToDate]);

  const spendingTrend = useMemo(() => {
    return buildDateBuckets(appliedFromDate, appliedToDate).map((dateStr) => {
      const total_cost = periodInvoices
        .filter((inv) => (inv.issued_at ?? inv.created_at)?.slice(0, 10) === dateStr)
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      return { date: dateStr, total_cost };
    });
  }, [periodInvoices, appliedFromDate, appliedToDate]);

  const requestStatuses = useMemo(() => {
    const statuses: RideRequestStatus[] = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ];
    const labels: Record<RideRequestStatus, string> = {
      pending: locale === "am" ? "በመጠባበቅ ላይ" : "Pending",
      confirmed: locale === "am" ? "የተረጋገጠ" : "Confirmed",
      in_progress: locale === "am" ? "በሂደት ላይ" : "In progress",
      completed: locale === "am" ? "የተጠናቀቀ" : "Completed",
      cancelled: locale === "am" ? "የተሰረዘ" : "Cancelled",
      no_show: locale === "am" ? "አልታየም" : "No-show",
    };
    return statuses.map((status) => {
      const count = periodRequests.filter((r) => r.status === status).length;
      return {
        key: status,
        status,
        label: labels[status],
        count,
        color: STATUS_COLORS[status],
      };
    });
  }, [periodRequests, locale]);

  const tripTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    periodRequests.forEach((r) => {
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
  }, [periodRequests, locale]);

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

  const totalSpent = periodInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}>
          {formatMessage(copy.welcome, { name: displayName })}
        </h2>
        <p className="max-w-2xl text-sm text-slate-500">{copy.description}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-border dark:bg-card">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1C3A34]/8 text-[#1C3A34] dark:bg-[#C9B87A]/15 dark:text-[#C9B87A]">
              <CalendarRange className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {filters.periodLabel}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{periodLabel}</p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
              filtersOpen && "rotate-180",
            )}
          />
        </button>

        {filtersOpen ? (
          <div className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {filters.choosePeriod}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["today", filters.today],
                      ["week", filters.thisWeek],
                      ["month", filters.thisMonth],
                      ["year", filters.thisYear],
                      ["custom", filters.customRange],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectPreset(value)}
                      disabled={loading}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        preset === value
                          ? "border-[#1C3A34] bg-[#1C3A34] text-white dark:border-[#C9B87A] dark:bg-[#C9B87A] dark:text-[#1C3A34]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#1C3A34]/40 dark:border-border dark:bg-background dark:text-slate-300",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {preset === "custom" ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[340px]">
                  <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>{filters.fromDate}</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      max={toDate}
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 dark:border-border dark:bg-background dark:text-foreground"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>{filters.toDate}</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      min={fromDate}
                      max={todayIso}
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 dark:border-border dark:bg-background dark:text-foreground"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-border dark:text-slate-300"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {filters.reset}
              </button>
              {preset === "custom" ? (
                <button
                  type="button"
                  onClick={applyCustomFilters}
                  disabled={loading}
                  className="rounded-lg bg-[#1C3A34] px-3 py-2 text-xs font-semibold text-white hover:bg-[#162e29] disabled:opacity-70 dark:bg-[#C9B87A] dark:text-[#1C3A34] dark:hover:bg-[#bca969]"
                >
                  {filters.apply}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
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
          periodLabel={periodLabel}
        >
          <div className="grid gap-5 xl:grid-cols-12">
            <DashboardChartCard
              icon={TrendingUp}
              title={charts.bookingsTrendTitle}
              description={periodLabel}
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
          periodLabel={periodLabel}
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
              description={periodLabel}
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
