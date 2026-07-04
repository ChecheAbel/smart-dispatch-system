"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { Location } from "@smart-dispatch/types";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/map/coordinates";
import { createMapMarkerIcon, getMapLegendPinHtml } from "@/lib/map/map-marker";
import {
  buildLocationMapPopupHtml,
  LOCATION_MAP_POPUP_OPTIONS,
  type LocationMapPopupLabels,
} from "@/lib/map/location-map-popup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/components/shared/map-marker/map-marker.css";
import "./locations-map.css";

const markerIcon = createMapMarkerIcon("active");
const inactiveMarkerIcon = createMapMarkerIcon("inactive");

type LocationsMapProps = {
  locations: Location[];
  visible?: boolean;
  height?: number;
  className?: string;
  loadingLabel?: string;
  recenterLabel?: string;
  popupLabels: LocationMapPopupLabels;
};

function getLocationLatLng(location: Location) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return L.latLng(latitude, longitude);
}

function getValidLocations(locations: Location[]) {
  return locations
    .map((location) => {
      const latLng = getLocationLatLng(location);
      return latLng ? { location, latLng } : null;
    })
    .filter((entry): entry is { location: Location; latLng: L.LatLng } => entry !== null);
}

function fitMapToLocations(map: L.Map, entries: ReturnType<typeof getValidLocations>) {
  const bounds = entries.map((entry) => entry.latLng);

  if (bounds.length > 1) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [56, 56], maxZoom: 15 });
    return;
  }

  if (bounds.length === 1) {
    map.setView(bounds[0], 15, { animate: false });
    return;
  }

  map.setView([DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude], DEFAULT_MAP_ZOOM, {
    animate: false,
  });
}

export function LocationsMap({
  locations,
  visible = true,
  height = 520,
  className,
  loadingLabel = "Loading map...",
  recenterLabel = "Fit all",
  popupLabels,
}: LocationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const validEntries = getValidLocations(locations);
  const activeCount = validEntries.filter((entry) => entry.location.is_active).length;
  const inactiveCount = validEntries.length - activeCount;

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const entries = getValidLocations(locations);

    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    } else {
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    for (const { location, latLng } of entries) {
      const marker = L.marker(latLng, {
        icon: location.is_active ? markerIcon : inactiveMarkerIcon,
      });
      marker.bindPopup(buildLocationMapPopupHtml(location, popupLabels), LOCATION_MAP_POPUP_OPTIONS);
      markersLayerRef.current.addLayer(marker);
    }

    if (visible) {
      fitMapToLocations(map, entries);
    }
  }, [locations, visible, popupLabels]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude],
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    syncMarkers();
  }, [mapReady, syncMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !visible || !mapReady) {
      return;
    }

    const timers = [
      window.setTimeout(() => {
        map.invalidateSize({ animate: false });
        fitMapToLocations(map, getValidLocations(locations));
      }, 150),
      window.setTimeout(() => {
        map.invalidateSize({ animate: false });
        fitMapToLocations(map, getValidLocations(locations));
      }, 500),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [visible, mapReady, locations]);

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

    fitMapToLocations(map, getValidLocations(locations));
  }

  return (
    <div className={cn("locations-map relative bg-[#e8eef0]", className)} style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 z-0" aria-label="Locations map" />

      {!mapReady ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#e8eef0] text-sm text-slate-500">
          {loadingLabel}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="locations-map__chip">
            <span
              className="inline-flex shrink-0"
              dangerouslySetInnerHTML={{ __html: getMapLegendPinHtml("active") }}
            />
            {popupLabels.active} ({activeCount})
          </div>
          <div className="locations-map__chip">
            <span
              className="inline-flex shrink-0"
              dangerouslySetInnerHTML={{ __html: getMapLegendPinHtml("inactive") }}
            />
            {popupLabels.inactive} ({inactiveCount})
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecenter}
            disabled={!mapReady || validEntries.length === 0}
            className="h-8 border-slate-200 bg-white/95 text-[#1C3A34] shadow-sm backdrop-blur hover:bg-white"
          >
            <Crosshair className="size-3.5" />
            {recenterLabel}
          </Button>
        </div>

        <div className="pointer-events-auto flex flex-col gap-1.5">
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
  );
}
