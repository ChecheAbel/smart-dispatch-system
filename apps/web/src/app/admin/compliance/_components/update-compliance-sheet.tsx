"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Car, ClipboardList, Loader2, ShieldCheck } from "lucide-react";
import type { Vehicle, VehicleComplianceStatus } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { updateVehicle } from "@/lib/vehicle-api";
import {
  type ComplianceForm,
  emptyComplianceForm,
  inspectionFormToPayload,
  insuranceFormToPayload,
  vehicleToComplianceForm,
} from "@/lib/vehicle-compliance-form";
import { getExpiryTone } from "@/lib/vehicle-compliance";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  formatMessage,
  getAdminComplianceMessages,
  getAdminVehiclesMessages,
} from "@/translations";
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
  InspectionComplianceFields,
  InsuranceComplianceFields,
} from "./compliance-form-fields";
import { ComplianceStatusBadge } from "./compliance-status-badge";

type ComplianceSheetType = "insurance" | "inspection";

type UpdateComplianceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ComplianceSheetType;
  vehicle: Vehicle | null;
  onSuccess?: () => void;
};

export function UpdateComplianceSheet({
  open,
  onOpenChange,
  type,
  vehicle,
  onSuccess,
}: UpdateComplianceSheetProps) {
  const { locale } = useLocale();
  const complianceCopy = getAdminComplianceMessages(locale);
  const vehicleDetail = getAdminVehiclesMessages(locale).detail;
  const sheetCopy = type === "insurance" ? complianceCopy.sheet.insurance : complianceCopy.sheet.inspection;

  const [form, setForm] = useState<ComplianceForm>(emptyComplianceForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      return;
    }
    if (vehicle) {
      setForm(vehicleToComplianceForm(vehicle));
    }
  }, [open, vehicle]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) return;

    setSubmitting(true);
    try {
      const payload =
        type === "insurance" ? insuranceFormToPayload(form) : inspectionFormToPayload(form);
      const updated = await updateVehicle(vehicle.id, payload);

      showSuccessToast({
        title: sheetCopy.success.title,
        description: formatMessage(sheetCopy.success.description, {
          plate: updated.plate_number,
        }),
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      showErrorToast({
        title: sheetCopy.errors.saveFailed,
        description: error instanceof Error ? error.message : sheetCopy.errors.saveFailed,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = `update-compliance-${type}-form`;
  const Icon = type === "insurance" ? ShieldCheck : ClipboardList;
  const expiryField =
    type === "insurance" ? vehicle?.insurance_expires_at : vehicle?.inspection_expires_at;
  const tone = getExpiryTone(expiryField);
  const statusKey = (tone === "dueSoon" ? "due_soon" : tone === "notSet" ? "not_set" : tone) as VehicleComplianceStatus;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-border dark:bg-card">
          <div className="flex items-center gap-3">
            <div className={adminIconBoxClass}>
              <Icon className="size-4.5" />
            </div>
            <div>
              <SheetTitle className={adminHeadingClass}>{sheetCopy.title}</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">
                {sheetCopy.description}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form id={formId} onSubmit={handleSubmit} className="flex-1 space-y-5 px-6 py-5">
          {vehicle ? (
            <Card className={cn(adminCardClass, "overflow-hidden rounded-xl border border-slate-200/90 shadow-xs dark:border-border")}>
              {/* Vehicle Identity Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-border dark:bg-muted/40">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-2xs dark:border-border dark:bg-card">
                    <Car className="size-3.5 text-slate-400" />
                    <span className="font-mono text-xs font-bold tracking-wider text-[#1C3A34] dark:text-foreground">
                      {vehicle.plate_number}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500 dark:text-muted-foreground">
                    {[vehicle.vehicle_type?.name, vehicle.vehicle_class?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <ComplianceStatusBadge
                  status={statusKey}
                  label={vehicleDetail.overview.expiryStatus[tone]}
                />
              </div>

              {/* Form fields body */}
              <div className="p-4 sm:p-5">
                {type === "insurance" ? (
                  <InsuranceComplianceFields
                    idPrefix="compliance-sheet"
                    form={form}
                    setForm={setForm}
                    detail={vehicleDetail}
                    disabled={submitting}
                  />
                ) : (
                  <InspectionComplianceFields
                    idPrefix="compliance-sheet"
                    form={form}
                    setForm={setForm}
                    detail={vehicleDetail}
                    disabled={submitting}
                  />
                )}
              </div>
            </Card>
          ) : null}
        </form>

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-border dark:bg-card">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-border dark:text-muted-foreground"
          >
            {sheetCopy.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting || !vehicle}
            className={adminPrimaryButtonClass}
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {sheetCopy.saving}
              </>
            ) : (
              sheetCopy.save
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
