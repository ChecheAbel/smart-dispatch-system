"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, MapPin, Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { createMapMarkerIcon } from "@/lib/map/map-marker";
import { Button } from "@/components/ui/button";
import "@/components/shared/map-marker/map-marker.css";

const markerIcon = createMapMarkerIcon("active");

export type VehicleLiveMapProps = {
  latitude: number;
  longitude: number;
  popupText: string;
  height?: number;
};

export function VehicleLiveMap({
  latitude,
  longitude,
  popupText,
  height = 380,
}: VehicleLiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([latitude, longitude], {
      icon: markerIcon,
    }).addTo(map);

    marker.bindPopup(`<strong style="color: #1C3A34;">${popupText}</strong>`).openPopup();

    mapRef.current = map;
    markerRef.current = marker;
    setMapReady(true);

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [latitude, longitude, popupText]);

  function handleZoomIn() {
    mapRef.current?.zoomIn();
  }

  function handleZoomOut() {
    mapRef.current?.zoomOut();
  }

  function handleRecenter() {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 14, { animate: true });
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#e8eef0] shadow-sm" style={{ height: `${height}px` }}>
      {/* Map Element */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Floating Controls (Top Right) */}
      {mapReady && (
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleRecenter}
            className="size-9 border-slate-200 bg-white/95 text-[#1C3A34] shadow-md backdrop-blur hover:bg-white flex items-center justify-center rounded-lg"
            aria-label="Recenter"
          >
            <Crosshair className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleZoomIn}
            className="size-9 border-slate-200 bg-white/95 text-[#1C3A34] shadow-md backdrop-blur hover:bg-white flex items-center justify-center rounded-lg"
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleZoomOut}
            className="size-9 border-slate-200 bg-white/95 text-[#1C3A34] shadow-md backdrop-blur hover:bg-white flex items-center justify-center rounded-lg"
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </Button>
        </div>
      )}

      {/* Floating Coordinates Pill (Bottom Left) */}
      {mapReady && (
        <div className="absolute left-3 bottom-3 z-20 rounded-lg bg-[#1C3A34]/90 px-3 py-1.5 text-xs text-white shadow-md backdrop-blur flex items-center gap-1.5">
          <MapPin className="size-3.5 text-[#C9B87A] animate-pulse" />
          <span className="font-mono">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
        </div>
      )}
    </div>
  );
}
