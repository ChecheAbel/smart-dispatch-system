import { CalendarClock, ChevronRight, ClipboardList, ShieldCheck } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import {
  expiryToneClass,
  formatComplianceDate,
  formatExpiryCountdown,
  getExpiryTone,
} from "./vehicle-detail-shared";

type VehicleDetailOverviewTabProps = {
  vehicle: Vehicle;
  copy: ReturnType<typeof getAdminVehiclesMessages>;
  locale: string;
  canWrite: boolean;
  onNavigateToCompliance: () => void;
  onEditInsurance: () => void;
  onEditInspection: () => void;
};

export function VehicleDetailOverviewTab({
  vehicle,
  copy,
  locale,
  canWrite,
  onNavigateToCompliance,
  onEditInsurance,
  onEditInspection,
}: VehicleDetailOverviewTabProps) {
  const detail = copy.detail;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  const vehicleImages = vehicle.images ?? [];

  const complianceItems = [
    {
      key: "insurance" as const,
      title: detail.overview.insurance,
      tone: getExpiryTone(vehicle.insurance_expires_at),
      icon: ShieldCheck,
      expiresAt: vehicle.insurance_expires_at,
      subtitle: vehicle.insurance_provider,
      reference: vehicle.insurance_policy_number,
      onClick: canWrite ? onEditInsurance : onNavigateToCompliance,
      actionLabel: canWrite ? detail.overview.updateInsurance : detail.overview.viewDetails,
    },
    {
      key: "inspection" as const,
      title: detail.overview.inspection,
      tone: getExpiryTone(vehicle.inspection_expires_at),
      icon: ClipboardList,
      expiresAt: vehicle.inspection_expires_at,
      subtitle: vehicle.inspection_center,
      reference: vehicle.inspection_certificate_number,
      onClick: canWrite ? onEditInspection : onNavigateToCompliance,
      actionLabel: canWrite ? detail.overview.updateInspection : detail.overview.viewDetails,
    },
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-5">
      <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-5 lg:p-6")}>
          <div className="flex items-center gap-3">
            <div className={adminIconBoxClass}>
              <ClipboardList className="size-4" />
            </div>
            <div>
              <h2 className={cn("text-base", adminHeadingClass)}>{detail.overview.vehicleInfo}</h2>
              <p className="text-sm text-slate-500">Key vehicle details</p>
            </div>
          </div>

          <dl className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            {(
              [
                [copy.columns.chassis, vehicle.chassis_number || "—"],
                [copy.columns.type, vehicle.vehicle_type?.name || "—"],
                [copy.columns.class, vehicle.vehicle_class?.name || "—"],
                [copy.columns.driver, vehicle.assigned_driver?.name || detail.overview.unassigned],
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={adminIconBoxClass}>
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className={cn("text-base", adminHeadingClass)}>{detail.overview.compliance}</h2>
              <p className="text-sm text-slate-500">{detail.overview.complianceHint}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {complianceItems.map((item) => {
            const Icon = item.icon;
            const formattedExpiry = formatComplianceDate(item.expiresAt, locale);
            const countdown = formatExpiryCountdown(item.expiresAt, detail.overview);
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className="group flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3.5 text-left transition hover:border-slate-200 hover:bg-white sm:px-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className={adminIconBoxClass}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-600">
                      {detail.overview.expiresOn}:{" "}
                      <span className="font-medium text-slate-800">
                        {formattedExpiry ?? detail.overview.noExpiryDate}
                      </span>
                    </p>
                    {countdown ? (
                      <p className="text-xs font-medium text-slate-500">{countdown}</p>
                    ) : null}
                    {item.subtitle ? (
                      <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                    ) : null}
                    {item.reference ? (
                      <p className="truncate font-mono text-[11px] text-slate-400">{item.reference}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant="outline" className={expiryToneClass(item.tone)}>
                    {detail.overview.expiryStatus[item.tone]}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 transition group-hover:text-[#1C3A34]">
                    {item.actionLabel}
                    <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNavigateToCompliance}
          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-3.5 text-left transition hover:border-[#1C3A34]/20 hover:bg-[#1C3A34]/[0.03]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className={adminIconBoxClass}>
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", adminHeadingClass)}>
                {detail.overview.manageCompliance}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {detail.overview.manageComplianceHint}
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#1C3A34]" />
        </button>
      </section>

      <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-5 lg:p-6")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={adminIconBoxClass}>
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className={cn("text-base", adminHeadingClass)}>Vehicle images</h2>
              <p className="text-sm text-slate-500">Uploaded vehicle photos</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">{vehicleImages.length}</p>
        </div>

        {vehicleImages.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {vehicleImages.map((image, index) => {
              const imageUrl = getVehiclePhotoUrl(image, apiBaseUrl);
              return (
                <a
                  key={`${image}-${index}`}
                  href={imageUrl ?? image}
                  target="_blank"
                  rel="noreferrer"
                  className="group w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-[4/3] w-full bg-slate-100">
                    <img
                      src={imageUrl ?? image}
                      alt={`${vehicle.plate_number} photo ${index + 1}`}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50">
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <ShieldCheck className="size-6 text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">{detail.vehicleImagesEmpty}</p>
                <p className="text-xs text-slate-500">{detail.vehicleImages}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
