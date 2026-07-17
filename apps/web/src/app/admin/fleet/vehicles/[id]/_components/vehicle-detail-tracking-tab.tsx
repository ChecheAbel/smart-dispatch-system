"use client";

import dynamic from "next/dynamic";
import { MapPin, Radio, WifiOff } from "lucide-react";
import type { Vehicle } from "@smart-dispatch/types";
import { useVehicleLocation } from "@/hooks/use-vehicle-location";
import { adminCardClass, adminHeadingClass, adminIconBoxClass } from "@/lib/admin-theme";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
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
};

function formatLastUpdated(recordedAt: string) {
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function VehicleDetailTrackingTab({ vehicle }: VehicleDetailTrackingTabProps) {
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
            <h2 className={cn("text-base", adminHeadingClass)}>Live Location Tracking</h2>
            <p className="text-sm text-slate-500">
              Real-time position from the assigned driver&apos;s device.
            </p>
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
            {connected ? "Connected" : "Disconnected"}
          </span>
          {hasLocation ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                isLive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {isLive ? "Live" : "Stale"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Assigned driver</p>
          <p className="mt-1 text-sm font-semibold text-[#1C3A34]">{assignedDriver ?? "Unassigned"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Last update</p>
          <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
            {location ? formatLastUpdated(location.recorded_at) : loading ? "Loading..." : "No location yet"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Speed</p>
          <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
            {location?.speed_kmh != null ? `${location.speed_kmh.toFixed(1)} km/h` : "—"}
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {!assignedDriver && !loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Assign a driver to this vehicle to enable live GPS tracking.
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
      />

      {!hasLocation && !loading ? (
        <p className="text-sm text-slate-500">
          Waiting for the assigned driver to publish a GPS location over the tracking WebSocket.
        </p>
      ) : null}
    </section>
  );
}
