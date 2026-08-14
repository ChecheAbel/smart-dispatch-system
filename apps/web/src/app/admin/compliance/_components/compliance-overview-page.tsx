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
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { canReadCompliance } from "@/lib/permissions";
import { fetchVehicleComplianceSummary } from "@/lib/vehicle-api";
import { formatMessage, getAdminComplianceMessages } from "@/translations";
import { cn } from "@/lib/utils";

const STATUS_ORDER: VehicleComplianceStatus[] = ["expired", "due_soon", "ok", "not_set"];

const STATUS_CARD_CLASS: Record<VehicleComplianceStatus, string> = {
  expired: "border-red-200/80 bg-red-50/50 hover:bg-red-50 dark:border-red-400/25 dark:bg-red-400/10 dark:hover:bg-red-400/15",
  due_soon: "border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-400/25 dark:bg-amber-400/10 dark:hover:bg-amber-400/15",
  ok: "border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/15",
  not_set: "border-slate-200/80 bg-slate-50/80 hover:bg-slate-50 dark:border-border dark:bg-muted/40 dark:hover:bg-muted/55",
};

const STATUS_COUNT_CLASS: Record<VehicleComplianceStatus, string> = {
  expired: "text-red-700 dark:text-red-300",
  due_soon: "text-amber-800 dark:text-amber-200",
  ok: "text-emerald-800 dark:text-emerald-200",
  not_set: "text-slate-700 dark:text-muted-foreground",
};

type ComplianceReportType = "insurance" | "inspection";

type StatsCopy = ReturnType<typeof getAdminComplianceMessages>["stats"];
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
  overviewCopy,
  loading,
}: {
  type: ComplianceReportType;
  title: string;
  description: string;
  summary: VehicleComplianceSummary[ComplianceReportType];
  totalVehicles: number;
  statsCopy: StatsCopy;
  overviewCopy: OverviewCopy;
  loading: boolean;
}) {
  const Icon: LucideIcon = type === "insurance" ? ShieldCheck : ClipboardList;
  const basePath = `/admin/compliance/${type}`;
  const issues = issueCount(summary);
  const validPercent =
    totalVehicles > 0 ? Math.round((summary.ok / totalVehicles) * 100) : 0;

  return (
    <section className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
      <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-border">
        <div className="flex min-w-0 items-start gap-3">
          <div className={adminIconBoxClass}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className={cn("text-base font-semibold", adminHeadingClass)}>{title}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 self-start sm:self-center"
          render={<Link href={basePath} />}
          nativeButton={false}
        >
          {overviewCopy.viewAll}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
        {loading ? (
          <Skeleton className="h-4 w-64" />
        ) : (
          <p className="text-sm text-slate-600 dark:text-muted-foreground">
            {formatMessage(overviewCopy.compliantSummary, {
              valid: String(summary.ok),
              total: String(totalVehicles),
            })}{" "}
            <span className="text-slate-400 dark:text-muted-foreground/70">({validPercent}%)</span>
            {issues > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {formatMessage(overviewCopy.needsAction, { count: String(issues) })}
                </span>
              </>
            ) : (
              <>
                {" · "}
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  {overviewCopy.allCompliant}
                </span>
              </>
            )}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const count = summary[status];

            return (
              <Link
                key={status}
                href={`${basePath}?status=${status}`}
                className={cn(
                  "rounded-lg border px-3 py-3 transition-colors",
                  STATUS_CARD_CLASS[status],
                )}
              >
                <p className="text-xs font-medium text-slate-600 dark:text-muted-foreground">
                  {statusLabel(status, statsCopy)}
                </p>
                {loading ? (
                  <Skeleton className="mt-2 h-7 w-10" />
                ) : (
                  <p
                    className={cn(
                      "mt-1 text-2xl font-bold tabular-nums tracking-tight",
                      STATUS_COUNT_CLASS[status],
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
      <header className="space-y-1">
        <h1 className={cn("text-2xl font-bold tracking-tight sm:text-[1.75rem]", adminHeadingClass)}>
          {copy.overview.title}
        </h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
          {copy.overview.description}
        </p>
      </header>

      {!loading && data.vehicles_needing_attention > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {formatMessage(copy.overview.attentionMessage, {
              count: String(data.vehicles_needing_attention),
            })}
          </p>
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

      <div className="grid gap-4 xl:grid-cols-2">
        <ComplianceDomainSection
          type="insurance"
          title={copy.overview.insuranceSection}
          description={copy.overview.insuranceDescription}
          summary={data.insurance}
          totalVehicles={data.total_vehicles}
          statsCopy={copy.stats}
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
          overviewCopy={copy.overview}
          loading={loading}
        />
      </div>
    </div>
  );
}
