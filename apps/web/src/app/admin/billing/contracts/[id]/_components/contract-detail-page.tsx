"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Car,
  FileText,
  Layers3,
  MapPin,
  Pencil,
} from "lucide-react";
import type { Contract, ContractEnrollment, ContractStatus } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { fetchContractById, fetchContractEnrollments } from "@/lib/contract-api";
import { fetchActiveRegions } from "@/lib/region-api";
import { fetchActiveVehicleClasses } from "@/lib/vehicle-class-api";
import { fetchActiveVehicleTypes } from "@/lib/vehicle-type-api";
import { PERMISSIONS } from "@/lib/permissions";
import { formatMessage, getAdminContractsMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { CreateContractSheet } from "@/app/admin/billing/contracts/_components/create-contract-sheet";

const STATUS_BADGE_CLASS: Record<ContractStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  active: adminBadgeSuccessClass,
  expired: "border-amber-200 bg-amber-50 text-amber-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: string, locale: string) {
  const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type EnrollmentPeriodStatus = "active" | "upcoming" | "ended";

function getEnrollmentPeriodStatus(
  enrollment: Pick<ContractEnrollment, "starts_at" | "ends_at">,
): EnrollmentPeriodStatus {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);

  const start = new Date(`${enrollment.starts_at.slice(0, 10)}T12:00:00.000Z`);
  const end = new Date(`${enrollment.ends_at.slice(0, 10)}T12:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "active";
  }

  if (today < start) {
    return "upcoming";
  }

  if (today > end) {
    return "ended";
  }

  return "active";
}

const ENROLLMENT_STATUS_CLASS: Record<EnrollmentPeriodStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  upcoming: "border-sky-200 bg-sky-50 text-sky-800",
  ended: "border-amber-200 bg-amber-50 text-amber-800",
};

type ScopeLabels = {
  regions: string[];
  vehicleTypes: string[];
  vehicleClasses: string[];
};

export function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminContractsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.contracts.read);
  const canWrite = hasPermission(PERMISSIONS.contracts.write);
  const [contract, setContract] = useState<Contract | null>(null);
  const [enrollments, setEnrollments] = useState<ContractEnrollment[]>([]);
  const [scopeLabels, setScopeLabels] = useState<ScopeLabels>({
    regions: [],
    vehicleTypes: [],
    vehicleClasses: [],
  });
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!canRead || !params.id) return;

    let cancelled = false;

    async function loadContract() {
      setLoading(true);
      try {
        const [result, regions, vehicleTypes, vehicleClasses, enrollmentResult] = await Promise.all([
          fetchContractById(params.id, locale),
          fetchActiveRegions(locale),
          fetchActiveVehicleTypes(locale),
          fetchActiveVehicleClasses(locale),
          fetchContractEnrollments(params.id),
        ]);

        if (cancelled) return;

        const nextContract = result.contract;
        setContract(nextContract);
        setEnrollments(enrollmentResult.enrollments);

        const regionMap = new Map(regions.map((item) => [item.id, item.name]));
        const vehicleTypeMap = new Map(vehicleTypes.map((item) => [item.id, item.name]));
        const vehicleClassMap = new Map(vehicleClasses.map((item) => [item.id, item.name]));

        setScopeLabels({
          regions: nextContract.region_ids
            .map((id) => regionMap.get(id))
            .filter((name): name is string => Boolean(name)),
          vehicleTypes: nextContract.vehicle_type_ids
            .map((id) => vehicleTypeMap.get(id))
            .filter((name): name is string => Boolean(name)),
          vehicleClasses: nextContract.vehicle_class_ids
            .map((id) => vehicleClassMap.get(id))
            .filter((name): name is string => Boolean(name)),
        });
      } catch {
        if (!cancelled) {
          setContract(null);
          setEnrollments([]);
          setScopeLabels({ regions: [], vehicleTypes: [], vehicleClasses: [] });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadContract();

    return () => {
      cancelled = true;
    };
  }, [canRead, locale, params.id, refreshKey]);

  const scopeSummary = useMemo(
    () => ({
      regions: scopeLabels.regions.length,
      vehicleTypes: scopeLabels.vehicleTypes.length,
      vehicleClasses: scopeLabels.vehicleClasses.length,
    }),
    [scopeLabels],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  if (loading) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 sm:space-y-6">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-2 py-8 text-center sm:px-0">
        <div className={adminIconBoxClass}>
          <FileText className="size-5" />
        </div>
        <div className="space-y-1">
          <p className={cn("text-lg", adminHeadingClass)}>{copy.toast.loadFailed.title}</p>
          <p className="text-sm text-slate-500">{copy.toast.loadFailed.description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-slate-600"
          render={<Link href="/admin/billing/contracts" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          {copy.detail.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 sm:space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-slate-600"
        render={<Link href="/admin/billing/contracts" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" />
        {copy.detail.back}
      </Button>

      <section
        className={cn(
          adminCardClass,
          "overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-[#1C3A34]/[0.04]",
        )}
      >
        <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:p-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="shrink-0 rounded-2xl bg-[#1C3A34] p-2.5 text-white shadow-sm sm:p-3">
              <FileText className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className={adminEyebrowClass}>{copy.eyebrow}</p>
              <h1 className={cn("text-2xl tracking-tight break-words sm:text-3xl", adminHeadingClass)}>
                {contract.title}
              </h1>
              <p className="text-sm text-slate-500">
                {formatDate(contract.created_at, locale)}
                {contract.created_by ? ` · ${contract.created_by.name}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:gap-2">
                <Badge className={adminBadgeGoldClass}>{contract.reference_number}</Badge>
                <Badge variant="outline" className={STATUS_BADGE_CLASS[contract.status]}>
                  {copy.status[contract.status]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {canWrite ? (
              <Button
                type="button"
                className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                onClick={() => setSheetOpen(true)}
              >
                <Pencil className="size-4" />
                {copy.actions.edit}
              </Button>
            ) : null}

            <div className="grid w-full grid-cols-1 gap-2.5 min-[420px]:grid-cols-3 sm:gap-3 lg:w-auto lg:min-w-[22rem]">
              <QuickFact label={copy.columns.status} value={copy.status[contract.status]} />
              <QuickFact
                label={copy.columns.created}
                value={formatDate(contract.created_at, locale)}
              />
              <QuickFact
                label={copy.detail.scope}
                value={`${scopeSummary.regions + scopeSummary.vehicleTypes + scopeSummary.vehicleClasses}`}
                hint={`${scopeSummary.regions} ${copy.form.regions.toLowerCase()} · ${scopeSummary.vehicleTypes} ${copy.form.vehicleTypes.toLowerCase()}`}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-5">
        <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-5 lg:p-6")}>
          <SectionHeader
            icon={FileText}
            title={copy.detail.overview}
            description={copy.description}
          />

          <dl className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <InfoTile label={copy.columns.reference} value={contract.reference_number} mono />
            <InfoTile label={copy.columns.status} value={copy.status[contract.status]} />
            <InfoTile
              label={copy.detail.billingInterval}
              value={copy.billingIntervals[contract.billing_interval]}
            />
            {contract.billing_interval !== "per_trip" && contract.payment_terms_days ? (
              <InfoTile
                label={copy.detail.paymentTerms}
                value={formatMessage(copy.detail.paymentTermsValue, {
                  days: contract.payment_terms_days,
                })}
              />
            ) : null}
            <InfoTile
              label={copy.columns.created}
              value={formatDate(contract.created_at, locale)}
            />
          </dl>

          <div className="rounded-xl border border-dashed border-slate-200 px-3.5 py-3">
            <p className="text-xs font-medium text-slate-500">{copy.detail.term}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{copy.detail.customerTermHint}</p>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 px-3.5 py-3">
            <p className="text-xs font-medium text-slate-500">{copy.detail.notes}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {contract.notes || "—"}
            </p>
          </div>
        </section>

        <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-5 lg:p-6")}>
          <SectionHeader
            icon={MapPin}
            title={copy.detail.scope}
            description={copy.form.scopeDescription}
          />

          <div className="space-y-4">
            <ScopeGroup
              icon={MapPin}
              label={copy.form.regions}
              items={scopeLabels.regions}
              count={contract.region_ids.length}
            />
            <ScopeGroup
              icon={Car}
              label={copy.form.vehicleTypes}
              items={scopeLabels.vehicleTypes}
              count={contract.vehicle_type_ids.length}
            />
            <ScopeGroup
              icon={Layers3}
              label={copy.form.vehicleClasses}
              items={scopeLabels.vehicleClasses}
              count={contract.vehicle_class_ids.length}
            />
          </div>
        </section>
      </div>

      <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-5 lg:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeader
            icon={FileText}
            title={copy.detail.enrollments}
            description={copy.detail.enrollmentsDescription}
          />
          {enrollments.length > 0 ? (
            <Badge variant="outline" className="text-xs text-slate-600">
              {formatMessage(copy.detail.enrollmentCount, { count: enrollments.length })}
            </Badge>
          ) : null}
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">{copy.detail.noEnrollments}</p>
            <p className="mt-1 text-sm text-slate-500">{copy.detail.noEnrollmentsDescription}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="w-12 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.enrollmentCustomer}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.enrollmentStarts}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.enrollmentEnds}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.enrollmentStatus}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {copy.detail.enrollmentCreated}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {enrollments.map((enrollment, index) => {
                  const periodStatus = getEnrollmentPeriodStatus(enrollment);
                  const statusLabel =
                    periodStatus === "active"
                      ? copy.detail.enrollmentStatusActive
                      : periodStatus === "upcoming"
                        ? copy.detail.enrollmentStatusUpcoming
                        : copy.detail.enrollmentStatusEnded;

                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-center text-slate-500 tabular-nums">{index + 1}</td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-slate-800">{enrollment.requester.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{enrollment.requester.email}</p>
                        <p className="text-xs text-slate-500">{enrollment.requester.mobile_number}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {formatDate(enrollment.starts_at, locale)}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {formatDate(enrollment.ends_at, locale)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge className={cn("text-xs", ENROLLMENT_STATUS_CLASS[periodStatus])}>
                          {statusLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">
                        {formatDate(enrollment.created_at, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateContractSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="edit"
        contractId={contract.id}
        onSuccess={() => setRefreshKey((current) => current + 1)}
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={adminIconBoxClass}>
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className={cn("text-base", adminHeadingClass)}>{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function QuickFact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function InfoTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className={cn("mt-1 text-sm font-semibold text-slate-800", mono && "font-mono text-xs")}>
        {value}
      </dd>
    </div>
  );
}

function ScopeGroup({
  icon: Icon,
  label,
  items,
  count,
}: {
  icon: typeof MapPin;
  label: string;
  items: string[];
  count: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white p-1.5 text-[#1C3A34] shadow-sm">
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500">
              {count} selected
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-[#C9B87A]/30 bg-[#C9B87A]/10 text-[#8f7d45]">
          {count}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className="border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {item}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-slate-500">—</p>
        )}
      </div>
    </div>
  );
}
