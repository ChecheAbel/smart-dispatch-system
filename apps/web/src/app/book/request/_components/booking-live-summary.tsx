"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import {
  Car,
  Clock,
  Navigation,
  Route,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
import { isValidCoordinatePair } from "@/lib/map/coordinates";
import { VehiclePhotoMedia } from "@/components/book/vehicle-photo-media";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import { Button } from "@/components/ui/button";
import {
  calculateBookingFareEstimate,
  formatEtb,
} from "./booking-fare-estimate";

const LazyRideRequestRouteMap = dynamic(
  () =>
    import("@/app/dashboard/_components/ride-requests/ride-request-route-map").then(
      (mod) => mod.RideRequestRouteMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[240px] items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-[#11161d]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="size-4 animate-spin text-[#C9B87A]" />
          Loading map...
        </div>
      </div>
    ),
  },
);

interface BookingLiveSummaryProps {
  vehicles: Vehicle[];
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoordinates: { latitude?: number | null; longitude?: number | null };
  dropoffCoordinates: { latitude?: number | null; longitude?: number | null };
  waypoints?: Array<{ latitude: number; longitude: number; name: string }>;
  standbyMinutes: number;
  locale?: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  canSubmit: boolean;
  submitButtonLabel: string;
}

export function BookingLiveSummary({
  vehicles,
  pickupAddress,
  dropoffAddress,
  pickupCoordinates,
  dropoffCoordinates,
  waypoints = [],
  standbyMinutes,
  locale = "en",
  isSubmitting,
  onSubmit,
  canSubmit,
  submitButtonLabel,
}: BookingLiveSummaryProps) {
  const isAm = locale === "am";
  const [routeCalculating, setRouteCalculating] = useState(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [routeDurationMin, setRouteDurationMin] = useState<number>(0);

  const primaryVehicle = vehicles[0];
  const hasRouteCoords =
    isValidCoordinatePair(pickupCoordinates.latitude ?? undefined, pickupCoordinates.longitude ?? undefined) &&
    isValidCoordinatePair(dropoffCoordinates.latitude ?? undefined, dropoffCoordinates.longitude ?? undefined);

  // Calculate live estimated fare
  const fareEstimate = useMemo(() => {
    return calculateBookingFareEstimate({
      distanceKm: routeDistanceKm,
      durationMinutes: routeDurationMin,
      standbyMinutes,
      vehicleClassSlug: primaryVehicle?.vehicle_class?.slug,
      vehicleCount: vehicles.length,
    });
  }, [routeDistanceKm, routeDurationMin, standbyMinutes, primaryVehicle, vehicles.length]);

  return (
    <aside className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171c24] lg:sticky lg:top-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-[#1C3A34]/8 p-2 text-[#1C3A34] dark:bg-[#C9B87A]/15 dark:text-[#d8c77f]">
            <Route className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1C3A34] dark:text-[#eef1f5]">
              {isAm ? "የጉዞ አጠቃላይ እይታ" : "Trip & Route Summary"}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAm ? "የቀጥታ መስመር እና የክፍያ ግምት" : "Live trajectory & estimated fare"}
            </p>
          </div>
        </div>

        {routeCalculating && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#C9B87A]/15 px-2.5 py-1 text-[10px] font-bold text-[#1C3A34] dark:text-[#d8c77f]">
            <Loader2 className="size-3 animate-spin text-[#C9B87A]" />
            {isAm ? "በማስላት ላይ..." : "Calculating..."}
          </span>
        )}
      </div>

      {/* Selected Vehicle Card */}
      {primaryVehicle ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-[#11161d]">
          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-white/5">
            <VehiclePhotoMedia
              imageUrl={primaryVehicle.images?.[0] ? getVehiclePhotoUrl(primaryVehicle.images[0]) : undefined}
              alt={`${primaryVehicle.make} ${primaryVehicle.model}`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold text-[#1C3A34] dark:text-[#eef1f5]">
                {primaryVehicle.make} {primaryVehicle.model}
              </span>
              {primaryVehicle.vehicle_class?.name && (
                <span className="rounded bg-[#C9B87A]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1C3A34] dark:text-[#d8c77f]">
                  {primaryVehicle.vehicle_class.name}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {primaryVehicle.vehicle_type?.name ?? "Sedan"} · {primaryVehicle.vehicle_type?.passenger_capacity ?? 4} seats
            </p>
            <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              {primaryVehicle.plate_number}
            </p>
          </div>
        </div>
      ) : null}

      {/* Live Route Map */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10">
        <LazyRideRequestRouteMap
          visible={true}
          locale={locale}
          height={320}
          pickupLatitude={pickupCoordinates.latitude}
          pickupLongitude={pickupCoordinates.longitude}
          dropoffLatitude={dropoffCoordinates.latitude}
          dropoffLongitude={dropoffCoordinates.longitude}
          waypoints={waypoints}
          pickupName={pickupAddress || (isAm ? "መነሻ" : "Pickup")}
          dropoffName={dropoffAddress || (isAm ? "መድረሻ" : "Drop-off")}
          pickupTypeLabel={isAm ? "መነሻ" : "Pickup"}
          dropoffTypeLabel={isAm ? "መድረሻ" : "Drop-off"}
          onRouteLoadingChange={setRouteCalculating}
          onRouteStatsChange={(stats) => {
            if (stats) {
              setRouteDistanceKm(stats.distanceMeters / 1000);
              setRouteDurationMin(stats.durationSeconds ? Math.round(stats.durationSeconds / 60) : 0);
            } else {
              setRouteDistanceKm(0);
              setRouteDurationMin(0);
            }
          }}
        />
      </div>

      {/* Trip Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2 dark:border-white/5 dark:bg-[#11161d]">
          <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
            <Route className="size-3 text-[#1C3A34] dark:text-[#C9B87A]" />
            {isAm ? "ርቀት" : "Distance"}
          </div>
          <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            {hasRouteCoords ? `${routeDistanceKm.toFixed(1)} km` : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2 dark:border-white/5 dark:bg-[#11161d]">
          <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
            <Navigation className="size-3 text-sky-500" />
            {isAm ? "የጉዞ ጊዜ" : "Drive Time"}
          </div>
          <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            {hasRouteCoords ? `${routeDurationMin} min` : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2 dark:border-white/5 dark:bg-[#11161d]">
          <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
            <Clock className="size-3 text-amber-500" />
            {isAm ? "መጠባበቂያ" : "Standby"}
          </div>
          <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            {standbyMinutes > 0 ? `${standbyMinutes} min` : "0 min"}
          </p>
        </div>
      </div>

      {/* Live Fare Estimation Breakdown */}
      <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-[#11161d]">
        <div className="flex items-center justify-between text-xs font-bold text-[#1C3A34] dark:text-[#eef1f5]">
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-[#C9B87A]" />
            {isAm ? "የክፍያ ግምት (ETB)" : "Estimated Billing (ETB)"}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">15% VAT inc.</span>
        </div>

        <div className="space-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex justify-between">
            <span className="text-[11px] text-slate-500">{isAm ? "የመነሻ ዋጋ" : "Base Transfer Rate"}</span>
            <span className="font-semibold">{formatEtb(fareEstimate.baseFare)}</span>
          </div>

          {fareEstimate.distanceFare > 0 && (
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">{isAm ? "የኪሎሜትር ዋጋ" : "Distance Rate"}</span>
              <span className="font-semibold">{formatEtb(fareEstimate.distanceFare)}</span>
            </div>
          )}

          {fareEstimate.standbyFee > 0 && (
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">{isAm ? "የመጠባበቂያ ክፍያ" : "Standby Demurrage"}</span>
              <span className="font-semibold">{formatEtb(fareEstimate.standbyFee)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-400 dark:text-slate-500">
            <span className="text-[11px]">{isAm ? "ተ.እ.ታ (15%)" : "VAT (15%)"}</span>
            <span>{formatEtb(fareEstimate.vatAmount)}</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t border-slate-200/80 pt-2 text-[#1C3A34] dark:border-white/10 dark:text-[#eef1f5]">
          <span className="text-xs font-bold">{isAm ? "አጠቃላይ ግምት" : "Estimated Total"}</span>
          <span className="text-base font-extrabold text-[#1C3A34] dark:text-[#C9B87A]">
            {formatEtb(fareEstimate.totalFare)}
          </span>
        </div>
      </div>

      {/* Primary Submit Button */}
      <Button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || !canSubmit}
        className="h-12 w-full gap-2 rounded-2xl bg-[#1C3A34] text-sm font-extrabold text-white shadow-md transition-all hover:bg-[#254b43] active:scale-[0.99] disabled:opacity-50 dark:bg-[#C9B87A] dark:text-[#171a1f] dark:hover:bg-[#d8c98e]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin text-white dark:text-[#171a1f]" />
            {isAm ? "ጥያቄው በመላክ ላይ..." : "Submitting Request..."}
          </>
        ) : (
          submitButtonLabel
        )}
      </Button>

      {/* Encryption Note */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{isAm ? "በተመሰጠረ ደህንነት የተረጋገጠ" : "Encrypted enterprise dispatch"}</span>
      </div>
    </aside>
  );
}
