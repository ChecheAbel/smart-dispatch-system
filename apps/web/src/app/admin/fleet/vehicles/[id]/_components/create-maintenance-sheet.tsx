"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Plus,
  Store,
  Wrench,
} from "lucide-react";
import type {
  MaintenanceWorkType,
  Vehicle,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { fetchActiveMaintenanceWorkTypes } from "@/lib/maintenance-work-type-api";
import { createVehicleMaintenance } from "@/lib/vehicle-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  formatDateInputValue,
  MAINTENANCE_STATUSES,
  maintenanceStatusClass,
  maintenanceTypeIcon,
  parseDateInputValue,
  textareaClassName,
} from "./vehicle-detail-shared";

type MaintenanceFormState = {
  work_type_id: string;
  status: VehicleMaintenanceStatus;
  description: string;
  vendor: string;
  cost_amount: string;
  odometer_km: string;
  started_at: string;
  next_due_at: string;
};

function emptyMaintenanceForm(defaultWorkTypeId = ""): MaintenanceFormState {
  return {
    work_type_id: defaultWorkTypeId,
    status: "open",
    description: "",
    vendor: "",
    cost_amount: "",
    odometer_km: "",
    started_at: "",
    next_due_at: "",
  };
}

type CreateMaintenanceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSuccess?: () => void;
};

