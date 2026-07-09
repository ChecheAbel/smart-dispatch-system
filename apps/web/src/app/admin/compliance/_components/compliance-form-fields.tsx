import type { Dispatch, SetStateAction } from "react";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminInputClass } from "@/lib/admin-theme";
import {
  type ComplianceForm,
  complianceTextareaClassName,
  formatDateInputValue,
  parseDateInputValue,
} from "@/lib/vehicle-compliance-form";
import { getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";

type ComplianceFieldLabels = ReturnType<typeof getAdminVehiclesMessages>["detail"];

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {children}
    </div>
  );
}

type ComplianceFieldsProps = {
  form: ComplianceForm;
  setForm: Dispatch<SetStateAction<ComplianceForm>>;
  detail: ComplianceFieldLabels;
  disabled?: boolean;
  idPrefix: string;
};

export function InsuranceComplianceFields({
  form,
  setForm,
  detail,
  disabled = false,
  idPrefix,
}: ComplianceFieldsProps) {
  return (
    <div className="space-y-5">
      <FieldGroup title={detail.compliance.policyDetails}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-insurance-provider`} className="text-sm font-medium text-slate-600">
              {detail.overview.insuranceProvider}
            </Label>
            <Input
              id={`${idPrefix}-insurance-provider`}
              value={form.insurance_provider}
              onChange={(event) =>
                setForm((current) => ({ ...current, insurance_provider: event.target.value }))
              }
              placeholder={detail.overview.insuranceProviderPlaceholder}
              disabled={disabled}
              className={cn(adminInputClass, "w-full")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-insurance-policy-number`} className="text-sm font-medium text-slate-600">
              {detail.overview.insurancePolicyNumber}
            </Label>
            <Input
              id={`${idPrefix}-insurance-policy-number`}
              value={form.insurance_policy_number}
              onChange={(event) =>
                setForm((current) => ({ ...current, insurance_policy_number: event.target.value }))
              }
              placeholder={detail.overview.insurancePolicyNumberPlaceholder}
              disabled={disabled}
              className={cn(adminInputClass, "w-full")}
            />
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title={detail.compliance.dates}>
        <div className="space-y-4">
          <AdminDatePicker
            id={`${idPrefix}-insurance-issued-at`}
            className="w-full"
            label={detail.overview.insuranceIssuedAt}
            placeholder={detail.overview.pickDate}
            clearLabel={detail.overview.clearDate}
            todayLabel={detail.overview.today}
            value={parseDateInputValue(form.insurance_issued_at)}
            disabled={disabled}
            onChange={(date) =>
              setForm((current) => ({
                ...current,
                insurance_issued_at: formatDateInputValue(date),
              }))
            }
          />
          <AdminDatePicker
            id={`${idPrefix}-insurance-expires-at`}
            className="w-full"
            label={detail.overview.expiresOn}
            placeholder={detail.overview.pickDate}
            clearLabel={detail.overview.clearDate}
            todayLabel={detail.overview.today}
            value={parseDateInputValue(form.insurance_expires_at)}
            disabled={disabled}
            onChange={(date) =>
              setForm((current) => ({
                ...current,
                insurance_expires_at: formatDateInputValue(date),
              }))
            }
          />
        </div>
      </FieldGroup>

      <FieldGroup title={detail.compliance.additionalNotes}>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-insurance-notes`} className="text-sm font-medium text-slate-600">
            {detail.overview.insuranceNotes}
          </Label>
          <textarea
            id={`${idPrefix}-insurance-notes`}
            value={form.insurance_notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, insurance_notes: event.target.value }))
            }
            rows={3}
            placeholder={detail.overview.insuranceNotesPlaceholder}
            disabled={disabled}
            className={cn(complianceTextareaClassName, "w-full")}
          />
        </div>
      </FieldGroup>
    </div>
  );
}

export function InspectionComplianceFields({
  form,
  setForm,
  detail,
  disabled = false,
  idPrefix,
}: ComplianceFieldsProps) {
  return (
    <div className="space-y-5">
      <FieldGroup title={detail.compliance.policyDetails}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-inspection-center`} className="text-sm font-medium text-slate-600">
              {detail.overview.inspectionCenter}
            </Label>
            <Input
              id={`${idPrefix}-inspection-center`}
              value={form.inspection_center}
              onChange={(event) =>
                setForm((current) => ({ ...current, inspection_center: event.target.value }))
              }
              placeholder={detail.overview.inspectionCenterPlaceholder}
              disabled={disabled}
              className={cn(adminInputClass, "w-full")}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`${idPrefix}-inspection-certificate-number`}
              className="text-sm font-medium text-slate-600"
            >
              {detail.overview.inspectionCertificateNumber}
            </Label>
            <Input
              id={`${idPrefix}-inspection-certificate-number`}
              value={form.inspection_certificate_number}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  inspection_certificate_number: event.target.value,
                }))
              }
              placeholder={detail.overview.inspectionCertificateNumberPlaceholder}
              disabled={disabled}
              className={cn(adminInputClass, "w-full")}
            />
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title={detail.compliance.dates}>
        <div className="space-y-4">
          <AdminDatePicker
            id={`${idPrefix}-inspection-performed-at`}
            className="w-full"
            label={detail.overview.inspectionPerformedAt}
            placeholder={detail.overview.pickDate}
            clearLabel={detail.overview.clearDate}
            todayLabel={detail.overview.today}
            value={parseDateInputValue(form.inspection_performed_at)}
            disabled={disabled}
            onChange={(date) =>
              setForm((current) => ({
                ...current,
                inspection_performed_at: formatDateInputValue(date),
              }))
            }
          />
          <AdminDatePicker
            id={`${idPrefix}-inspection-expires-at`}
            className="w-full"
            label={detail.overview.expiresOn}
            placeholder={detail.overview.pickDate}
            clearLabel={detail.overview.clearDate}
            todayLabel={detail.overview.today}
            value={parseDateInputValue(form.inspection_expires_at)}
            disabled={disabled}
            onChange={(date) =>
              setForm((current) => ({
                ...current,
                inspection_expires_at: formatDateInputValue(date),
              }))
            }
          />
        </div>
      </FieldGroup>

      <FieldGroup title={detail.compliance.additionalNotes}>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-inspection-notes`} className="text-sm font-medium text-slate-600">
            {detail.overview.inspectionNotes}
          </Label>
          <textarea
            id={`${idPrefix}-inspection-notes`}
            value={form.inspection_notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, inspection_notes: event.target.value }))
            }
            rows={3}
            placeholder={detail.overview.inspectionNotesPlaceholder}
            disabled={disabled}
            className={cn(complianceTextareaClassName, "w-full")}
          />
        </div>
      </FieldGroup>
    </div>
  );
}
