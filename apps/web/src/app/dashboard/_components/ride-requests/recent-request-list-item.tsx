"use client";

import { CalendarClock, Car, Navigation, Users } from "lucide-react";
import type { RideRequest } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { isValidCoordinatePair } from "@/lib/map/coordinates";
import { formatMessage, type CustomerRequestsMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { formatScheduledAt, statusBadgeClass } from "./ride-request-utils";

type RecentRideRequestListItemProps = {
  request: RideRequest;
  copy: CustomerRequestsMessages;
  locale: string;
};

export function RecentRideRequestListItem({ request, copy, locale }: RecentRideRequestListItemProps) {
  const hasPickupCoordinates = isValidCoordinatePair(
    request.pickup_latitude ?? undefined,
    request.pickup_longitude ?? undefined,
  );

  return (
    <article className="group px-4 py-4 transition-colors hover:bg-[#f8fafb]/80 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex flex-col items-center pt-1.5" aria-hidden>
            <span className="size-2.5 shrink-0 rounded-full bg-[#1C3A34] ring-4 ring-[#1C3A34]/10" />
            <span className="my-1.5 w-px flex-1 min-h-6 bg-gradient-to-b from-[#1C3A34]/30 to-[#C9B87A]/70" />
            <span className="size-2.5 shrink-0 rounded-full bg-[#C9B87A] ring-4 ring-[#C9B87A]/20" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {copy.pickupAddress}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#1C3A34]">{request.pickup_address}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {copy.dropoffAddress}
              </p>
              <p className="mt-0.5 text-sm text-slate-600">{request.dropoff_address}</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-xs", statusBadgeClass(request.status))}>
          {copy.status[request.status]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 pl-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
          <CalendarClock className="size-3 text-[#C9B87A]" />
          {formatScheduledAt(request.scheduled_at, locale)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
          <Users className="size-3 text-[#C9B87A]" />
          {formatMessage(copy.passengersCount, { count: request.passenger_count })}
        </span>
        {request.vehicle_type ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
            <Car className="size-3 text-[#C9B87A]" />
            {request.vehicle_type.name}
          </span>
        ) : null}
        {request.vehicle_class ? (
          <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
            {request.vehicle_class.name}
          </span>
        ) : null}
        {request.region ? (
          <span className="rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
            {request.region.name}
          </span>
        ) : null}
        {hasPickupCoordinates ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-500">
            <Navigation className="size-3" />
            {request.pickup_latitude?.toFixed(5)}, {request.pickup_longitude?.toFixed(5)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
