"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarClock, ClipboardList, History, ShieldCheck, Truck, Wrench } from "lucide-react";
import type {
  MaintenanceWorkType,
  Vehicle,
  VehicleHistoryEvent,
  VehicleMaintenanceLog,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchActiveMaintenanceWorkTypes } from "@/lib/maintenance-work-type-api";
import {
  createVehicleMaintenance,
  fetchVehicleById,
  fetchVehicleHistory,
  fetchVehicleMaintenance,
  updateVehicleMaintenance,
} from "@/lib/vehicle-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminComplianceMessages, getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { UpdateComplianceSheet } from "@/app/admin/compliance/_components/update-compliance-sheet";
import { VehicleDetailComplianceTab } from "./vehicle-detail-compliance-tab";
import { VehicleDetailHistoryTab } from "./vehicle-detail-history-tab";
import { VehicleDetailMaintenanceTab } from "./vehicle-detail-maintenance-tab";
import { VehicleDetailOverviewTab } from "./vehicle-detail-overview-tab";
import {
  type DetailTab,
  expiryToneClass,
  getExpiryTone,
  parseTab,
  vehicleStatusBadgeClass,
} from "./vehicle-detail-shared";

type ComplianceSheetType = "insurance" | "inspection";

type VehicleDetailPageProps = {
  vehicleId: string;
};

export function VehicleDetailPage({ vehicleId }: VehicleDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminVehiclesMessages(locale);
  const complianceCopy = getAdminComplianceMessages(locale);
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
  const [creatingMaintenance, setCreatingMaintenance] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [complianceSheetOpen, setComplianceSheetOpen] = useState(false);
  const [complianceSheetType, setComplianceSheetType] = useState<ComplianceSheetType>("insurance");
  const [isPending, startTransition] = useTransition();

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

  function openComplianceSheet(type: ComplianceSheetType) {
    setComplianceSheetType(type);
    setComplianceSheetOpen(true);
  }

  async function handleComplianceSaved() {
    await loadVehicle();
    if (tab === "history") void loadHistory();
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

  const worstExpiryTone = useMemo(() => {
    const tones = [
      getExpiryTone(vehicle?.insurance_expires_at),
      getExpiryTone(vehicle?.inspection_expires_at),
    ];
    if (tones.includes("expired")) return "expired";
    if (tones.includes("dueSoon")) return "dueSoon";
    if (tones.includes("notSet")) return "notSet";
    return "ok";
  }, [vehicle?.insurance_expires_at, vehicle?.inspection_expires_at]);

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: detail.tabs.overview, icon: ClipboardList },
      { id: "compliance" as const, label: detail.tabs.compliance, icon: ShieldCheck },
      { id: "maintenance" as const, label: detail.tabs.maintenance, icon: Wrench },
      { id: "history" as const, label: detail.tabs.history, icon: History },
    ],
    [detail.tabs.compliance, detail.tabs.history, detail.tabs.maintenance, detail.tabs.overview],
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
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
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
            const openCount = item.id === "maintenance" ? vehicle.open_maintenance_count : 0;
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
                      active ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800",
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
        <VehicleDetailOverviewTab
          vehicle={vehicle}
          copy={copy}
          locale={locale}
          canWrite={canWrite}
          onNavigateToCompliance={() => changeTab("compliance")}
          onEditInsurance={() => openComplianceSheet("insurance")}
          onEditInspection={() => openComplianceSheet("inspection")}
        />
      ) : null}

      {tab === "compliance" ? (
        <VehicleDetailComplianceTab
          vehicle={vehicle}
          detail={detail}
          complianceCopy={complianceCopy}
          locale={locale}
          canWrite={canWrite}
          onEditInsurance={() => openComplianceSheet("insurance")}
          onEditInspection={() => openComplianceSheet("inspection")}
        />
      ) : null}

      {tab === "maintenance" ? (
        <VehicleDetailMaintenanceTab
          vehicle={vehicle}
          detail={detail}
          canWrite={canWrite}
          maintenance={maintenance}
          maintenanceLoading={maintenanceLoading}
          workTypes={workTypes}
          workTypesLoading={workTypesLoading}
          maintenanceForm={maintenanceForm}
          setMaintenanceForm={setMaintenanceForm}
          showMaintenanceForm={showMaintenanceForm}
          setShowMaintenanceForm={setShowMaintenanceForm}
          creatingMaintenance={creatingMaintenance}
          onCreateMaintenance={() => void handleCreateMaintenance()}
          onCompleteMaintenance={(log) => void handleCompleteMaintenance(log)}
        />
      ) : null}

      {tab === "history" ? (
        <VehicleDetailHistoryTab
          detail={detail}
          history={history}
          historyLoading={historyLoading}
        />
      ) : null}

      <UpdateComplianceSheet
        open={complianceSheetOpen}
        onOpenChange={setComplianceSheetOpen}
        type={complianceSheetType}
        vehicle={vehicle}
        onSuccess={() => void handleComplianceSaved()}
      />
    </div>
  );
}
