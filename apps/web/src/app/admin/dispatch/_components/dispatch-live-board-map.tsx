"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { AdminDispatchBoardTrip, AdminDispatchBoardVehicle } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import { createMapMarkerIcon } from "@/lib/map/map-marker";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, isValidCoordinatePair } from "@/lib/map/coordinates";
import "@/components/shared/map-marker/map-marker.css";
import "./dispatch-live-board-map.css";

const availableIcon = createMapMarkerIcon("active");
const busyIcon = createMapMarkerIcon("inactive");
const tripIcon = createMapMarkerIcon("dropoff");

type BoardMapVehicle = AdminDispatchBoardVehicle & { live?: boolean };

type DispatchLiveBoardMapProps = {
  trips: AdminDispatchBoardTrip[];
  vehicles: BoardMapVehicle[];
  fitLabel: string;
  onTripClick?: (tripId: string) => void;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function tripLatLng(trip: AdminDispatchBoardTrip) {
  if (!isValidCoordinatePair(trip.pickup_latitude ?? undefined, trip.pickup_longitude ?? undefined)) {
    return null;
  }
  return L.latLng(trip.pickup_latitude as number, trip.pickup_longitude as number);
}

function vehicleLatLng(vehicle: BoardMapVehicle) {
  if (!vehicle.location) {
    return null;
  }
  return L.latLng(vehicle.location.latitude, vehicle.location.longitude);
}

export function DispatchLiveBoardMap({
  trips,
  vehicles,
  fitLabel,
  onTripClick,
}: DispatchLiveBoardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef(false);
  const onTripClickRef = useRef(onTripClick);
  onTripClickRef.current = onTripClick;

  function fitToContent(map: L.Map) {
    const points = [
      ...vehicles.map(vehicleLatLng),
      ...trips.map(tripLatLng),
    ].filter((point): point is L.LatLng => point != null);

    const padding: L.PointExpression = [48, 48];

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding, maxZoom: 14 });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: false });
      return;
    }

    map.setView([DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude], DEFAULT_MAP_ZOOM, {
      animate: false,
    });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude],
      zoom: DEFAULT_MAP_ZOOM,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const invalidate = () => map.invalidateSize();
    requestAnimationFrame(invalidate);
    const invalidateTimer = window.setTimeout(invalidate, 200);
    window.addEventListener("resize", invalidate);

    return () => {
      window.clearTimeout(invalidateTimer);
      window.removeEventListener("resize", invalidate);
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) {
      return;
    }

    layers.clearLayers();

    for (const trip of trips) {
      const point = tripLatLng(trip);
      if (!point) {
        continue;
      }
      const marker = L.marker(point, { icon: tripIcon, keyboard: false })
        .bindPopup(`<strong>${escapeHtml(trip.requester_name)}</strong><br/>${escapeHtml(trip.pickup)}`)
        .addTo(layers);

      marker.on("click", () => {
        onTripClickRef.current?.(trip.id);
      });
    }

    for (const vehicle of vehicles) {
      const point = vehicleLatLng(vehicle);
      if (!point) {
        continue;
      }
      const label = [vehicle.plate_number, vehicle.driver_name].filter(Boolean).join(" · ");
      L.marker(point, {
        icon: vehicle.busy ? busyIcon : availableIcon,
        keyboard: false,
      })
        .bindPopup(`<strong>${escapeHtml(label)}</strong>`)
        .addTo(layers);
    }

    if (!fittedRef.current) {
      fitToContent(map);
      if (trips.length > 0 || vehicles.some((vehicle) => vehicle.location)) {
        fittedRef.current = true;
      }
    }
  }, [trips, vehicles]);

  return (
    <div className="dispatch-live-board-map relative h-full min-h-[20rem] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="absolute left-1/2 top-3 z-[400] -translate-x-1/2 bg-white/95 shadow-sm dark:bg-card"
        onClick={() => {
          if (mapRef.current) {
            fitToContent(mapRef.current);
          }
        }}
        aria-label={fitLabel}
      >
        <Crosshair className="size-3.5" />
      </Button>
    </div>
  );
}
