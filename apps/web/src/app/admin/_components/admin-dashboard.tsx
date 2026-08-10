"use client";

import { useEffect, useState } from "react";
import type { AdminDashboardAnalytics } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { adminHeadingClass } from "@/lib/admin-theme";
import { fetchAdminDashboardAnalytics } from "@/lib/dashboard-api";
import { PERMISSIONS, canReadCompliance } from "@/lib/permissions";
import { formatMessage, getAdminDashboardMessages } from "@/translations";
import { AdminDashboardCharts } from "./admin-dashboard-charts";
import { AdminDashboardStats } from "./admin-dashboard-stats";

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

  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

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
          period_days: 30,
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
  }, [locale]);

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
