"use client";

import { useMemo } from "react";
import { Briefcase, Building2, CheckCircle2, Clock, MapPin, Milestone, Route, Timer } from "lucide-react";
import type { RideRequestLeg, RideRequestStatus } from "@smart-dispatch/types";
import { adminHeadingClass } from "@/lib/admin-theme";
import { formatCoordinatePair, isValidCoordinatePair } from "@/lib/map/coordinates";
import { cn } from "@/lib/utils";

interface RideRequestItinerarySectionProps {
  legs: RideRequestLeg[];
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoordinates?: { latitude?: number | null; longitude?: number | null };
  dropoffCoordinates?: { latitude?: number | null; longitude?: number | null };
  locale?: string;
}

const PURPOSE_CONFIG: Record<
  string,
  { labelEn: string; labelAm: string; icon: typeof Briefcase }
> = {
  meeting: { labelEn: "Business Meeting", labelAm: "የስራ ስብሰባ", icon: Briefcase },
  inspection: { labelEn: "Site Inspection", labelAm: "የቦታ ምርመራ", icon: CheckCircle2 },
  hotel: { labelEn: "Hotel Stay", labelAm: "ሆቴል ማረፊያ", icon: Building2 },
  layover: { labelEn: "Layover / Standby", labelAm: "የጉዞ ማረፊያ", icon: Clock },
};

function getLegStatusPill(status: RideRequestStatus, locale = "en") {
  const isAm = locale === "am";
  switch (status) {
    case "completed":
      return {
        dotClass: "bg-emerald-500",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
        label: isAm ? "ተጠናቋል" : "Completed",
      };
    case "in_progress":
      return {
        dotClass: "bg-sky-500 animate-pulse",
        badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/40",
        label: isAm ? "በሂደት ላይ" : "In Progress",
      };
    case "cancelled":
      return {
        dotClass: "bg-red-500 animate-pulse",
        badgeClass: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40",
        label: isAm ? "ተሰርዟል" : "Cancelled",
      };
    case "pending":
    default:
      return {
        dotClass: "bg-amber-500",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
        label: isAm ? "በመጠባበቅ ላይ" : "Pending",
      };
  }
}

