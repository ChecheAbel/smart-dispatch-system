"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import { Crosshair, MapPin, Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  formatCoordinatePair,
  isValidCoordinatePair,
} from "@/lib/map/coordinates";
import { adminHeadingClass } from "@/lib/admin-theme";
import { createMapMarkerIcon } from "@/lib/map/map-marker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/components/shared/map-marker/map-marker.css";
import "./coordinate-map-picker.css";

const markerIcon = createMapMarkerIcon("active");

export type CoordinateMapPickerProps = {
  latitude?: number;
  longitude?: number;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
  visible?: boolean;
  height?: number;
  defaultCenter?: {
    latitude: number;
    longitude: number;
  };
  defaultZoom?: number;
  className?: string;
  title?: string;
  hint?: string;
  loadingLabel?: string;
  emptyLabel?: string;
  recenterLabel?: string;
};

function attachMarker(
  map: L.Map,
  markerRef: MutableRefObject<L.Marker | null>,
  latLng: L.LatLng,
  onChange: (latitude: number, longitude: number) => void,
  skipExternalSyncRef: MutableRefObject<boolean>,
) {
  if (markerRef.current) {
    markerRef.current.setLatLng(latLng);
    return markerRef.current;
  }

  const marker = L.marker(latLng, {
    draggable: true,
    icon: markerIcon,
  }).addTo(map);

  marker.on("dragend", () => {
    const position = marker.getLatLng();
    skipExternalSyncRef.current = true;
    onChange(position.lat, position.lng);
  });

  markerRef.current = marker;
  return marker;
}

export function CoordinateMapPicker({
  latitude,
  longitude,
  onCoordinatesChange,
  visible = true,
  height = 300,
  defaultCenter = DEFAULT_MAP_CENTER,
  defaultZoom = DEFAULT_MAP_ZOOM,
  className,
  title = "Map picker",
  hint,
  loadingLabel = "Loading map...",
  emptyLabel = "No location selected",
  recenterLabel = "Recenter",
}: CoordinateMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onCoordinatesChange);
  const skipExternalSyncRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  onChangeRef.current = onCoordinatesChange;

  const hasCoordinates = isValidCoordinatePair(latitude, longitude);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [defaultCenter.latitude, defaultCenter.longitude],
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (event) => {
      attachMarker(map, markerRef, event.latlng, onChangeRef.current, skipExternalSyncRef);
      skipExternalSyncRef.current = true;
      onChangeRef.current(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    setMapReady(true);

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
      const target = isValidCoordinatePair(latitude, longitude)
        ? L.latLng(latitude!, longitude!)
        : L.latLng(defaultCenter.latitude, defaultCenter.longitude);
      map.setView(target, defaultZoom, { animate: false });
    }, 200);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [defaultCenter.latitude, defaultCenter.longitude, defaultZoom, latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !visible) {
      return;
    }

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
      const target = hasCoordinates
        ? L.latLng(latitude!, longitude!)
        : L.latLng(defaultCenter.latitude, defaultCenter.longitude);
      map.setView(target, hasCoordinates ? Math.max(map.getZoom(), 15) : defaultZoom, {
        animate: false,
      });
    }, 200);

    return () => {
      window.clearTimeout(resizeTimer);
    };
  }, [visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }

    if (!hasCoordinates) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const latLng = L.latLng(latitude!, longitude!);
    attachMarker(map, markerRef, latLng, onChangeRef.current, skipExternalSyncRef);

    if (!visible) {
      return;
    }

    const currentCenter = map.getCenter();
    const distance = currentCenter.distanceTo(latLng);
    if (distance > 500) {
      map.setView(latLng, Math.max(map.getZoom(), 15), { animate: true });
    }
  }, [latitude, longitude, visible, hasCoordinates]);

  function handleZoomIn() {
    mapRef.current?.zoomIn();
  }

  function handleZoomOut() {
    mapRef.current?.zoomOut();
  }

  function handleRecenter() {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (hasCoordinates) {
      map.setView([latitude!, longitude!], Math.max(map.getZoom(), 15), { animate: true });
      return;
    }

    map.setView([defaultCenter.latitude, defaultCenter.longitude], defaultZoom, {
      animate: true,
    });
  }

  return (
    <div className={cn("coordinate-map-picker space-y-2", className)}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/60">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-[#f8fafb]/90 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="rounded-lg bg-[#1C3A34]/8 p-2 text-[#1C3A34]">
              <MapPin className="size-4" />
            </div>
            <div className="min-w-0">
              <p className={cn("truncate text-sm font-semibold", adminHeadingClass)}>{title}</p>
              {hasCoordinates ? (
                <p className="truncate font-mono text-xs text-[#8f7d45]">
                  {formatCoordinatePair(latitude!, longitude!)}
                </p>
              ) : (
                <p className="truncate text-xs text-slate-500">{emptyLabel}</p>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecenter}
            disabled={!mapReady}
            className="shrink-0 border-slate-200 bg-white text-[#1C3A34] hover:bg-[#f8fafb]"
          >
            <Crosshair className="size-3.5" />
            {recenterLabel}
          </Button>
        </div>

        <div className="relative bg-[#e8eef0]" style={{ height }}>
          <div ref={containerRef} className="absolute inset-0 z-0" aria-label={hint || title} />

          {!mapReady ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#e8eef0] text-sm text-slate-500">
              {loadingLabel}
            </div>
          ) : null}

          {!hasCoordinates && mapReady ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#1C3A34]/55 to-transparent px-4 pb-4 pt-10">
              <p className="text-center text-sm font-medium text-white">{emptyLabel}</p>
            </div>
          ) : null}

          <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleZoomIn}
              disabled={!mapReady}
              className="size-9 border-slate-200 bg-white/95 text-[#1C3A34] shadow-sm backdrop-blur hover:bg-white"
              aria-label="Zoom in"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleZoomOut}
              disabled={!mapReady}
              className="size-9 border-slate-200 bg-white/95 text-[#1C3A34] shadow-sm backdrop-blur hover:bg-white"
              aria-label="Zoom out"
            >
              <Minus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}
