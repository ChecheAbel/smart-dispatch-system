"use client";

import dynamic from "next/dynamic";
import { MapPin, Radio, WifiOff } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
import { useVehicleLocation } from "@/hooks/use-vehicle-location";
import type { SupportedLocale } from "@/lib/locale";
import { adminCardClass, adminHeadingClass, adminIconBoxClass } from "@/lib/admin-theme";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import { formatGlobalDateTime } from "@/lib/ethiopian-calendar";
import { getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";

const LazyVehicleLiveMap = dynamic(
  () => import("@/components/book/vehicle-live-map").then((mod) => mod.VehicleLiveMap),
  { ssr: false },
);

const DEFAULT_CENTER = {
  latitude: 9.0105,
  longitude: 38.7612,
};

type VehicleDetailTrackingTabProps = {
  vehicle: Vehicle;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  locale: SupportedLocale;
};

function formatLastUpdated(recordedAt: string, locale: SupportedLocale, unknownLabel: string) {
  const formatted = formatGlobalDateTime(recordedAt, locale);
  return formatted === "—" ? unknownLabel : formatted;
}

export function VehicleDetailTrackingTab({ vehicle, detail, locale }: VehicleDetailTrackingTabProps) {
  const tracking = detail.tracking;
  const { location, connected, loading, error, isLive } = useVehicleLocation(vehicle.id);
  const hasLocation = Boolean(location);
  const assignedDriver = vehicle.assigned_driver?.name;
  const popupImageUrl = vehicle.images?.[0]
    ? getVehiclePhotoUrl(vehicle.images[0])
    : null;

  return (
    <section className={cn(adminCardClass, "space-y-4 rounded-2xl p-4 text-left sm:space-y-5 sm:p-5 lg:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={adminIconBoxClass}>
            <MapPin className="size-4 text-[#8f7d45] animate-bounce" />
          </div>
          <div>
            <h2 className={cn("text-base", adminHeadingClass)}>{tracking.title}</h2>
            <p className="text-sm text-slate-500">{tracking.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              connected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            <Radio className="size-3.5" />
            {connected ? tracking.connected : tracking.disconnected}
          </span>
          {hasLocation ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                isLive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {isLive ? tracking.live : tracking.stale}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {tracking.assignedDriver}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
            {assignedDriver ?? detail.overview.unassigned}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {tracking.lastUpdate}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
            {location
              ? formatLastUpdated(location.recorded_at, locale, tracking.unknownTime)
              : loading
                ? detail.loading
                : tracking.noLocationYet}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {tracking.speed}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
            {location?.speed_kmh != null ? `${location.speed_kmh.toFixed(1)} km/h` : "—"}
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">{tracking.errorTitle}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200/75">
              {hasLocation ? tracking.errorWithLocation : tracking.errorWithoutLocation}
            </p>
          </div>
        </div>
      ) : null}

      {!assignedDriver && !loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {tracking.unassignedHint}
        </div>
      ) : null}

      <LazyVehicleLiveMap
        latitude={location?.latitude ?? DEFAULT_CENTER.latitude}
        longitude={location?.longitude ?? DEFAULT_CENTER.longitude}
        popupText={`${vehicle.make ?? ""} ${vehicle.model ?? ""} (${vehicle.plate_number})`.trim()}
        popupImageUrl={popupImageUrl}
        height={380}
        showMarker={hasLocation}
        lastUpdatedAt={location?.recorded_at ?? null}
        locale={locale}
        ariaLabels={{
          recenter: tracking.mapRecenter,
          zoomIn: tracking.mapZoomIn,
          zoomOut: tracking.mapZoomOut,
        }}
      />

      {!hasLocation && !loading ? (
        <p className="text-sm text-slate-500">{tracking.waitingForGps}</p>
      ) : null}
    </section>
  );
}