export function RideRequestItinerarySection({
  legs,
  pickupAddress,
  dropoffAddress,
  pickupCoordinates,
  dropoffCoordinates,
  locale = "en",
}: RideRequestItinerarySectionProps) {
  const isAm = locale === "am";

  const totalPlannedWaitMinutes = useMemo(
    () => legs.reduce((sum, l) => sum + (l.planned_wait_minutes || 0), 0),
    [legs],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-card">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34] dark:bg-[#C9B87A]/20 dark:text-[#C9B87A]">
            <Milestone className="size-4" />
          </div>
          <div>
            <h4 className={cn("text-sm font-bold", adminHeadingClass)}>
              {isAm ? "ባለብዙ-ምዕራፍ የጉዞ መስመር" : "Multi-Leg Itinerary"}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAm
                ? `${legs.length} ማረፊያዎች ተመዝግበዋል`
                : `${legs.length} intermediate stop${legs.length > 1 ? "s" : ""} registered`}
            </p>
          </div>
        </div>

        {totalPlannedWaitMinutes > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
            <Timer className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              {isAm ? "የታቀደ ቆይታ፡" : "Standby:"}{" "}
              {totalPlannedWaitMinutes} {isAm ? "ደቂቃ" : "min"}
            </span>
          </div>
        )}
      </div>

      {/* Timeline List */}
      <div className="relative space-y-4 pl-6">
        <div className="absolute bottom-3 top-3 left-2.5 w-0.5 bg-gradient-to-b from-emerald-500 via-[#C9B87A] to-sky-500" />

        {/* Origin (A) */}
        <div className="relative text-xs">
          <span className="absolute -left-6 top-0 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-xs">
            A
          </span>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-white/5 dark:bg-white/[0.02]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {isAm ? "የመነሻ ቦታ" : "Origin (Pickup)"}
            </span>
            <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
              {pickupAddress || (isAm ? "አድራሻ አልተገለጸም" : "Address not specified")}
            </p>
            {isValidCoordinatePair(pickupCoordinates?.latitude ?? undefined, pickupCoordinates?.longitude ?? undefined) && (
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                {formatCoordinatePair(pickupCoordinates!.latitude!, pickupCoordinates!.longitude!)}
              </p>
            )}
          </div>
        </div>

        {/* Intermediate Stops */}
        {legs.map((leg, index) => {
          const purposeMeta = leg.stop_purpose ? PURPOSE_CONFIG[leg.stop_purpose] : null;
          const PurposeIcon = purposeMeta?.icon ?? MapPin;
          const statusPill = getLegStatusPill(leg.status, locale);
          const stopLat = leg.dropoff_latitude ?? leg.pickup_latitude;
          const stopLng = leg.dropoff_longitude ?? leg.pickup_longitude;
          const stopAddress = leg.dropoff_address || leg.pickup_address;

          return (
            <div key={leg.id || index} className="relative text-xs">
              <span className="absolute -left-6 top-1 flex size-5 items-center justify-center rounded-full bg-[#C9B87A] text-[10px] font-extrabold text-[#171a1f] shadow-xs">
                {index + 1}
              </span>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-white/10 dark:bg-card/80">
                {/* Stop Header */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-2 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex size-5 items-center justify-center rounded-md bg-[#1C3A34]/8 text-[#1C3A34] dark:bg-[#C9B87A]/20 dark:text-[#C9B87A]">
                      <PurposeIcon className="size-3" />
                    </div>
                    <span className="font-bold text-[#1C3A34] dark:text-[#eef1f5]">
                      {purposeMeta ? (isAm ? purposeMeta.labelAm : purposeMeta.labelEn) : (isAm ? `ማረፊያ #${index + 1}` : `Stop #${index + 1}`)}
                    </span>
                  </div>

                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", statusPill.badgeClass)}>
                    <span className={cn("size-1.5 rounded-full", statusPill.dotClass)} />
                    {statusPill.label}
                  </span>
                </div>

                {/* Stop Location */}
                <p className="mt-2 font-medium text-slate-800 dark:text-slate-200">
                  {stopAddress || (isAm ? "አድራሻ አልተገለጸም" : "Address not specified")}
                </p>

                {isValidCoordinatePair(stopLat ?? undefined, stopLng ?? undefined) && (
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {formatCoordinatePair(stopLat!, stopLng!)}
                  </p>
                )}

                {/* Wait Minutes & Details */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 dark:bg-white/5">
                    <Clock className="size-3 text-slate-400" />
                    <span>
                      {isAm ? "የታቀደ ቆይታ፡" : "Planned wait:"}{" "}
                      <strong className="text-slate-700 dark:text-slate-200">{leg.planned_wait_minutes ?? 0} {isAm ? "ደቂቃ" : "min"}</strong>
                    </span>
                  </div>

                  {leg.actual_wait_minutes > 0 && (
                    <div className="flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                      <Timer className="size-3 text-sky-500" />
                      <span>
                        {isAm ? "ትክክለኛ ቆይታ፡" : "Actual:"}{" "}
                        <strong>{leg.actual_wait_minutes} {isAm ? "ደቂቃ" : "min"}</strong>
                      </span>
                    </div>
                  )}

                  {leg.estimated_distance_km ? (
                    <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 dark:bg-white/5">
                      <Route className="size-3 text-slate-400" />
                      <span>{leg.estimated_distance_km.toFixed(1)} km</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* Destination (B) */}
        <div className="relative text-xs">
          <span className="absolute -left-6 top-0 flex size-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white shadow-xs">
            B
          </span>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-white/5 dark:bg-white/[0.02]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {isAm ? "የመድረሻ ቦታ" : "Destination (Drop-off)"}
            </span>
            <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
              {dropoffAddress || (isAm ? "አድራሻ አልተገለጸም" : "Address not specified")}
            </p>
            {isValidCoordinatePair(dropoffCoordinates?.latitude ?? undefined, dropoffCoordinates?.longitude ?? undefined) && (
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                {formatCoordinatePair(dropoffCoordinates!.latitude!, dropoffCoordinates!.longitude!)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
