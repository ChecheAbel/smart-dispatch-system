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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminBadgeGoldClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { canReadCompliance } from "@/lib/permissions";
import { fetchVehicleComplianceSummary } from "@/lib/vehicle-api";
import { formatMessage, getAdminComplianceMessages } from "@/translations";
import { cn } from "@/lib/utils";

const STATUS_ORDER: VehicleComplianceStatus[] = ["expired", "due_soon", "ok", "not_set"];

const STATUS_ACCENT: Record<VehicleComplianceStatus, string> = {
  expired: "bg-red-500",
  due_soon: "bg-amber-400",
  ok: "bg-[#1C3A34]",
  not_set: "bg-slate-300",
};

const STATUS_TRACK: Record<VehicleComplianceStatus, string> = {
  expired: "bg-red-50",
  due_soon: "bg-amber-50",
  ok: "bg-[#1C3A34]/[0.06]",
  not_set: "bg-slate-100",
};

type ComplianceReportType = "insurance" | "inspection";

type StatusCopy = ReturnType<typeof getAdminComplianceMessages>["status"];
type StatsCopy = ReturnType<typeof getAdminComplianceMessages>["stats"];
type OverviewCopy = ReturnType<typeof getAdminComplianceMessages>["overview"];

function statusLabel(status: VehicleComplianceStatus, stats: StatsCopy) {
  if (status === "expired") return stats.expired;
  if (status === "due_soon") return stats.dueSoon;
  if (status === "ok") return stats.ok;
  return stats.notSet;
}

function statusDescription(status: VehicleComplianceStatus, stats: StatsCopy) {
  if (status === "expired") return stats.expiredDescription;
  if (status === "due_soon") return stats.dueSoonDescription;
  if (status === "ok") return stats.okDescription;
  return stats.notSetDescription;
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

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="relative border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,184,122,0.18),_transparent_55%),linear-gradient(135deg,_rgba(28,58,52,0.06),_transparent_50%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1C3A34] text-white shadow-sm">
              <Icon className="size-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 className={cn("text-xl font-extrabold tracking-tight", adminHeadingClass)}>
                {title}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
          </div>
          <Link
            href={basePath}
            className={cn(
              adminPrimaryButtonClass,
              "inline-flex shrink-0 items-center justify-center gap-1.5 self-start",
            )}
          >
            {overviewCopy.viewAll}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-[minmax(0,11rem)_1fr]">
        <div className="flex flex-col justify-center border-b border-slate-100 px-5 py-6 sm:border-r sm:border-b-0 sm:px-6">
          <p className={adminEyebrowClass}>{overviewCopy.validRate}</p>
          {loading ? (
            <Skeleton className="mt-3 h-12 w-20" />
          ) : (
            <p className="mt-2 text-5xl font-extrabold tracking-tight tabular-nums text-[#1C3A34]">
              {validPercent}
              <span className="text-2xl font-bold text-[#C9B87A]">%</span>
            </p>
          )}
          {loading ? (
            <Skeleton className="mt-3 h-4 w-36" />
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {formatMessage(overviewCopy.compliantSummary, {
                valid: String(summary.ok),
                total: String(totalVehicles),
              })}
            </p>
          )}
          {!loading ? (
            <p
              className={cn(
                "mt-2 text-xs font-semibold",
                issues > 0 ? "text-amber-700" : "text-emerald-700",
              )}
            >
              {issues > 0
                ? formatMessage(overviewCopy.needsAction, { count: String(issues) })
                : overviewCopy.allCompliant}
            </p>
          ) : null}
        </div>

        <div className="divide-y divide-slate-100">
          {STATUS_ORDER.map((status) => {
            const count = summary[status];
            const share =
              totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0;

            return (
              <Link
                key={status}
                href={`${basePath}?status=${status}`}
                className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-[#1C3A34]/[0.02] sm:px-6"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    STATUS_TRACK[status],
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", STATUS_ACCENT[status])} />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {statusLabel(status, statsCopy)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {statusDescription(status, statsCopy)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {loading ? (
                        <Skeleton className="ml-auto h-6 w-8" />
                      ) : (
                        <p className="text-lg font-extrabold tabular-nums text-[#1C3A34]">
                          {count}
                        </p>
                      )}
                      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                        {statusCopy[status]}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    {loading ? null : (
                      <div
                        className={cn("h-full rounded-full transition-all", STATUS_ACCENT[status])}
                        style={{ width: `${Math.max(share, count > 0 ? 6 : 0)}%` }}
                      />
                    )}
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1C3A34]" />
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
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-2">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <h1 className={cn("text-2xl font-extrabold tracking-tight sm:text-3xl", adminHeadingClass)}>
          {copy.overview.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          {copy.overview.description}
        </p>
        {!loading && data.vehicles_needing_attention > 0 ? (
          <p className="text-sm font-medium text-amber-800">
            {formatMessage(copy.overview.attentionMessage, {
              count: String(data.vehicles_needing_attention),
            })}
          </p>
        ) : null}
      </header>

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
