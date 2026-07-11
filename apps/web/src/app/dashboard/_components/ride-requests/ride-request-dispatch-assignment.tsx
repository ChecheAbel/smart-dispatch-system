import { CheckCircle2, Circle, Phone, Truck, UserRound } from "lucide-react";
import type { RideRequest } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatSubmittedAt } from "./ride-request-utils";

type RideRequestDispatchAssignmentLabels = {
  sectionDescription: string;
  assignedBadge: string;
  vehicle: string;
  driver: string;
  assignedAt: string;
  tripStartedAt: string;
  tripCompletedAt: string;
};

type RideRequestDispatchAssignmentCardProps = {
  request: Pick<
    RideRequest,
    | "assigned_vehicle"
    | "assigned_driver"
    | "assigned_at"
    | "started_at"
    | "completed_at"
  >;
  locale: string;
  labels: RideRequestDispatchAssignmentLabels;
};

function formatVehicleName(
  vehicle: NonNullable<RideRequest["assigned_vehicle"]>,
) {
  return [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—";
}

function formatVehicleMeta(
  vehicle: NonNullable<RideRequest["assigned_vehicle"]>,
) {
  return [vehicle.vehicle_type?.name, vehicle.vehicle_class?.name]
    .filter(Boolean)
    .join(" · ");
}

type TimelineStep = {
  key: string;
  label: string;
  value: string | null;
  complete: boolean;
  active: boolean;
};

function AssignmentTimeline({
  steps,
}: {
  steps: TimelineStep[];
}) {
  const visibleSteps = steps.filter((step) => step.complete || step.active);
  if (visibleSteps.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-200/80 px-4 py-4">
      <ol className="grid gap-3 sm:grid-cols-3">
        {visibleSteps.map((step) => (
          <li key={step.key} className="flex gap-3">
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border",
                step.complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : step.active
                    ? "border-[#1C3A34]/20 bg-[#1C3A34]/8 text-[#1C3A34]"
                    : "border-slate-200 bg-slate-50 text-slate-400",
              )}
            >
              {step.complete ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <Circle className="size-3" />
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {step.label}
              </p>
              <p
                className={cn(
                  "text-xs leading-snug",
                  step.complete
                    ? "font-medium text-slate-700"
                    : "font-medium text-[#1C3A34]",
                )}
              >
                {step.value ?? "—"}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function RideRequestDispatchAssignmentCard({
  request,
  locale,
  labels,
}: RideRequestDispatchAssignmentCardProps) {
  const vehicle = request.assigned_vehicle;
  const driver = request.assigned_driver;
  const vehicleMeta = vehicle ? formatVehicleMeta(vehicle) : "";

  const timelineSteps: TimelineStep[] = [
    {
      key: "assigned",
      label: labels.assignedAt,
      value: request.assigned_at
        ? formatSubmittedAt(request.assigned_at, locale)
        : null,
      complete: Boolean(request.assigned_at),
      active: Boolean(vehicle || driver) && !request.started_at,
    },
    {
      key: "started",
      label: labels.tripStartedAt,
      value: request.started_at
        ? formatSubmittedAt(request.started_at, locale)
        : null,
      complete: Boolean(request.started_at),
      active: Boolean(request.started_at) && !request.completed_at,
    },
    {
      key: "completed",
      label: labels.tripCompletedAt,
      value: request.completed_at
        ? formatSubmittedAt(request.completed_at, locale)
        : null,
      complete: Boolean(request.completed_at),
      active: Boolean(request.completed_at),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      <div className="border-b border-[#1C3A34]/10 bg-gradient-to-r from-[#1C3A34]/6 to-[#C9B87A]/10 px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Badge className="border-[#1C3A34]/15 bg-[#1C3A34]/10 text-[11px] font-semibold uppercase tracking-wide text-[#1C3A34]">
            {labels.assignedBadge}
          </Badge>
          {request.assigned_at ? (
            <span className="text-xs text-slate-500">
              {formatSubmittedAt(request.assigned_at, locale)}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {vehicle ? (
            <div className="flex gap-3 rounded-lg border border-white/70 bg-white/75 p-3 shadow-sm">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
                <Truck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {labels.vehicle}
                </p>
                <p className="truncate text-sm font-semibold text-[#1C3A34]">
                  {vehicle.plate_number}
                </p>
                <p className="truncate text-xs text-slate-600">
                  {formatVehicleName(vehicle)}
                </p>
                {vehicleMeta ? (
                  <p className="mt-1 truncate text-[11px] text-slate-500">{vehicleMeta}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {driver ? (
            <div className="flex gap-3 rounded-lg border border-white/70 bg-white/75 p-3 shadow-sm">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
                <UserRound className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {labels.driver}
                </p>
                <p className="truncate text-sm font-semibold text-[#1C3A34]">{driver.name}</p>
                {driver.mobile_number ? (
                  <a
                    href={`tel:${driver.mobile_number}`}
                    className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-[#1C3A34] underline-offset-2 hover:underline"
                  >
                    <Phone className="size-3 shrink-0" />
                    <span className="truncate">{driver.mobile_number}</span>
                  </a>
                ) : (
                  <p className="truncate text-xs text-slate-600">{driver.email}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <AssignmentTimeline steps={timelineSteps} />
    </div>
  );
}

export function RideRequestDispatchAssignmentSection({
  request,
  locale,
  title,
  labels,
}: RideRequestDispatchAssignmentCardProps & {
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
          <Truck className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1C3A34]">{title}</h3>
          <p className="text-xs text-slate-500">{labels.sectionDescription}</p>
        </div>
      </div>

      <RideRequestDispatchAssignmentCard
        request={request}
        locale={locale}
        labels={labels}
      />
    </section>
  );
}
