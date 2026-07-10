"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  ClipboardCheck,
  FileSearch,
  Map,
  MapPinned,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminDashboardAnalytics } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { adminBadgeGoldClass, adminCardClass, adminHeadingClass } from "@/lib/admin-theme";
import { fetchAdminDashboardAnalytics } from "@/lib/dashboard-api";
import { PERMISSIONS, canReadCompliance } from "@/lib/permissions";
import { formatMessage, getAdminDashboardMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { AdminDashboardCharts } from "./admin-dashboard-charts";
import { AdminDashboardStats } from "./admin-dashboard-stats";

type QuickLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function DashboardQuickLinks({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: QuickLinkItem[];
}) {
  if (links.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className={`text-lg font-bold ${adminHeadingClass}`}>{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                adminCardClass,
                "group flex items-center gap-3 rounded-xl px-4 py-3.5 transition hover:border-[#1C3A34]/25 hover:bg-[#1C3A34]/[0.03] hover:shadow-sm",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/[0.06] text-[#1C3A34] transition group-hover:bg-[#1C3A34] group-hover:text-white">
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-semibold text-slate-800">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
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
  const canViewRegistrations = hasPermission(PERMISSIONS.user_registrations.read);
  const canReadRoles = hasPermission(PERMISSIONS.roles.read);
  const canReadFarePlans = hasPermission(PERMISSIONS.fare_plans.read);
  const canReadNotifications = hasPermission(PERMISSIONS.notifications.read);
  const canReadAuditLogs = hasPermission(PERMISSIONS.audit_logs.read);

  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email;

  const quickLinks = useMemo(() => {
    const links: QuickLinkItem[] = [];

    if (canReadUsers) {
      links.push({ href: "/admin/users", label: copy.quickLinks.users, icon: Users });
    }
    if (canReadVehicles) {
      links.push({ href: "/admin/fleet/vehicles", label: copy.quickLinks.vehicles, icon: Truck });
    }
    if (canReadRideRequests) {
      links.push({
        href: "/admin/ride-requests",
        label: copy.quickLinks.rideRequests,
        icon: CalendarCheck,
      });
    }
    if (canViewCompliance) {
      links.push({
        href: "/admin/compliance",
        label: copy.quickLinks.compliance,
        icon: ShieldCheck,
      });
    }
    if (canReadLocations) {
      links.push({ href: "/admin/locations/sites", label: copy.quickLinks.locations, icon: MapPinned });
    }
    if (canReadRegions) {
      links.push({ href: "/admin/locations/regions", label: copy.quickLinks.regions, icon: Map });
    }
    if (canViewRegistrations) {
      links.push({
        href: "/admin/user-registrations",
        label: copy.quickLinks.registrations,
        icon: ClipboardCheck,
      });
    }
    if (canReadFarePlans) {
      links.push({
        href: "/admin/billing/fare-plans",
        label: copy.quickLinks.farePlans,
        icon: Receipt,
      });
    }
    if (canReadNotifications) {
      links.push({
        href: "/admin/notification-templates",
        label: copy.quickLinks.notifications,
        icon: Bell,
      });
    }
    if (canReadAuditLogs) {
      links.push({ href: "/admin/audit-logs", label: copy.quickLinks.auditLogs, icon: FileSearch });
    }
    if (canReadRoles) {
      links.push({ href: "/admin/roles", label: copy.quickLinks.roles, icon: Users });
    }

    return links;
  }, [
    canReadAuditLogs,
    canViewCompliance,
    canReadFarePlans,
    canReadLocations,
    canReadNotifications,
    canReadRegions,
    canReadRideRequests,
    canReadRoles,
    canReadUsers,
    canReadVehicles,
    canViewRegistrations,
    copy.quickLinks,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      try {
        const next = await fetchAdminDashboardAnalytics({ locale, period_days: 30 });
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

  const hasReporting =
    analytics?.ride_requests ||
    analytics?.fleet ||
    analytics?.fuel ||
    analytics?.registrations;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <h2 className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}>
          {copy.title}
        </h2>
        <p className="text-sm font-medium text-slate-700">
          {formatMessage(copy.welcome, { name: displayName })}
        </p>
        <p className="max-w-3xl text-sm text-slate-500">{copy.description}</p>
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

      {hasReporting || loading ? (
        <AdminDashboardCharts analytics={analytics} loading={loading} locale={locale} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500">
          {copy.charts.noAccess}
        </div>
      )}

      <DashboardQuickLinks
        title={copy.quickLinks.title}
        description={copy.quickLinks.description}
        links={quickLinks}
      />
    </div>
  );
}
