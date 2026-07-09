"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ClipboardList, ShieldCheck } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
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
import { expiryToneClass, getExpiryTone } from "@/lib/vehicle-compliance";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{sheetCopy.title}</SheetTitle>
          <SheetDescription className="leading-relaxed">{sheetCopy.description}</SheetDescription>
        </SheetHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {vehicle ? (
            <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={cn(adminIconBoxClass, "shrink-0")}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                      {sheetCopy.vehicleLabel}
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
                <Badge variant="outline" className={expiryToneClass(tone)}>
                  {vehicleDetail.overview.expiryStatus[tone]}
                </Badge>
              </div>

              <div className="px-4 py-4">
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

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200"
          >
            {sheetCopy.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting || !vehicle}
            className={adminPrimaryButtonClass}
          >
            {submitting ? sheetCopy.saving : sheetCopy.save}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