export function CreateMaintenanceSheet({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: CreateMaintenanceSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehiclesMessages(locale);
  const detail = copy.detail;
  const maintenanceCopy = detail.maintenance;

  const [form, setForm] = useState<MaintenanceFormState>(emptyMaintenanceForm());
  const [workTypes, setWorkTypes] = useState<MaintenanceWorkType[]>([]);
  const [workTypesLoading, setWorkTypesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setForm(emptyMaintenanceForm());
      setWorkTypes([]);
      return;
    }

    let cancelled = false;

    async function loadWorkTypes() {
      setWorkTypesLoading(true);
      try {
        const types = await fetchActiveMaintenanceWorkTypes(locale);
        if (cancelled) return;
        setWorkTypes(types);
        setForm(emptyMaintenanceForm(types[0]?.id || ""));
      } catch {
        if (!cancelled) {
          setWorkTypes([]);
          setForm(emptyMaintenanceForm());
        }
      } finally {
        if (!cancelled) setWorkTypesLoading(false);
      }
    }

    void loadWorkTypes();
    return () => {
      cancelled = true;
    };
  }, [locale, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) return;

    const selectedWorkType = workTypes.find((type) => type.id === form.work_type_id);
    if (!selectedWorkType) {
      showErrorToast({
        title: detail.toast.maintenanceFailed.title,
        description: detail.form.titleRequired,
      });
      return;
    }

    setSubmitting(true);
    try {
      await createVehicleMaintenance(vehicle.id, {
        work_type_id: selectedWorkType.id,
        status: form.status,
        title: selectedWorkType.name,
        description: form.description.trim() || null,
        vendor: form.vendor.trim() || null,
        cost_amount: form.cost_amount ? Number(form.cost_amount) : null,
        odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
        started_at: form.started_at || null,
        next_due_at: form.next_due_at || null,
      });

      showSuccessToast(detail.toast.maintenanceCreated);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      showErrorToast({
        title: detail.toast.maintenanceFailed.title,
        description:
          error instanceof Error ? error.message : detail.toast.maintenanceFailed.description,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "create-maintenance-form";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{maintenanceCopy.createTitle}</SheetTitle>
          <SheetDescription className="leading-relaxed">
            {vehicle
              ? formatMessage(maintenanceCopy.createSubtitle, { plate: vehicle.plate_number })
              : maintenanceCopy.emptyHint}
          </SheetDescription>
        </SheetHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {vehicle ? (
            <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4">
                <div className={cn(adminIconBoxClass, "shrink-0 bg-[#1C3A34] text-white")}>
                  <Wrench className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    {copy.columns.plate}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-wide text-[#1C3A34]">
                    {vehicle.plate_number}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {[vehicle.vehicle_type?.name, vehicle.vehicle_class?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>

              <div className="space-y-5 px-4 py-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-800">
                    {maintenanceCopy.type}
                  </Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {workTypesLoading ? (
                      <p className="col-span-full text-sm text-slate-500">{detail.loading}</p>
                    ) : workTypes.length === 0 ? (
                      <p className="col-span-full text-sm text-slate-500">
                        {maintenanceCopy.emptyHint}
                      </p>
                    ) : (
                      workTypes.map((workType) => {
                        const Icon = maintenanceTypeIcon(workType.slug);
                        const selected = form.work_type_id === workType.id;
                        return (
                          <button
                            key={workType.id}
                            type="button"
                            disabled={submitting}
                            onClick={() =>
                              setForm((current) => ({
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
                    {maintenanceCopy.status}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MAINTENANCE_STATUSES.map((status) => {
                      const selected = form.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={submitting}
                          onClick={() => setForm((current) => ({ ...current, status }))}
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
                  <Label htmlFor="maintenance-sheet-description" className="text-sm font-semibold">
                    {maintenanceCopy.description}
                  </Label>
                  <textarea
                    id="maintenance-sheet-description"
                    value={form.description}
                    disabled={submitting}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder={maintenanceCopy.descriptionPlaceholder}
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
                          {maintenanceCopy.optionalDetails}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {maintenanceCopy.optionalDetailsHint}
                        </span>
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                  </summary>

                  <div className="space-y-4 border-t border-slate-100 px-3.5 py-3.5 sm:px-4 sm:py-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="maintenance-sheet-vendor"
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <Store className="size-3.5 text-slate-400" />
                        {maintenanceCopy.vendor}
                      </Label>
                      <Input
                        id="maintenance-sheet-vendor"
                        value={form.vendor}
                        disabled={submitting}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            vendor: event.target.value,
                          }))
                        }
                        placeholder={maintenanceCopy.vendorPlaceholder}
                        className={cn(adminInputClass, "bg-white")}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="maintenance-sheet-cost"
                          className="inline-flex items-center gap-1.5 text-sm font-medium"
                        >
                          <CircleDollarSign className="size-3.5 text-slate-400" />
                          {maintenanceCopy.cost}
                        </Label>
                        <Input
                          id="maintenance-sheet-cost"
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.cost_amount}
                          disabled={submitting}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              cost_amount: event.target.value,
                            }))
                          }
                          placeholder={maintenanceCopy.costPlaceholder}
                          className={cn(adminInputClass, "bg-white")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="maintenance-sheet-odometer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium"
                        >
                          <Gauge className="size-3.5 text-slate-400" />
                          {maintenanceCopy.odometer}
                        </Label>
                        <Input
                          id="maintenance-sheet-odometer"
                          type="number"
                          min={0}
                          value={form.odometer_km}
                          disabled={submitting}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              odometer_km: event.target.value,
                            }))
                          }
                          placeholder={maintenanceCopy.odometerPlaceholder}
                          className={cn(adminInputClass, "bg-white")}
                        />
                      </div>
                      <AdminDatePicker
                        id="maintenance-sheet-started"
                        className="min-w-0"
                        label={maintenanceCopy.startedAt}
                        placeholder={detail.overview.pickDate}
                        clearLabel={detail.overview.clearDate}
                        todayLabel={detail.overview.today}
                        disabled={submitting}
                        value={parseDateInputValue(form.started_at)}
                        onChange={(date) =>
                          setForm((current) => ({
                            ...current,
                            started_at: formatDateInputValue(date),
                          }))
                        }
                      />
                      <AdminDatePicker
                        id="maintenance-sheet-next-due"
                        className="min-w-0"
                        label={maintenanceCopy.nextDueAt}
                        placeholder={detail.overview.pickDate}
                        clearLabel={detail.overview.clearDate}
                        todayLabel={detail.overview.today}
                        disabled={submitting}
                        value={parseDateInputValue(form.next_due_at)}
                        onChange={(date) =>
                          setForm((current) => ({
                            ...current,
                            next_due_at: formatDateInputValue(date),
                          }))
                        }
                      />
                    </div>
                  </div>
                </details>
              </div>
            </Card>
          ) : null}
        </form>

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200"
          >
            {maintenanceCopy.closeForm}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting || !vehicle || workTypesLoading}
            className={adminPrimaryButtonClass}
          >
            <Plus className="size-4" />
            {submitting ? maintenanceCopy.saving : maintenanceCopy.create}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
