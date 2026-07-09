import type { Dispatch, SetStateAction } from "react";
import {
  CheckCircle2,
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
  VehicleMaintenanceLog,
  VehicleMaintenanceStatus,
} from "@smart-dispatch/types";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import {
  formatDateInputValue,
  MAINTENANCE_STATUSES,
  maintenanceStatusClass,
  maintenanceTypeIcon,
  parseDateInputValue,
  textareaClassName,
} from "./vehicle-detail-shared";

export type MaintenanceFormState = {
  work_type_id: string;
  status: VehicleMaintenanceStatus;
  description: string;
  vendor: string;
  cost_amount: string;
  odometer_km: string;
  started_at: string;
  next_due_at: string;
};

type VehicleDetailMaintenanceTabProps = {
  vehicle: Vehicle;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  canWrite: boolean;
  maintenance: VehicleMaintenanceLog[];
  maintenanceLoading: boolean;
  workTypes: MaintenanceWorkType[];
  workTypesLoading: boolean;
  maintenanceForm: MaintenanceFormState;
  setMaintenanceForm: Dispatch<SetStateAction<MaintenanceFormState>>;
  showMaintenanceForm: boolean;
  setShowMaintenanceForm: Dispatch<SetStateAction<boolean>>;
  creatingMaintenance: boolean;
  onCreateMaintenance: () => void;
  onCompleteMaintenance: (log: VehicleMaintenanceLog) => void;
};

export function VehicleDetailMaintenanceTab({
  vehicle,
  detail,
  canWrite,
  maintenance,
  maintenanceLoading,
  workTypes,
  workTypesLoading,
  maintenanceForm,
  setMaintenanceForm,
  showMaintenanceForm,
  setShowMaintenanceForm,
  creatingMaintenance,
  onCreateMaintenance,
  onCompleteMaintenance,
}: VehicleDetailMaintenanceTabProps) {
  return (
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
              <h3 className={cn("text-base", adminHeadingClass)}>{detail.maintenance.createTitle}</h3>
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
              onCreateMaintenance();
            }}
          >
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <Label className="text-sm font-semibold text-slate-800">{detail.maintenance.type}</Label>
              </div>
              <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
                {workTypesLoading ? (
                  <p className="col-span-full text-sm text-slate-500">{detail.loading}</p>
                ) : workTypes.length === 0 ? (
                  <p className="col-span-full text-sm text-slate-500">{detail.maintenance.emptyHint}</p>
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
                        <span className="text-[11px] font-medium leading-tight">{workType.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-800">{detail.maintenance.status}</Label>
              <div className="flex flex-wrap gap-2">
                {MAINTENANCE_STATUSES.map((status) => {
                  const selected = maintenanceForm.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setMaintenanceForm((current) => ({ ...current, status }))}
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
                onChange={(event) =>
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
              <p className={cn("text-base", adminHeadingClass)}>{detail.maintenance.emptyTitle}</p>
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
                      <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                        {log.work_type.name}
                      </Badge>
                    </div>
                    <p className="text-base font-semibold text-slate-800">{log.title}</p>
                    {log.description ? (
                      <p className="text-sm leading-relaxed text-slate-600">{log.description}</p>
                    ) : null}
                  </div>
                  {canWrite && (log.status === "open" || log.status === "in_progress") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50 sm:w-auto"
                      onClick={() => onCompleteMaintenance(log)}
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
  );
}
