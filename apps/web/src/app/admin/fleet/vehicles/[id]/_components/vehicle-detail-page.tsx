"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Droplets,
  Gauge,
  History,
  Plus,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import type {
  MaintenanceWorkType,
  Vehicle,
  VehicleHistoryEvent,
  VehicleMaintenanceLog,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchActiveMaintenanceWorkTypes } from "@/lib/maintenance-work-type-api";
import {
  createVehicleMaintenance,
  fetchVehicleById,
  fetchVehicleHistory,
  fetchVehicleMaintenance,
  updateVehicle,
  updateVehicleMaintenance,
} from "@/lib/vehicle-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";

type VehicleDetailPageProps = {
  vehicleId: string;
};

type DetailTab = "overview" | "maintenance" | "history";

type ExpiryTone = "ok" | "dueSoon" | "expired" | "notSet";

const textareaClassName = cn(
  adminInputClass,
  "min-h-[128px] h-auto w-full resize-y rounded-xl border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 shadow-sm placeholder:text-slate-400 focus-visible:border-[#1C3A34] focus-visible:ring-2 focus-visible:ring-[#1C3A34]/15",
);

const MAINTENANCE_STATUSES: VehicleMaintenanceStatus[] = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
];

function parseDateInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateInputValue(date: Date | undefined): string {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function maintenanceTypeIcon(slug: string) {
  switch (slug) {
    case "scheduled":
      return CalendarClock;
    case "repair":
      return Wrench;
    case "inspection":
      return ShieldCheck;
    case "tire":
      return Gauge;
    case "oil":
      return Droplets;
    case "accident":
      return AlertTriangle;
    default:
      return ClipboardList;
  }
}

function parseTab(value: string | null): DetailTab {
  if (value === "maintenance" || value === "history") return value;
  return "overview";
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${value}T00:00:00`);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryTone(value: string | null | undefined): ExpiryTone {
  const diff = daysUntil(value);
  if (diff == null) return "notSet";
  if (diff < 0) return "expired";
  if (diff <= 30) return "dueSoon";
  return "ok";
}

function expiryToneClass(tone: ExpiryTone) {
  switch (tone) {
    case "expired":
      return "border-red-200 bg-red-50 text-red-800";
    case "dueSoon":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "notSet":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function vehicleStatusBadgeClass(status: Vehicle["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "maintenance":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "retired":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function maintenanceStatusClass(status: VehicleMaintenanceStatus) {
  switch (status) {
    case "open":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function historyIcon(eventType: VehicleHistoryEvent["event_type"]) {
  switch (eventType) {
    case "maintenance_opened":
    case "maintenance_updated":
    case "maintenance_completed":
    case "maintenance_cancelled":
      return Wrench;
    case "expiry_updated":
      return CalendarClock;
    case "driver_assigned":
    case "driver_unassigned":
      return UserRound;
    case "status_changed":
      return AlertTriangle;
    default:
      return History;
  }
}

export function VehicleDetailPage({ vehicleId }: VehicleDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminVehiclesMessages(locale);
  const detail = copy.detail;
  const canRead = hasPermission(PERMISSIONS.vehicles.read);
  const canWrite = hasPermission(PERMISSIONS.vehicles.write);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>(parseTab(searchParams.get("tab")));
  const [history, setHistory] = useState<VehicleHistoryEvent[]>([]);
  const [maintenance, setMaintenance] = useState<VehicleMaintenanceLog[]>([]);
  const [workTypes, setWorkTypes] = useState<MaintenanceWorkType[]>([]);
  const [workTypesLoading, setWorkTypesLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [creatingMaintenance, setCreatingMaintenance] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [insuranceExpiresAt, setInsuranceExpiresAt] = useState("");
  const [inspectionExpiresAt, setInspectionExpiresAt] = useState("");

  const [maintenanceForm, setMaintenanceForm] = useState({
    work_type_id: "",
    status: "open" as VehicleMaintenanceStatus,
    description: "",
    vendor: "",
    cost_amount: "",
    odometer_km: "",
    started_at: "",
    next_due_at: "",
  });

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchVehicleById(vehicleId, locale);
      setVehicle(next);
      setInsuranceExpiresAt(next.insurance_expires_at ?? "");
      setInspectionExpiresAt(next.inspection_expires_at ?? "");
    } catch (error) {
      showErrorToast({
        title: detail.toast.loadFailed.title,
        description: error instanceof Error ? error.message : detail.toast.loadFailed.description,
      });
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }, [detail.toast.loadFailed.description, detail.toast.loadFailed.title, locale, vehicleId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await fetchVehicleHistory(vehicleId, { page: 1, limit: 50 });
      setHistory(result.data);
    } catch (error) {
      showErrorToast({
        title: detail.toast.loadHistoryFailed.title,
        description:
          error instanceof Error ? error.message : detail.toast.loadHistoryFailed.description,
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [
    detail.toast.loadHistoryFailed.description,
    detail.toast.loadHistoryFailed.title,
    vehicleId,
  ]);

  const loadMaintenance = useCallback(async () => {
    setMaintenanceLoading(true);
    try {
      const result = await fetchVehicleMaintenance(vehicleId, { page: 1, limit: 50 });
      setMaintenance(result.data);
    } catch (error) {
      showErrorToast({
        title: detail.toast.loadMaintenanceFailed.title,
        description:
          error instanceof Error ? error.message : detail.toast.loadMaintenanceFailed.description,
      });
    } finally {
      setMaintenanceLoading(false);
    }
  }, [
    detail.toast.loadMaintenanceFailed.description,
    detail.toast.loadMaintenanceFailed.title,
    vehicleId,
  ]);

  const loadWorkTypes = useCallback(async () => {
    setWorkTypesLoading(true);
    try {
      const types = await fetchActiveMaintenanceWorkTypes(locale);
      setWorkTypes(types);
      setMaintenanceForm((current) => ({
        ...current,
        work_type_id: current.work_type_id || types[0]?.id || "",
      }));
    } catch {
      setWorkTypes([]);
    } finally {
      setWorkTypesLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!canRead) return;
    void loadVehicle();
  }, [canRead, loadVehicle]);

  useEffect(() => {
    setTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (!canRead || !vehicle) return;
    if (tab === "history") void loadHistory();
    if (tab === "maintenance") {
      void loadMaintenance();
      void loadWorkTypes();
    }
  }, [canRead, loadHistory, loadMaintenance, loadWorkTypes, tab, vehicle]);

  function changeTab(next: DetailTab) {
    setTab(next);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    });
  }

  async function handleSaveExpiry() {
    if (!vehicle || !canWrite) return;
    setSavingExpiry(true);
    try {
      const updated = await updateVehicle(vehicle.id, {
        insurance_expires_at: insuranceExpiresAt || null,
        inspection_expires_at: inspectionExpiresAt || null,
      });
      setVehicle(updated);
      showSuccessToast(detail.toast.expirySaved);
      if (tab === "history") void loadHistory();
    } catch (error) {
      showErrorToast({
        title: detail.toast.expiryFailed.title,
        description: error instanceof Error ? error.message : detail.toast.expiryFailed.description,
      });
    } finally {
      setSavingExpiry(false);
    }
  }

  async function handleCreateMaintenance() {
    if (!vehicle || !canWrite) return;

    const selectedWorkType = workTypes.find((type) => type.id === maintenanceForm.work_type_id);
    if (!selectedWorkType) {
      showErrorToast({
        title: detail.toast.maintenanceFailed.title,
        description: detail.form.titleRequired,
      });
      return;
    }

    setCreatingMaintenance(true);
    try {
      await createVehicleMaintenance(vehicle.id, {
        work_type_id: selectedWorkType.id,
        status: maintenanceForm.status,
        title: selectedWorkType.name,
        description: maintenanceForm.description.trim() || null,
        vendor: maintenanceForm.vendor.trim() || null,
        cost_amount: maintenanceForm.cost_amount ? Number(maintenanceForm.cost_amount) : null,
        odometer_km: maintenanceForm.odometer_km ? Number(maintenanceForm.odometer_km) : null,
        started_at: maintenanceForm.started_at || null,
        next_due_at: maintenanceForm.next_due_at || null,
      });
      setMaintenanceForm({
        work_type_id: workTypes[0]?.id || "",
        status: "open",
        description: "",
        vendor: "",
        cost_amount: "",
        odometer_km: "",
        started_at: "",
        next_due_at: "",
      });
      setShowMaintenanceForm(false);
      showSuccessToast(detail.toast.maintenanceCreated);
      await Promise.all([loadVehicle(), loadMaintenance()]);
    } catch (error) {
      showErrorToast({
        title: detail.toast.maintenanceFailed.title,
        description:
          error instanceof Error ? error.message : detail.toast.maintenanceFailed.description,
      });
    } finally {
      setCreatingMaintenance(false);
    }
  }

  async function handleCompleteMaintenance(log: VehicleMaintenanceLog) {
    if (!vehicle || !canWrite) return;
    try {
      await updateVehicleMaintenance(vehicle.id, log.id, {
        status: "completed",
        completed_at: new Date().toISOString().slice(0, 10),
      });
      showSuccessToast(detail.toast.maintenanceUpdated);
      await Promise.all([
        loadVehicle(),
        loadMaintenance(),
        tab === "history" ? loadHistory() : Promise.resolve(),
      ]);
    } catch (error) {
      showErrorToast({
        title: detail.toast.maintenanceFailed.title,
        description:
          error instanceof Error ? error.message : detail.toast.maintenanceFailed.description,
      });
    }
  }

  const expiryItems = useMemo(
    () =>
      [
        {
          key: "insurance" as const,
          value: insuranceExpiresAt,
          setter: setInsuranceExpiresAt,
          saved: vehicle?.insurance_expires_at,
        },
        {
          key: "inspection" as const,
          value: inspectionExpiresAt,
          setter: setInspectionExpiresAt,
          saved: vehicle?.inspection_expires_at,
        },
      ] as const,
    [
      inspectionExpiresAt,
      insuranceExpiresAt,
      vehicle?.inspection_expires_at,
      vehicle?.insurance_expires_at,
    ],
  );

  const complianceFieldHints = useMemo(
    () => ({
      insurance: detail.overview.insuranceHint,
      inspection: detail.overview.inspectionHint,
    }),
    [detail.overview.insuranceHint, detail.overview.inspectionHint],
  );

  const worstExpiryTone = useMemo(() => {
    const tones = expiryItems.map((item) => getExpiryTone(item.saved));
    if (tones.includes("expired")) return "expired";
    if (tones.includes("dueSoon")) return "dueSoon";
    if (tones.includes("notSet")) return "notSet";
    return "ok";
  }, [expiryItems]);

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: detail.tabs.overview, icon: ShieldCheck },
      { id: "maintenance" as const, label: detail.tabs.maintenance, icon: Wrench },
      { id: "history" as const, label: detail.tabs.history, icon: History },
    ],
    [detail.tabs.history, detail.tabs.maintenance, detail.tabs.overview],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  if (loading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-2 py-8 text-center sm:px-0">
        <div className={adminIconBoxClass}>
          <Truck className="size-5" />
        </div>
        <div className="space-y-1">
          <p className={cn("text-lg", adminHeadingClass)}>{detail.notFound}</p>
          <p className="text-sm text-slate-500">{detail.backToList}</p>
        </div>
        <Button
          render={<Link href="/admin/fleet/vehicles" />}
          nativeButton={false}
          className={adminPrimaryButtonClass}
        >
          {detail.backToList}
        </Button>
      </div>
    );
  }

  const subtitle =
    [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" · ") ||
    detail.untitledVehicle;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 sm:space-y-6">
      <Button
        render={<Link href="/admin/fleet/vehicles" />}
        nativeButton={false}
        variant="ghost"
        className="-ml-1 h-9 max-w-full px-2 text-sm text-slate-600 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] sm:-ml-2 sm:text-base"
      >
        <ArrowLeft className="size-4 shrink-0" />
        <span className="truncate">{detail.backToList}</span>
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
              <Truck className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className={adminEyebrowClass}>{detail.eyebrow}</p>
              <h1 className={cn("text-2xl tracking-tight break-words sm:text-3xl", adminHeadingClass)}>
                {vehicle.plate_number}
              </h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:gap-2">
                <Badge variant="outline" className={vehicleStatusBadgeClass(vehicle.status)}>
                  {copy.status[vehicle.status]}
                </Badge>
                {vehicle.open_maintenance_count ? (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-800"
                  >
                    {formatMessage(detail.openMaintenance, {
                      count: String(vehicle.open_maintenance_count),
                    })}
                  </Badge>
                ) : null}
                <Badge variant="outline" className={expiryToneClass(worstExpiryTone)}>
                  <CalendarClock className="mr-1 size-3.5" />
                  {detail.overview.expiryStatus[worstExpiryTone]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-3 lg:w-auto lg:min-w-[22rem]">
            <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3">
              <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                {copy.columns.type}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {vehicle.vehicle_type?.name || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 sm:px-3.5 sm:py-3">
              <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                {copy.columns.class}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {vehicle.vehicle_class?.name || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 min-[420px]:col-span-2 sm:col-span-1 sm:px-3.5 sm:py-3">
              <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                {copy.columns.driver}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {vehicle.assigned_driver?.name || detail.overview.unassigned}
              </p>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label={detail.eyebrow}
        className="-mx-4 border-b border-slate-200 px-4 sm:mx-0 sm:px-0"
      >
        <div className="no-scrollbar -mb-px flex gap-0.5 overflow-x-auto sm:gap-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            const openCount =
              item.id === "maintenance" ? vehicle.open_maintenance_count : 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeTab(item.id)}
                disabled={isPending}
                className={cn(
                  "group relative inline-flex shrink-0 snap-start items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:gap-2.5 sm:px-4 sm:py-3",
                  active
                    ? "border-[#1C3A34] text-[#1C3A34]"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg transition-colors sm:size-8",
                    active
                      ? "bg-[#1C3A34] text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-700",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
                {openCount ? (
                  <span
                    className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
                      active
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {openCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-5">
          <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-5 lg:p-6")}>
            <div className="flex items-center gap-3">
              <div className={adminIconBoxClass}>
                <ClipboardList className="size-4" />
              </div>
              <div>
                <h2 className={cn("text-base", adminHeadingClass)}>
                  {detail.overview.vehicleInfo}
                </h2>
                <p className="text-sm text-slate-500">{detail.overview.quickFacts}</p>
              </div>
            </div>

            <dl className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
              {(
                [
                  [copy.columns.chassis, vehicle.chassis_number || "—"],
                  [copy.columns.type, vehicle.vehicle_type?.name || "—"],
                  [copy.columns.class, vehicle.vehicle_class?.name || "—"],
                  [
                    copy.columns.driver,
                    vehicle.assigned_driver?.name || detail.overview.unassigned,
                  ],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
                >
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-xl border border-dashed border-slate-200 px-3.5 py-3">
              <p className="text-xs font-medium text-slate-500">{copy.form.notes}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {vehicle.notes || detail.overview.noNotes}
              </p>
            </div>
          </section>

          <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-5 lg:p-6")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={adminIconBoxClass}>
                  <CalendarClock className="size-4" />
                </div>
                <div>
                  <h2 className={cn("text-base", adminHeadingClass)}>
                    {detail.overview.compliance}
                  </h2>
                  <p className="text-sm text-slate-500">{detail.overview.complianceHint}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {expiryItems.map((item) => {
                const tone = getExpiryTone(item.saved);
                return (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-100 bg-slate-50/40 p-3.5 transition hover:border-slate-200"
                  >
                    <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor={`${item.key}-expires`} className="text-sm font-semibold">
                          {detail.overview[item.key]}
                        </Label>
                        <p className="text-xs leading-relaxed text-slate-500">
                          {complianceFieldHints[item.key]}
                        </p>
                      </div>
                      <Badge variant="outline" className={expiryToneClass(tone)}>
                        {detail.overview.expiryStatus[tone]}
                      </Badge>
                    </div>
                    <AdminDatePicker
                      id={`${item.key}-expires`}
                      className="min-w-0"
                      label={detail.overview.expiresOn}
                      placeholder={detail.overview.pickDate}
                      clearLabel={detail.overview.clearDate}
                      todayLabel={detail.overview.today}
                      value={parseDateInputValue(item.value)}
                      disabled={!canWrite || savingExpiry}
                      onChange={(date) => item.setter(formatDateInputValue(date))}
                    />
                  </div>
                );
              })}
            </div>

            {canWrite ? (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSaveExpiry()}
                  disabled={savingExpiry}
                  className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                >
                  {savingExpiry ? detail.overview.saving : detail.overview.saveExpiry}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "maintenance" ? (
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{detail.maintenance.listTitle}</h2>
              {vehicle.open_maintenance_count ? (
                <p className="mt-0.5 text-sm text-amber-700">
                  {formatMessage(detail.maintenance.openCount, {
                    count: String(vehicle.open_maintenance_count),
                  })}
                </p>
              ) : null}
            </div>
            {canWrite ? (
              <Button
                type="button"
                variant={showMaintenanceForm ? "outline" : "default"}
                className={cn(
                  "w-full shrink-0 sm:w-auto",
                  showMaintenanceForm ? undefined : adminPrimaryButtonClass,
                )}
                onClick={() => setShowMaintenanceForm((open) => !open)}
              >
                {showMaintenanceForm ? (
                  detail.maintenance.closeForm
                ) : (
                  <>
                    <Plus className="size-4" />
                    {detail.maintenance.openForm}
                  </>
                )}
              </Button>
            ) : null}
          </div>

          {canWrite && showMaintenanceForm ? (
            <section
              className={cn(
                adminCardClass,
                "overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm",
              )}
            >
              <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-[#1C3A34]/[0.04] to-transparent px-4 py-3.5 sm:px-5 sm:py-4 lg:px-6">
                <div className="rounded-xl bg-[#1C3A34] p-2.5 text-white shadow-sm">
                  <Wrench className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className={cn("text-base", adminHeadingClass)}>
                    {detail.maintenance.createTitle}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatMessage(detail.maintenance.createSubtitle, {
                      plate: vehicle.plate_number,
                    })}
                  </p>
                </div>
              </div>

              <form
                className="space-y-5 p-4 sm:space-y-6 sm:p-5 lg:p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateMaintenance();
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label className="text-sm font-semibold text-slate-800">
                      {detail.maintenance.type}
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
                    {workTypesLoading ? (
                      <p className="col-span-full text-sm text-slate-500">{detail.loading}</p>
                    ) : workTypes.length === 0 ? (
                      <p className="col-span-full text-sm text-slate-500">
                        {detail.maintenance.emptyHint}
                      </p>
                    ) : (
                      workTypes.map((workType) => {
                        const Icon = maintenanceTypeIcon(workType.slug);
                        const selected = maintenanceForm.work_type_id === workType.id;
                        return (
                          <button
                            key={workType.id}
                            type="button"
                            onClick={() =>
                              setMaintenanceForm((current) => ({
                                ...current,
                                work_type_id: workType.id,
                              }))
                            }
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition",
                              selected
                                ? "border-[#1C3A34] bg-[#1C3A34] text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:border-[#1C3A34]/30 hover:bg-[#1C3A34]/[0.03]",
                            )}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight">
                              {workType.name}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-800">
                    {detail.maintenance.status}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MAINTENANCE_STATUSES.map((status) => {
                      const selected = maintenanceForm.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setMaintenanceForm((current) => ({ ...current, status }))
                          }
                          className={cn(
                            "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                            selected
                              ? cn(maintenanceStatusClass(status), "ring-1 ring-current/20")
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
                          )}
                        >
                          {detail.maintenanceStatuses[status]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
                  <Label htmlFor="maintenance-description" className="text-sm font-semibold">
                    {detail.maintenance.description}
                  </Label>
                  <textarea
                    id="maintenance-description"
                    value={maintenanceForm.description}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMaintenanceForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={5}
                    placeholder={detail.maintenance.descriptionPlaceholder}
                    className={textareaClassName}
                  />
                </div>

                <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white open:shadow-sm">
                  <summary className="flex cursor-pointer list-none flex-col items-start gap-2 px-3.5 py-3 marker:content-none sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
                      <span className={adminIconBoxClass}>
                        <Store className="size-3.5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          {detail.maintenance.optionalDetails}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {detail.maintenance.optionalDetailsHint}
                        </span>
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                  </summary>

                  <div className="space-y-4 border-t border-slate-100 px-3.5 py-3.5 sm:px-4 sm:py-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="maintenance-vendor"
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <Store className="size-3.5 text-slate-400" />
                        {detail.maintenance.vendor}
                      </Label>
                      <Input
                        id="maintenance-vendor"
                        value={maintenanceForm.vendor}
                        onChange={(event) =>
                          setMaintenanceForm((current) => ({
                            ...current,
                            vendor: event.target.value,
                          }))
                        }
                        placeholder={detail.maintenance.vendorPlaceholder}
                        className={cn(adminInputClass, "bg-white")}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="maintenance-cost"
                          className="inline-flex items-center gap-1.5 text-sm font-medium"
                        >
                          <CircleDollarSign className="size-3.5 text-slate-400" />
                          {detail.maintenance.cost}
                        </Label>
                        <Input
                          id="maintenance-cost"
                          type="number"
                          min={0}
                          step="0.01"
                          value={maintenanceForm.cost_amount}
                          onChange={(event) =>
                            setMaintenanceForm((current) => ({
                              ...current,
                              cost_amount: event.target.value,
                            }))
                          }
                          placeholder={detail.maintenance.costPlaceholder}
                          className={cn(adminInputClass, "bg-white")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="maintenance-odometer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium"
                        >
                          <Gauge className="size-3.5 text-slate-400" />
                          {detail.maintenance.odometer}
                        </Label>
                        <Input
                          id="maintenance-odometer"
                          type="number"
                          min={0}
                          value={maintenanceForm.odometer_km}
                          onChange={(event) =>
                            setMaintenanceForm((current) => ({
                              ...current,
                              odometer_km: event.target.value,
                            }))
                          }
                          placeholder={detail.maintenance.odometerPlaceholder}
                          className={cn(adminInputClass, "bg-white")}
                        />
                      </div>
                      <AdminDatePicker
                        id="maintenance-started"
                        className="min-w-0"
                        label={detail.maintenance.startedAt}
                        placeholder={detail.overview.pickDate}
                        clearLabel={detail.overview.clearDate}
                        todayLabel={detail.overview.today}
                        value={parseDateInputValue(maintenanceForm.started_at)}
                        onChange={(date) =>
                          setMaintenanceForm((current) => ({
                            ...current,
                            started_at: formatDateInputValue(date),
                          }))
                        }
                      />
                      <AdminDatePicker
                        id="maintenance-next-due"
                        className="min-w-0"
                        label={detail.maintenance.nextDueAt}
                        placeholder={detail.overview.pickDate}
                        clearLabel={detail.overview.clearDate}
                        todayLabel={detail.overview.today}
                        value={parseDateInputValue(maintenanceForm.next_due_at)}
                        onChange={(date) =>
                          setMaintenanceForm((current) => ({
                            ...current,
                            next_due_at: formatDateInputValue(date),
                          }))
                        }
                      />
                    </div>
                  </div>
                </details>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setShowMaintenanceForm(false)}
                  >
                    {detail.maintenance.closeForm}
                  </Button>
                  <Button
                    type="submit"
                    disabled={creatingMaintenance}
                    className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                  >
                    <Plus className="size-4" />
                    {creatingMaintenance ? detail.maintenance.saving : detail.maintenance.create}
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          <section className={cn(adminCardClass, "rounded-2xl p-4 sm:p-5 lg:p-6")}>
            {maintenanceLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((key) => (
                  <div key={key} className="h-24 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : maintenance.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className={adminIconBoxClass}>
                  <Wrench className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className={cn("text-base", adminHeadingClass)}>
                    {detail.maintenance.emptyTitle}
                  </p>
                  <p className="max-w-sm text-sm text-slate-500">{detail.maintenance.emptyHint}</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {maintenance.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/30 p-3.5 transition hover:border-slate-200 hover:bg-white sm:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={maintenanceStatusClass(log.status)}>
                            {detail.maintenanceStatuses[log.status]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-white text-slate-600"
                          >
                            {log.work_type.name}
                          </Badge>
                        </div>
                        <p className="text-base font-semibold text-slate-800">{log.title}</p>
                        {log.description ? (
                          <p className="text-sm leading-relaxed text-slate-600">
                            {log.description}
                          </p>
                        ) : null}
                      </div>
                      {canWrite && (log.status === "open" || log.status === "in_progress") ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50 sm:w-auto"
                          onClick={() => void handleCompleteMaintenance(log)}
                        >
                          <CheckCircle2 className="size-3.5" />
                          {detail.maintenance.markCompleted}
                        </Button>
                      ) : null}
                    </div>
                    {(log.vendor ||
                      log.cost_amount != null ||
                      log.odometer_km != null ||
                      log.next_due_at) && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        {log.vendor ? (
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                            {log.vendor}
                          </span>
                        ) : null}
                        {log.cost_amount != null ? (
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                            {log.cost_amount}
                          </span>
                        ) : null}
                        {log.odometer_km != null ? (
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                            {log.odometer_km} km
                          </span>
                        ) : null}
                        {log.next_due_at ? (
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-100">
                            {detail.maintenance.nextDueAt}: {log.next_due_at}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "history" ? (
        <section className={cn(adminCardClass, "rounded-2xl p-4 sm:p-5 lg:p-6")}>
          <div className="mb-4 sm:mb-5">
            <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{detail.history.title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{detail.history.emptyHint}</p>
          </div>

          {historyLoading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="flex gap-3">
                  <div className="size-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-16 flex-1 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className={adminIconBoxClass}>
                <History className="size-5" />
              </div>
              <div className="space-y-1">
                <p className={cn("text-base", adminHeadingClass)}>{detail.history.emptyTitle}</p>
                <p className="max-w-sm text-sm text-slate-500">{detail.history.emptyHint}</p>
              </div>
            </div>
          ) : (
            <ol className="relative ml-3 space-y-0 border-l border-slate-200 sm:ml-4">
              {history.map((event) => {
                const Icon = historyIcon(event.event_type);
                return (
                  <li key={event.id} className="relative pb-5 pl-5 last:pb-0 sm:pb-6 sm:pl-6">
                    <span className="absolute -left-[1.05rem] top-0 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1C3A34] shadow-sm sm:-left-[1.15rem] sm:size-9">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/40 px-3.5 py-3 transition hover:bg-white sm:px-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
                        <p className="text-sm font-semibold text-slate-800">{event.summary}</p>
                        <time className="text-xs text-slate-400 sm:shrink-0">
                          {new Date(event.created_at).toLocaleString()}
                        </time>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {detail.historyEventTypes[event.event_type] ?? event.event_type}
                        {event.actor?.name
                          ? ` · ${formatMessage(detail.history.by, { name: event.actor.name })}`
                          : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}
