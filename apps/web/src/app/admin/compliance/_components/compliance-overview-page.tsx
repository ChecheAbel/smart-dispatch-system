"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { VehicleComplianceStatus, VehicleComplianceSummary } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { canReadCompliance } from "@/lib/permissions";
import { fetchVehicleComplianceSummary } from "@/lib/vehicle-api";
import { complianceStatusToExpiryTone, expiryToneClass } from "@/lib/vehicle-compliance";
import { formatMessage, getAdminComplianceMessages } from "@/translations";
import { cn } from "@/lib/utils";

const STATUS_ORDER: VehicleComplianceStatus[] = ["expired", "due_soon", "ok", "not_set"];

const STATUS_BAR_CLASS: Record<VehicleComplianceStatus, string> = {
  expired: "bg-red-500",
  due_soon: "bg-amber-400",
  ok: "bg-emerald-500",
  not_set: "bg-slate-300",
};

type ComplianceReportType = "insurance" | "inspection";

function statusBarWidth(count: number, total: number) {
  if (total <= 0 || count <= 0) return 0;
  return Math.max((count / total) * 100, count > 0 ? 4 : 0);
}

function ComplianceReportPanel({
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
  statsCopy: ReturnType<typeof getAdminComplianceMessages>["stats"];
  statusCopy: ReturnType<typeof getAdminComplianceMessages>["status"];
  overviewCopy: ReturnType<typeof getAdminComplianceMessages>["overview"];
  loading: boolean;
}) {
  const Icon: LucideIcon = type === "insurance" ? ShieldCheck : ClipboardList;
  const basePath = `/admin/compliance/${type}`;
  const issuesCount = summary.expired + summary.due_soon + summary.not_set;
  const validPercent =
    totalVehicles > 0 ? Math.round((summary.ok / totalVehicles) * 100) : 0;

  return (
    <section
      className={cn(
        adminCardClass,
        "flex flex-col overflow-hidden rounded-2xl border-slate-200/80",
      )}
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-[#1C3A34]/[0.05] via-white to-white px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={cn(adminIconBoxClass, "shrink-0 rounded-xl p-2.5")}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className={cn("text-lg font-bold tracking-tight", adminHeadingClass)}>{title}</h2>
              <p className="text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
          </div>
          <Link
            href={basePath}
            className={cn(
              adminPrimaryButtonClass,
              "inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2 text-sm shadow-sm",
            )}
          >
            {overviewCopy.viewAll}
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {overviewCopy.reportSummary}
              </p>
              {loading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-[#1C3A34]">
                  {formatMessage(overviewCopy.compliantSummary, {
                    valid: String(summary.ok),
                    total: String(totalVehicles),
                  })}
                </p>
              )}
              {!loading ? (
                <p className="text-sm text-slate-500">
                  {issuesCount > 0
                    ? formatMessage(overviewCopy.needsAction, { count: String(issuesCount) })
                    : overviewCopy.allCompliant}
                </p>
              ) : null}
            </div>
            {!loading ? (
              <div className="text-right">
                <p className="text-3xl font-extrabold tabular-nums text-[#1C3A34]">{validPercent}%</p>
                <p className="text-xs font-medium text-slate-500">{overviewCopy.validRate}</p>
              </div>
            ) : (
              <Skeleton className="h-10 w-14" />
            )}
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-500">{overviewCopy.statusBreakdown}</p>
            {loading ? (
              <Skeleton className="h-2.5 w-full rounded-full" />
            ) : (
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                {STATUS_ORDER.map((status) => {
                  const width = statusBarWidth(summary[status], totalVehicles);
                  if (width <= 0) return null;
                  return (
                    <div
                      key={status}
                      className={cn("h-full transition-all", STATUS_BAR_CLASS[status])}
                      style={{ width: `${width}%` }}
                      title={`${statusCopy[status]}: ${summary[status]}`}
                    />
                  );
                })}
              </div>
            )}
            {!loading ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {STATUS_ORDER.map((status) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={cn("size-2 rounded-full", STATUS_BAR_CLASS[status])} />
                    <span>{statusCopy[status]}</span>
                    <span className="font-semibold tabular-nums text-slate-800">{summary[status]}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {overviewCopy.browseByStatus}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {STATUS_ORDER.map((status) => {
              const tone = complianceStatusToExpiryTone(status);
              const statTitle =
                status === "expired"
                  ? statsCopy.expired
                  : status === "due_soon"
                    ? statsCopy.dueSoon
                    : status === "ok"
                      ? statsCopy.ok
                      : statsCopy.notSet;
              const statDescription =
                status === "expired"
                  ? statsCopy.expiredDescription
                  : status === "due_soon"
                    ? statsCopy.dueSoonDescription
                    : status === "ok"
                      ? statsCopy.okDescription
                      : statsCopy.notSetDescription;

              return (
                <Link
                  key={status}
                  href={`${basePath}?status=${status}`}
                  className="group rounded-xl border border-slate-100 bg-white p-3.5 transition hover:border-[#1C3A34]/15 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">{statTitle}</p>
                    <Badge variant="outline" className={cn("text-[10px]", expiryToneClass(tone))}>
                      {statusCopy[status]}
                    </Badge>
                  </div>
                  {loading ? (
                    <Skeleton className="mt-2 h-8 w-12" />
                  ) : (
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[#1C3A34] group-hover:text-[#162e29]">
                      {summary[status]}
                    </p>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{statDescription}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ComplianceOverviewPage() {
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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
          <h1 className={cn("text-2xl font-extrabold tracking-tight sm:text-3xl", adminHeadingClass)}>
            {copy.overview.title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            {copy.overview.description}
          </p>
        </div>
        {!loading ? (
          <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{copy.stats.fleetVehicles}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#1C3A34]">
              {data.total_vehicles}
            </p>
          </div>
        ) : (
          <Skeleton className="h-[4.25rem] w-28 rounded-xl" />
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
        <ComplianceReportPanel
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
        <ComplianceReportPanel
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
