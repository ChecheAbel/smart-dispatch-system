"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import type { Location } from "@smart-dispatch/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatMessage, getAdminLocationsMessages } from "@/translations";
import { fetchAllLocations } from "@/lib/location-api";
import type { SupportedLocale } from "@/lib/locale";

const LazyLocationsMap = dynamic(
  () => import("./locations-map").then((mod) => mod.LocationsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] animate-pulse items-center justify-center bg-[#e8eef0] text-sm text-slate-500">
        Loading map...
      </div>
    ),
  },
);

type LocationsMapDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: SupportedLocale;
  refreshKey: number;
};

export function LocationsMapDialog({
  open,
  onOpenChange,
  locale,
  refreshKey,
}: LocationsMapDialogProps) {
  const copy = getAdminLocationsMessages(locale);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadLocations() {
      setLoading(true);
      setLoadFailed(false);

      try {
        const data = await fetchAllLocations({ locale });
        if (!cancelled) {
          setLocations(data);
        }
      } catch {
        if (!cancelled) {
          setLocations([]);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLocations();

    return () => {
      cancelled = true;
    };
  }, [open, locale, refreshKey]);

  const description = loading
    ? copy.mapView.loading
    : loadFailed
      ? copy.mapView.loadFailed
      : formatMessage(copy.mapView.description, { count: locations.length });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden border-[#C9B87A]/30 bg-white p-0 sm:max-w-5xl [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10"
        showCloseButton
      >
        <DialogHeader className="space-y-3 border-b border-[#C9B87A]/25 bg-[#1C3A34] px-5 py-4 text-left sm:px-6">
          <Badge
            className="w-fit border-[#C9B87A]/40 bg-[#C9B87A]/15 text-[#e8d69a] hover:bg-[#C9B87A]/15"
          >
            {copy.eyebrow}
          </Badge>
          <div className="flex items-start gap-3 pr-6">
            <div className="rounded-lg bg-[#C9B87A]/15 p-2 text-[#C9B87A]">
              <Map className="size-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                {copy.mapView.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#C9B87A]/80">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex h-[520px] items-center justify-center bg-[#e8eef0] text-sm text-slate-500">
            {copy.mapView.loading}
          </div>
        ) : loadFailed ? (
          <div className="flex h-[360px] flex-col items-center justify-center gap-2 bg-[#f8fafb] px-6 text-center">
            <p className="text-sm font-medium text-[#1C3A34]">{copy.mapView.loadFailed}</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="flex h-[360px] flex-col items-center justify-center gap-2 bg-[#f8fafb] px-6 text-center">
            <p className="text-sm font-medium text-[#1C3A34]">{copy.mapView.empty}</p>
            <p className="max-w-sm text-sm text-slate-500">{copy.mapView.emptyDescription}</p>
          </div>
        ) : open ? (
          <LazyLocationsMap
            key={`locations-map-${refreshKey}-${locations.length}`}
            locations={locations}
            visible={open}
            loadingLabel={copy.mapView.loading}
            recenterLabel={copy.mapView.recenter}
            popupLabels={{
              eyebrow: copy.mapView.popup.eyebrow,
              active: copy.status.active,
              inactive: copy.status.inactive,
              region: copy.mapView.popup.region,
              address: copy.mapView.popup.address,
              coordinates: copy.mapView.popup.coordinates,
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
