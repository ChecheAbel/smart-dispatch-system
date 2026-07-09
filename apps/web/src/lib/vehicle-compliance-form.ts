import { format } from "date-fns";
import type { Vehicle } from "@smart-dispatch/types";
import { adminInputClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

export type ComplianceForm = {
  insurance_provider: string;
  insurance_policy_number: string;
  insurance_issued_at: string;
  insurance_expires_at: string;
  insurance_notes: string;
  inspection_center: string;
  inspection_certificate_number: string;
  inspection_performed_at: string;
  inspection_expires_at: string;
  inspection_notes: string;
};

export const emptyComplianceForm: ComplianceForm = {
  insurance_provider: "",
  insurance_policy_number: "",
  insurance_issued_at: "",
  insurance_expires_at: "",
  insurance_notes: "",
  inspection_center: "",
  inspection_certificate_number: "",
  inspection_performed_at: "",
  inspection_expires_at: "",
  inspection_notes: "",
};

export const complianceTextareaClassName = cn(
  adminInputClass,
  "min-h-[88px] h-auto w-full resize-y py-2.5 leading-relaxed placeholder:text-slate-400 focus-visible:border-[#1C3A34] focus-visible:ring-3 focus-visible:ring-[#1C3A34]/10",
);

export function parseDateInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatDateInputValue(date: Date | undefined): string {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function vehicleToComplianceForm(vehicle: Vehicle): ComplianceForm {
  return {
    insurance_provider: vehicle.insurance_provider ?? "",
    insurance_policy_number: vehicle.insurance_policy_number ?? "",
    insurance_issued_at: vehicle.insurance_issued_at ?? "",
    insurance_expires_at: vehicle.insurance_expires_at ?? "",
    insurance_notes: vehicle.insurance_notes ?? "",
    inspection_center: vehicle.inspection_center ?? "",
    inspection_certificate_number: vehicle.inspection_certificate_number ?? "",
    inspection_performed_at: vehicle.inspection_performed_at ?? "",
    inspection_expires_at: vehicle.inspection_expires_at ?? "",
    inspection_notes: vehicle.inspection_notes ?? "",
  };
}

export function complianceFormToPayload(form: ComplianceForm) {
  return {
    insurance_provider: form.insurance_provider.trim() || null,
    insurance_policy_number: form.insurance_policy_number.trim() || null,
    insurance_issued_at: form.insurance_issued_at || null,
    insurance_expires_at: form.insurance_expires_at || null,
    insurance_notes: form.insurance_notes.trim() || null,
    inspection_center: form.inspection_center.trim() || null,
    inspection_certificate_number: form.inspection_certificate_number.trim() || null,
    inspection_performed_at: form.inspection_performed_at || null,
    inspection_expires_at: form.inspection_expires_at || null,
    inspection_notes: form.inspection_notes.trim() || null,
  };
}

export function insuranceFormToPayload(form: ComplianceForm) {
  return {
    insurance_provider: form.insurance_provider.trim() || null,
    insurance_policy_number: form.insurance_policy_number.trim() || null,
    insurance_issued_at: form.insurance_issued_at || null,
    insurance_expires_at: form.insurance_expires_at || null,
    insurance_notes: form.insurance_notes.trim() || null,
  };
}

export function inspectionFormToPayload(form: ComplianceForm) {
  return {
    inspection_center: form.inspection_center.trim() || null,
    inspection_certificate_number: form.inspection_certificate_number.trim() || null,
    inspection_performed_at: form.inspection_performed_at || null,
    inspection_expires_at: form.inspection_expires_at || null,
    inspection_notes: form.inspection_notes.trim() || null,
  };
}
