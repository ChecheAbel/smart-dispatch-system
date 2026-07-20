"use client";

import { CalendarClock, Car, MapPin, Route, UserRound, Users } from "lucide-react";
import type { InvoiceLineItem, RideRequestStatus } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatHumanDurationMinutes,
  formatScheduledAt,
  statusBadgeClass,
} from "@/app/dashboard/_components/ride-requests/ride-request-utils";

export type InvoiceTripDetailsLabels = {
  requestId: string;
  scheduled: string;
  scheduledReturn: string;
  started: string;
  completed: string;
  passengers: string;
  driver: string;
  vehicle: string;
  farePlan: string;
  pickup: string;
  dropoff: string;
  unassigned: string;
  distance: string;
  duration: string;
  durationUnderOneMinute: string;
  durationOneMinute: string;
  durationMinutes: string;
  durationOneHour: string;
  durationHours: string;
  durationHoursAndMinutes: string;
  tripStatus?: Partial<Record<RideRequestStatus, string>>;
};

type InvoiceLineItemTripDetailsProps = {
  item: InvoiceLineItem;
  locale: string;
  labels: InvoiceTripDetailsLabels;
  showBillingMetrics?: boolean;
  className?: string;
};

function formatTripMetricDistance(km: number | null) {
  if (km == null) return "";
  return `${km.toFixed(1)} km`;
}

function formatVehicleLine(
  vehicle: NonNullable<InvoiceLineItem["ride_request"]["assigned_vehicle"]>,
) {
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return [vehicle.plate_number, makeModel].filter(Boolean).join(" · ");
}

export function InvoiceLineItemTripDetails({
  item,
  locale,
  labels,
  showBillingMetrics = false,
  className,
}: InvoiceLineItemTripDetailsProps) {
  const trip = item.ride_request;
  const shortId = trip.id.slice(0, 8).toUpperCase();

  const metaItems = [
    {
      key: "scheduled",
      icon: CalendarClock,
      label: labels.scheduled,
      value: trip.scheduled_at
        ? formatScheduledAt(trip.scheduled_at, locale)
        : "",
    },
    ...(trip.scheduled_return_at
      ? [
          {
            key: "return",
            icon: CalendarClock,
            label: labels.scheduledReturn,
            value: formatScheduledAt(trip.scheduled_return_at, locale),
          },
        ]
      : []),
    {
      key: "started",
      icon: Route,
      label: labels.started,
      value: trip.started_at ? formatScheduledAt(trip.started_at, locale) : "",
    },
    {
      key: "completed",
      icon: CalendarClock,
      label: labels.completed,
      value: trip.completed_at ? formatScheduledAt(trip.completed_at, locale) : "",
    },
    {
      key: "passengers",
      icon: Users,
      label: labels.passengers,
      value: String(trip.passenger_count),
    },
    {
      key: "driver",
      icon: UserRound,
      label: labels.driver,
      value: trip.assigned_driver?.name ?? labels.unassigned,
    },
    {
      key: "vehicle",
      icon: Car,
      label: labels.vehicle,
      value: trip.assigned_vehicle ? formatVehicleLine(trip.assigned_vehicle) : labels.unassigned,
    },
    ...(item.fare_plan
      ? [
          {
            key: "fare",
            icon: Route,
            label: labels.farePlan,
            value: item.fare_plan.name,
          },
        ]
      : []),
    ...(showBillingMetrics
      ? [
          {
            key: "distance",
            icon: Route,
            label: labels.distance,
            value: formatTripMetricDistance(item.distance_km),
          },
          {
            key: "duration",
            icon: Route,
            label: labels.duration,
            value: formatHumanDurationMinutes(item.duration_minutes, locale, labels),
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#f8fafb] to-white p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {labels.requestId}
          </p>
          <span className="font-mono text-xs font-semibold text-[#1C3A34]">{shortId}</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px]", statusBadgeClass(trip.status))}>
          {labels.tripStatus?.[trip.status] ??
            trip.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex gap-2.5 text-sm text-slate-700">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-700" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
              {labels.pickup}
            </p>
            <p className="font-medium">{trip.pickup_address}</p>
          </div>
        </div>
        <div className="ml-1.5 h-3 w-px bg-gradient-to-b from-emerald-700/30 to-[#C9B87A]/70" aria-hidden />
        <div className="flex gap-2.5 text-sm text-slate-700">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-rose-500" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
              {labels.dropoff}
            </p>
            <p className="font-medium">{trip.dropoff_address}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {metaItems.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.key}
              className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-white/80 px-3 py-2.5"
            >
              <Icon className="mt-0.5 size-3.5 shrink-0 text-[#C9B87A]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {row.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{row.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function buildInvoiceTripDetailsLabels(
  detailCopy: {
    tripDetails: {
      requestId: string;
      scheduled: string;
      scheduledReturn: string;
      started: string;
      completed: string;
      passengers: string;
      driver: string;
      vehicle: string;
      farePlan: string;
      pickup: string;
      dropoff: string;
      unassigned: string;
      distance: string;
      duration: string;
      durationUnderOneMinute: string;
      durationOneMinute: string;
      durationMinutes: string;
      durationOneHour: string;
      durationHours: string;
      durationHoursAndMinutes: string;
    };
  },
  tripStatus?: Partial<Record<RideRequestStatus, string>>,
): InvoiceTripDetailsLabels {
  return {
    ...detailCopy.tripDetails,
    tripStatus,
  };
}
