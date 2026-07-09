import Link from "next/link";
import { ClipboardList, Pencil, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { formatComplianceDate } from "@/lib/vehicle-compliance";
import { getAdminComplianceMessages, getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { expiryToneClass, getExpiryTone } from "./vehicle-detail-shared";

type VehicleDetailComplianceTabProps = {
  vehicle: Vehicle;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  complianceCopy: ReturnType<typeof getAdminComplianceMessages>;
  locale: string;
  canWrite: boolean;
  onEditInsurance: () => void;
  onEditInspection: () => void;
};

function ComplianceSummarySection({
  icon: Icon,
  title,
  description,
  statusBadge,
  fields,
  updateLabel,
  canWrite,
  onUpdate,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  statusBadge: React.ReactNode;
  fields: { label: string; value: string }[];
  updateLabel: string;
  canWrite: boolean;
  onUpdate: () => void;
}) {
  return (
    <section className={cn(adminCardClass, "flex flex-col overflow-hidden rounded-2xl")}>
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

      <dl className="flex-1 space-y-3 p-4 sm:p-5">
        {fields.map((field) => (
          <div key={field.label} className="rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3">
            <dt className="text-xs font-medium text-slate-500">{field.label}</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800 break-words">{field.value}</dd>
          </div>
        ))}
      </dl>

      {canWrite ? (
        <div className="border-t border-slate-100 bg-gradient-to-r from-[#1C3A34]/[0.04] to-transparent px-4 py-4 sm:px-5">
          <Button
            type="button"
            onClick={onUpdate}
            className={cn(adminPrimaryButtonClass, "w-full shadow-sm sm:w-auto")}
          >
            <Pencil className="size-3.5" />
            {updateLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function displayValue(value: string | null | undefined, emptyLabel: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : emptyLabel;
}

export function VehicleDetailComplianceTab({
  vehicle,
  detail,
  complianceCopy,
  locale,
  canWrite,
  onEditInsurance,
  onEditInspection,
}: VehicleDetailComplianceTabProps) {
  const insuranceTone = getExpiryTone(vehicle.insurance_expires_at);
  const inspectionTone = getExpiryTone(vehicle.inspection_expires_at);
  const notSet = "—";

  const insuranceFields = [
    {
      label: detail.overview.insuranceProvider,
      value: displayValue(vehicle.insurance_provider, notSet),
    },
    {
      label: detail.overview.insurancePolicyNumber,
      value: displayValue(vehicle.insurance_policy_number, notSet),
    },
    {
      label: detail.overview.insuranceIssuedAt,
      value: formatComplianceDate(vehicle.insurance_issued_at, locale) ?? notSet,
    },
    {
      label: detail.overview.expiresOn,
      value: formatComplianceDate(vehicle.insurance_expires_at, locale) ?? detail.overview.noExpiryDate,
    },
    {
      label: detail.overview.insuranceNotes,
      value: displayValue(vehicle.insurance_notes, detail.overview.noNotes),
    },
  ];

  const inspectionFields = [
    {
      label: detail.overview.inspectionCenter,
      value: displayValue(vehicle.inspection_center, notSet),
    },
    {
      label: detail.overview.inspectionCertificateNumber,
      value: displayValue(vehicle.inspection_certificate_number, notSet),
    },
    {
      label: detail.overview.inspectionPerformedAt,
      value: formatComplianceDate(vehicle.inspection_performed_at, locale) ?? notSet,
    },
    {
      label: detail.overview.expiresOn,
      value: formatComplianceDate(vehicle.inspection_expires_at, locale) ?? detail.overview.noExpiryDate,
    },
    {
      label: detail.overview.inspectionNotes,
      value: displayValue(vehicle.inspection_notes, detail.overview.noNotes),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{detail.compliance.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{detail.compliance.description}</p>
        </div>
        <Button
          render={<Link href="/admin/compliance" />}
          nativeButton={false}
          className={cn(
            adminPrimaryButtonClass,
            "shrink-0 shadow-sm",
          )}
        >
          {detail.compliance.fleetOverviewLink}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <ComplianceSummarySection
          icon={ShieldCheck}
          title={detail.overview.insurance}
          description={detail.overview.insuranceHint}
          statusBadge={
            <Badge variant="outline" className={expiryToneClass(insuranceTone)}>
              {detail.overview.expiryStatus[insuranceTone]}
            </Badge>
          }
          fields={insuranceFields}
          updateLabel={complianceCopy.actions.editInsurance}
          canWrite={canWrite}
          onUpdate={onEditInsurance}
        />

        <ComplianceSummarySection
          icon={ClipboardList}
          title={detail.overview.inspection}
          description={detail.overview.inspectionHint}
          statusBadge={
            <Badge variant="outline" className={expiryToneClass(inspectionTone)}>
              {detail.overview.expiryStatus[inspectionTone]}
            </Badge>
          }
          fields={inspectionFields}
          updateLabel={complianceCopy.actions.editInspection}
          canWrite={canWrite}
          onUpdate={onEditInspection}
        />
      </div>
    </div>
  );
}
