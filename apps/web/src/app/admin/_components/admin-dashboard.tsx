"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminDashboardAnalytics } from "@smart-dispatch/types";
import { CalendarRange, ChevronDown, RefreshCcw } from "lucide-react";
import { useAuth, useLocale } from "@/components/shared/providers";
import { adminHeadingClass } from "@/lib/admin-theme";
import { fetchAdminDashboardAnalytics } from "@/lib/dashboard-api";
import { PERMISSIONS, canReadCompliance } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { formatMessage, getAdminDashboardMessages } from "@/translations";
import { AdminDashboardCharts } from "./admin-dashboard-charts";
import { AdminDashboardStats } from "./admin-dashboard-stats";

type DashboardPreset = "today" | "week" | "month" | "year" | "custom";

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

export function AdminDashboard() {
  const { user, hasPermission } = useAuth();
  const { locale } = useLocale();
  const copy = getAdminDashboardMessages(locale);

  const canReadUsers = hasPermission(PERMISSIONS.users.read);
  const canReadVehicles = hasPermission(PERMISSIONS.vehicles.read);
  const canViewCompliance = canReadCompliance(hasPermission);
  const canReadLocations = hasPermission(PERMISSIONS.locations.read);
  const canReadRegions = hasPermission(PERMISSIONS.regions.read);
  const canReadRideRequests = hasPermission(PERMISSIONS.ride_requests.read);
  const canViewRegistrations = hasPermission(
    PERMISSIONS.user_registrations.read,
  );
  const canReadInvoices = hasPermission(PERMISSIONS.invoices.read);

  const initialRange = useMemo(() => rangeForPreset("month"), []);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preset, setPreset] = useState<DashboardPreset>("month");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [appliedFromDate, setAppliedFromDate] = useState(initialRange.from);
  const [appliedToDate, setAppliedToDate] = useState(initialRange.to);

  const periodDays = Math.max(1, dateDiffDays(appliedFromDate, appliedToDate));

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.email;

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      try {
        const next = await fetchAdminDashboardAnalytics({
          locale,
          period_days: periodDays,
          from_date: appliedFromDate,
          to_date: appliedToDate,
        });
        if (!cancelled) {
          setAnalytics(next);
        }
      } catch {
        if (!cancelled) {
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [locale, periodDays, appliedFromDate, appliedToDate]);

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

    if (nextPreset === "custom") {
      return;
    }

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

  const hasReportingAccess =
    canReadRideRequests ||
    canReadVehicles ||
    canViewRegistrations ||
    canReadInvoices;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2
          className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}
        >
          {formatMessage(copy.welcome, { name: displayName })}
        </h2>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-muted-foreground">
          {copy.description}
        </p>
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
                {copy.filters.periodLabel}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {formatMessage(copy.filters.selectedRange, {
                  from: appliedFromDate,
                  to: appliedToDate,
                })}
              </p>
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
                  {copy.filters.choosePeriod}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["today", copy.filters.today],
                      ["week", copy.filters.thisWeek],
                      ["month", copy.filters.thisMonth],
                      ["year", copy.filters.thisYear],
                      ["custom", copy.filters.customRange],
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
                    <span>{copy.filters.fromDate}</span>
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
                    <span>{copy.filters.toDate}</span>
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
                {copy.filters.reset}
              </button>
              {preset === "custom" ? (
                <button
                  type="button"
                  onClick={applyCustomFilters}
                  disabled={loading}
                  className="rounded-lg bg-[#1C3A34] px-3 py-2 text-xs font-semibold text-white hover:bg-[#162e29] disabled:opacity-70 dark:bg-[#C9B87A] dark:text-[#1C3A34] dark:hover:bg-[#bca969]"
                >
                  {copy.filters.apply}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <AdminDashboardStats
        locale={locale}
        analytics={analytics}
        analyticsLoading={loading}
        canReadUsers={canReadUsers}
        canReadVehicles={canReadVehicles}
        canReadLocations={canReadLocations}
        canReadRegions={canReadRegions}
        canReadRideRequests={canReadRideRequests}
        canViewCompliance={canViewCompliance}
        canViewRegistrations={canViewRegistrations}
      />

      {hasReportingAccess ? (
        <AdminDashboardCharts
          analytics={analytics}
          loading={loading}
          locale={locale}
          canReadRideRequests={canReadRideRequests}
          canReadVehicles={canReadVehicles}
          canViewCompliance={canViewCompliance}
          canReadInvoices={canReadInvoices}
          canViewRegistrations={canViewRegistrations}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
          {copy.charts.noAccess}
        </div>
      )}
    </div>
  );
}
