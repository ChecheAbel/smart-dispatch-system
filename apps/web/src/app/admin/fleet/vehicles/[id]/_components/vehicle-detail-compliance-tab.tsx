import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ClipboardList, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
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
import { getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import {
  type ComplianceForm,
  expiryToneClass,
  formatDateInputValue,
  getExpiryTone,
  parseDateInputValue,
  textareaClassName,
} from "./vehicle-detail-shared";

type VehicleDetailComplianceTabProps = {
  vehicle: Vehicle;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  complianceForm: ComplianceForm;
  setComplianceForm: Dispatch<SetStateAction<ComplianceForm>>;
  canWrite: boolean;
  savingCompliance: boolean;
  onSave: () => void;
};

function ComplianceFormSection({
  icon: Icon,
  title,
  description,
  statusBadge,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  statusBadge: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn(adminCardClass, "overflow-hidden rounded-2xl")}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(adminIconBoxClass, "shrink-0")}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className={cn("text-sm font-semibold leading-snug", adminHeadingClass)}>{title}</p>
            <p className="text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        <div className="shrink-0">{statusBadge}</div>
      </div>
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {children}
    </div>
  );
}

export function VehicleDetailComplianceTab({
  vehicle,
  detail,
  complianceForm,
  setComplianceForm,
  canWrite,
  savingCompliance,
  onSave,
}: VehicleDetailComplianceTabProps) {
  const insuranceTone = getExpiryTone(vehicle.insurance_expires_at);
  const inspectionTone = getExpiryTone(vehicle.inspection_expires_at);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="min-w-0">
        <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{detail.compliance.title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{detail.compliance.description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <ComplianceFormSection
          icon={ShieldCheck}
          title={detail.overview.insurance}
          description={detail.overview.insuranceHint}
          statusBadge={
            <Badge variant="outline" className={expiryToneClass(insuranceTone)}>
              {detail.overview.expiryStatus[insuranceTone]}
            </Badge>
          }
        >
          <FieldGroup title={detail.compliance.policyDetails}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="insurance-provider" className="text-sm font-medium text-slate-600">
                  {detail.overview.insuranceProvider}
                </Label>
                <Input
                  id="insurance-provider"
                  value={complianceForm.insurance_provider}
                  onChange={(event) =>
                    setComplianceForm((current) => ({
                      ...current,
                      insurance_provider: event.target.value,
                    }))
                  }
                  placeholder={detail.overview.insuranceProviderPlaceholder}
                  disabled={!canWrite || savingCompliance}
                  className={cn(adminInputClass, "w-full")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="insurance-policy-number" className="text-sm font-medium text-slate-600">
                  {detail.overview.insurancePolicyNumber}
                </Label>
                <Input
                  id="insurance-policy-number"
                  value={complianceForm.insurance_policy_number}
                  onChange={(event) =>
                    setComplianceForm((current) => ({
                      ...current,
                      insurance_policy_number: event.target.value,
                    }))
                  }
                  placeholder={detail.overview.insurancePolicyNumberPlaceholder}
                  disabled={!canWrite || savingCompliance}
                  className={cn(adminInputClass, "w-full")}
                />
              </div>
            </div>
          </FieldGroup>

          <FieldGroup title={detail.compliance.dates}>
            <div className="space-y-4">
              <AdminDatePicker
                id="insurance-issued-at"
                className="w-full"
                label={detail.overview.insuranceIssuedAt}
                placeholder={detail.overview.pickDate}
                clearLabel={detail.overview.clearDate}
                todayLabel={detail.overview.today}
                value={parseDateInputValue(complianceForm.insurance_issued_at)}
                disabled={!canWrite || savingCompliance}
                onChange={(date) =>
                  setComplianceForm((current) => ({
                    ...current,
                    insurance_issued_at: formatDateInputValue(date),
                  }))
                }
              />
              <AdminDatePicker
                id="insurance-expires-at"
                className="w-full"
                label={detail.overview.expiresOn}
                placeholder={detail.overview.pickDate}
                clearLabel={detail.overview.clearDate}
                todayLabel={detail.overview.today}
                value={parseDateInputValue(complianceForm.insurance_expires_at)}
                disabled={!canWrite || savingCompliance}
                onChange={(date) =>
                  setComplianceForm((current) => ({
                    ...current,
                    insurance_expires_at: formatDateInputValue(date),
                  }))
                }
              />
            </div>
          </FieldGroup>

          <FieldGroup title={detail.compliance.additionalNotes}>
            <div className="space-y-1.5">
              <Label htmlFor="insurance-notes" className="text-sm font-medium text-slate-600">
                {detail.overview.insuranceNotes}
              </Label>
              <textarea
                id="insurance-notes"
                value={complianceForm.insurance_notes}
                onChange={(event) =>
                  setComplianceForm((current) => ({
                    ...current,
                    insurance_notes: event.target.value,
                  }))
                }
                rows={3}
                placeholder={detail.overview.insuranceNotesPlaceholder}
                disabled={!canWrite || savingCompliance}
                className={cn(textareaClassName, "w-full")}
              />
            </div>
          </FieldGroup>
        </ComplianceFormSection>

        <ComplianceFormSection
          icon={ClipboardList}
          title={detail.overview.inspection}
          description={detail.overview.inspectionHint}
          statusBadge={
            <Badge variant="outline" className={expiryToneClass(inspectionTone)}>
              {detail.overview.expiryStatus[inspectionTone]}
            </Badge>
          }
        >
          <FieldGroup title={detail.compliance.policyDetails}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inspection-center" className="text-sm font-medium text-slate-600">
                  {detail.overview.inspectionCenter}
                </Label>
                <Input
                  id="inspection-center"
                  value={complianceForm.inspection_center}
                  onChange={(event) =>
                    setComplianceForm((current) => ({
                      ...current,
                      inspection_center: event.target.value,
                    }))
                  }
                  placeholder={detail.overview.inspectionCenterPlaceholder}
                  disabled={!canWrite || savingCompliance}
                  className={cn(adminInputClass, "w-full")}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="inspection-certificate-number"
                  className="text-sm font-medium text-slate-600"
                >
                  {detail.overview.inspectionCertificateNumber}
                </Label>
                <Input
                  id="inspection-certificate-number"
                  value={complianceForm.inspection_certificate_number}
                  onChange={(event) =>
                    setComplianceForm((current) => ({
                      ...current,
                      inspection_certificate_number: event.target.value,
                    }))
                  }
                  placeholder={detail.overview.inspectionCertificateNumberPlaceholder}
                  disabled={!canWrite || savingCompliance}
                  className={cn(adminInputClass, "w-full")}
                />
              </div>
            </div>
          </FieldGroup>

          <FieldGroup title={detail.compliance.dates}>
            <div className="space-y-4">
              <AdminDatePicker
                id="inspection-performed-at"
                className="w-full"
                label={detail.overview.inspectionPerformedAt}
                placeholder={detail.overview.pickDate}
                clearLabel={detail.overview.clearDate}
                todayLabel={detail.overview.today}
                value={parseDateInputValue(complianceForm.inspection_performed_at)}
                disabled={!canWrite || savingCompliance}
                onChange={(date) =>
                  setComplianceForm((current) => ({
                    ...current,
                    inspection_performed_at: formatDateInputValue(date),
                  }))
                }
              />
              <AdminDatePicker
                id="inspection-expires-at"
                className="w-full"
                label={detail.overview.expiresOn}
                placeholder={detail.overview.pickDate}
                clearLabel={detail.overview.clearDate}
                todayLabel={detail.overview.today}
                value={parseDateInputValue(complianceForm.inspection_expires_at)}
                disabled={!canWrite || savingCompliance}
                onChange={(date) =>
                  setComplianceForm((current) => ({
                    ...current,
                    inspection_expires_at: formatDateInputValue(date),
                  }))
                }
              />
            </div>
          </FieldGroup>

          <FieldGroup title={detail.compliance.additionalNotes}>
            <div className="space-y-1.5">
              <Label htmlFor="inspection-notes" className="text-sm font-medium text-slate-600">
                {detail.overview.inspectionNotes}
              </Label>
              <textarea
                id="inspection-notes"
                value={complianceForm.inspection_notes}
                onChange={(event) =>
                  setComplianceForm((current) => ({
                    ...current,
                    inspection_notes: event.target.value,
                  }))
                }
                rows={3}
                placeholder={detail.overview.inspectionNotesPlaceholder}
                disabled={!canWrite || savingCompliance}
                className={cn(textareaClassName, "w-full")}
              />
            </div>
          </FieldGroup>
        </ComplianceFormSection>
      </div>

      {canWrite ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onSave}
            disabled={savingCompliance}
            className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
          >
            {savingCompliance ? detail.overview.saving : detail.overview.saveCompliance}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
