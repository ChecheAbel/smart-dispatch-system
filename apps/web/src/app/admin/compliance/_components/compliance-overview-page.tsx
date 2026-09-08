"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { VehicleComplianceStatus, VehicleComplianceSummary } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { canReadCompliance } from "@/lib/permissions";
import { fetchVehicleComplianceSummary } from "@/lib/vehicle-api";
import { formatMessage, getAdminComplianceMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { COMPLIANCE_STATUS_CONFIG } from "./compliance-status-badge";

const STATUS_ORDER: VehicleComplianceStatus[] = ["expired", "due_soon", "ok", "not_set"];

type ComplianceReportType = "insurance" | "inspection";

type StatsCopy = ReturnType<typeof getAdminComplianceMessages>["stats"];
type StatusCopy = ReturnType<typeof getAdminComplianceMessages>["status"];
type OverviewCopy = ReturnType<typeof getAdminComplianceMessages>["overview"];

function statusLabel(status: VehicleComplianceStatus, stats: StatsCopy) {
  if (status === "expired") return stats.expired;
  if (status === "due_soon") return stats.dueSoon;
  if (status === "ok") return stats.ok;
  return stats.notSet;
}

function issueCount(summary: Record<VehicleComplianceStatus, number>) {
  return summary.expired + summary.due_soon + summary.not_set;
}

function ComplianceDomainSection({
  type,
  title,
  description,
  summary,
  totalVehicles,
  statsCopy,
  statusCopy,
  overviewCopy,
  loading,
}: {
  type: ComplianceReportType;
  title: string;
  description: string;
  summary: VehicleComplianceSummary[ComplianceReportType];
  totalVehicles: number;
  statsCopy: StatsCopy;
  statusCopy: StatusCopy;
  overviewCopy: OverviewCopy;
  loading: boolean;
}) {
  const Icon: LucideIcon = type === "insurance" ? ShieldCheck : ClipboardList;
  const basePath = `/admin/compliance/${type}`;
  const issues = issueCount(summary);
  const validPercent =
    totalVehicles > 0 ? Math.round((summary.ok / totalVehicles) * 100) : 0;

  // Proportion calculation for visual bar
  const okPct = totalVehicles > 0 ? (summary.ok / totalVehicles) * 100 : 0;
  const duePct = totalVehicles > 0 ? (summary.due_soon / totalVehicles) * 100 : 0;
  const expPct = totalVehicles > 0 ? (summary.expired / totalVehicles) * 100 : 0;
  const notSetPct = totalVehicles > 0 ? (summary.not_set / totalVehicles) * 100 : 0;

  return (
    <section className={cn(adminCardClass, "flex flex-col overflow-hidden rounded-xl border border-slate-200/90 shadow-sm dark:border-border")}>
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-4.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-border/60 dark:bg-card">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(adminIconBoxClass, "mt-0.5 shrink-0")}>
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={cn("text-base font-bold", adminHeadingClass)}>{title}</h2>
              {!loading && (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide border",
                  validPercent >= 90
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : validPercent >= 70
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                )}>
                  {validPercent}% {statsCopy.ok}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8.5 shrink-0 gap-1.5 self-start rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:self-center dark:border-border dark:bg-card dark:text-muted-foreground"
          render={<Link href={basePath} />}
          nativeButton={false}
        >
          {overviewCopy.viewAll}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-4 p-5 sm:p-6">
        <div>
          {loading ? (
            <Skeleton className="h-4 w-64" />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-muted-foreground">
                <p>
                  {formatMessage(overviewCopy.compliantSummary, {
                    valid: String(summary.ok),
                    total: String(totalVehicles),
                  })}
                  {issues > 0 ? (
                    <>
                      {" · "}
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        {formatMessage(overviewCopy.needsAction, { count: String(issues) })}
                      </span>
                    </>
                  ) : (
                    <>
                      {" · "}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {overviewCopy.allCompliant}
                      </span>
                    </>
                  )}
                </p>
                <span className="font-semibold text-slate-700 dark:text-foreground">{validPercent}%</span>
              </div>

              {/* Stacked Progress Bar */}
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
                {okPct > 0 && (
                  <div
                    style={{ width: `${okPct}%` }}
                    className="h-full bg-emerald-500 transition-all duration-500"
                    title={`${statsCopy.ok}: ${summary.ok}`}
                  />
                )}
                {duePct > 0 && (
                  <div
                    style={{ width: `${duePct}%` }}
                    className="h-full bg-amber-500 transition-all duration-500"
                    title={`${statsCopy.dueSoon}: ${summary.due_soon}`}
                  />
                )}
                {expPct > 0 && (
                  <div
                    style={{ width: `${expPct}%` }}
                    className="h-full bg-red-500 transition-all duration-500"
                    title={`${statsCopy.expired}: ${summary.expired}`}
                  />
                )}
                {notSetPct > 0 && (
                  <div
                    style={{ width: `${notSetPct}%` }}
                    className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                    title={`${statsCopy.notSet}: ${summary.not_set}`}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const count = summary[status];
            const config = COMPLIANCE_STATUS_CONFIG[status];

            return (
              <Link
                key={status}
                href={`${basePath}?status=${status}`}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all hover:shadow-xs",
                  config.cardBorderClass,
                  config.cardBgClass,
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        config.dotClass,
                        config.pulse && "animate-pulse",
                      )}
                    />
                    <p
                      className="min-w-0 truncate text-xs font-medium text-slate-600 dark:text-muted-foreground"
                      title={status === "due_soon" ? statsCopy.dueSoon : statusLabel(status, statsCopy)}
                    >
                      {status === "due_soon" ? (
                        <>
                          {/* Full descriptive label on wide single-column cards */}
                          <span className="hidden sm:max-xl:inline min-[1750px]:inline">
                            {statsCopy.dueSoon}
                          </span>
                          {/* Concise label on smaller cards (mobile & 2-column desktop) */}
                          <span className="inline sm:max-xl:hidden min-[1750px]:hidden">
                            {statusCopy.due_soon}
                          </span>
                        </>
                      ) : (
                        statusLabel(status, statsCopy)
                      )}
                    </p>
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="mt-2.5 h-7 w-10" />
                ) : (
                  <p
                    className={cn(
                      "mt-2 text-2xl font-extrabold tabular-nums tracking-tight transition-transform group-hover:translate-x-0.5",
                      config.textClass,
                    )}
                  >
                    {count}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ComplianceOverviewPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminComplianceMessages(locale);
  const canRead = canReadCompliance(hasPermission);
  const [summary, setSummary] = useState<VehicleComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      try {
        const next = await fetchVehicleComplianceSummary();
        if (!cancelled) setSummary(next);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const emptySummary: VehicleComplianceSummary = {
    total_vehicles: 0,
    vehicles_needing_attention: 0,
    insurance: { expired: 0, due_soon: 0, ok: 0, not_set: 0 },
    inspection: { expired: 0, due_soon: 0, ok: 0, not_set: 0 },
  };

  const data = summary ?? emptySummary;

  return (
    <div className="w-full max-w-none space-y-6">
      <header className="space-y-1.5">
        <p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>
        <h1 className={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}>
          {copy.overview.title}
        </h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
          {copy.overview.description}
        </p>
      </header>

      {!loading && data.vehicles_needing_attention > 0 ? (
        <div className="flex items-center gap-3.5 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white p-4 text-sm text-amber-950 shadow-xs dark:border-amber-400/30 dark:from-amber-400/10 dark:via-amber-400/5 dark:to-transparent dark:text-amber-100">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
            <AlertTriangle className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {formatMessage(copy.overview.attentionMessage, {
                count: String(data.vehicles_needing_attention),
              })}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
              {copy.overview.description}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={copy.stats.fleetVehicles}
          value={data.total_vehicles}
          description={copy.stats.fleetVehiclesDescription}
          icon={Truck}
          loading={loading}
        />
        <StatCard
          title={copy.stats.needsAttention}
          value={data.vehicles_needing_attention}
          description={copy.stats.needsAttentionDescription}
          icon={AlertTriangle}
          loading={loading}
        />
        <StatCard
          title={copy.stats.insuranceNotSet}
          value={data.insurance.not_set}
          description={copy.stats.insuranceNotSetDescription}
          icon={ShieldCheck}
          loading={loading}
          onClick={() => router.push("/admin/compliance/insurance?status=not_set")}
        />
        <StatCard
          title={copy.stats.inspectionNotSet}
          value={data.inspection.not_set}
          description={copy.stats.inspectionNotSetDescription}
          icon={ClipboardList}
          loading={loading}
          onClick={() => router.push("/admin/compliance/inspection?status=not_set")}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ComplianceDomainSection
          type="insurance"
          title={copy.overview.insuranceSection}
          description={copy.overview.insuranceDescription}
          summary={data.insurance}
          totalVehicles={data.total_vehicles}
          statsCopy={copy.stats}
          statusCopy={copy.status}
          overviewCopy={copy.overview}
          loading={loading}
        />
        <ComplianceDomainSection
          type="inspection"
          title={copy.overview.inspectionSection}
          description={copy.overview.inspectionDescription}
          summary={data.inspection}
          totalVehicles={data.total_vehicles}
          statsCopy={copy.stats}
          statusCopy={copy.status}
          overviewCopy={copy.overview}
          loading={loading}
        />
      </div>
    </div>
  );
}
