"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, Clock, Minus, Plus, Route } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  isValidCoordinatePair,
} from "@/lib/map/coordinates";
import {
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  haversineDistanceMeters,
} from "@/lib/map/osrm-route";
import { createMapMarkerIcon, getMapLegendPinHtml } from "@/lib/map/map-marker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/components/shared/map-marker/map-marker.css";
import "./ride-request-route-map.css";

const pickupMarkerIcon = createMapMarkerIcon("active");
const dropoffMarkerIcon = createMapMarkerIcon("dropoff");

type RouteMapPoint = {
  latLng: L.LatLng;
  name: string;
  typeLabel: string;
  kind: "pickup" | "dropoff";
};

type RouteMapStats = {
  distanceMeters: number;
  durationSeconds: number | null;
  isStraightLine: boolean;
};

type RideRequestRouteMapProps = {
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  pickupName: string;
  dropoffName: string;
  pickupTypeLabel: string;
  dropoffTypeLabel: string;
  locale?: string;
  visible?: boolean;
  height?: number;
  className?: string;
  loadingLabel?: string;
  recenterLabel?: string;
  emptyLabel?: string;
  distanceLabel?: string;
  durationLabel?: string;
  straightLineLabel?: string;
  distanceUnitKm?: string;
  distanceUnitM?: string;
};

function getRoutePoints(
  pickupLatitude: number | null | undefined,
  pickupLongitude: number | null | undefined,
  dropoffLatitude: number | null | undefined,
  dropoffLongitude: number | null | undefined,
  pickupName: string,
  dropoffName: string,
  pickupTypeLabel: string,
  dropoffTypeLabel: string,
): RouteMapPoint[] {
  const points: RouteMapPoint[] = [];

  if (isValidCoordinatePair(pickupLatitude ?? undefined, pickupLongitude ?? undefined)) {
    points.push({
      latLng: L.latLng(pickupLatitude!, pickupLongitude!),
      name: pickupName,
      typeLabel: pickupTypeLabel,
      kind: "pickup",
    });
  }

  if (isValidCoordinatePair(dropoffLatitude ?? undefined, dropoffLongitude ?? undefined)) {
    points.push({
      latLng: L.latLng(dropoffLatitude!, dropoffLongitude!),
      name: dropoffName,
      typeLabel: dropoffTypeLabel,
      kind: "dropoff",
    });
  }

  return points;
}

const MAP_FIT_PADDING_TOP_LEFT = L.point(72, 56);
const MAP_FIT_PADDING_BOTTOM_RIGHT = L.point(72, 120);
const DEFAULT_MAP_HEIGHT = 400;

function fitMapToLatLngs(map: L.Map, latLngs: L.LatLng[]) {
  if (latLngs.length > 1) {
    map.fitBounds(L.latLngBounds(latLngs), {
      paddingTopLeft: MAP_FIT_PADDING_TOP_LEFT,
      paddingBottomRight: MAP_FIT_PADDING_BOTTOM_RIGHT,
      maxZoom: 14,
    });
    return;
  }

  if (latLngs.length === 1) {
    map.setView(latLngs[0], 14, { animate: false });
    return;
  }

  map.setView([DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude], DEFAULT_MAP_ZOOM, {
    animate: false,
  });
}

function formatDistanceDisplay(
  meters: number,
  locale: string,
  kmUnit: string,
  mUnit: string,
) {
  if (meters >= 1000) {
    return `${formatRouteDistance(meters, locale)} ${kmUnit}`;
  }

  return `${formatRouteDistance(meters, locale)} ${mUnit}`;
}

function bindLocationPopup(marker: L.Marker, typeLabel: string, name: string, kind: "pickup" | "dropoff") {
  marker.bindPopup(() => {
    const popup = document.createElement("div");
    popup.className = "ride-request-route-map__popup";

    const label = document.createElement("p");
    label.className = cn(
      "ride-request-route-map__popup-type",
      kind === "pickup"
        ? "ride-request-route-map__popup-type--pickup"
        : "ride-request-route-map__popup-type--dropoff",
    );
    label.textContent = typeLabel;

    const title = document.createElement("p");
    title.className = "ride-request-route-map__popup-name";
    title.textContent = name;

    popup.append(label, title);
    return popup;
  });
}

export function RideRequestRouteMap({
  pickupLatitude,
  pickupLongitude,
  dropoffLatitude,
  dropoffLongitude,
  pickupName,
  dropoffName,
  pickupTypeLabel,
  dropoffTypeLabel,
  locale = "en",
  visible = true,
  height = DEFAULT_MAP_HEIGHT,
  className,
  loadingLabel = "Loading map...",
  recenterLabel = "Fit route",
  emptyLabel = "No map coordinates available for this request.",
  distanceLabel = "Distance",
  durationLabel = "Est. drive time",
  straightLineLabel = "Straight-line",
  distanceUnitKm = "km",
  distanceUnitM = "m",
}: RideRequestRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeBoundsRef = useRef<L.LatLng[]>([]);
  const routeFetchIdRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeStats, setRouteStats] = useState<RouteMapStats | null>(null);

  const points = getRoutePoints(
    pickupLatitude,
    pickupLongitude,
    dropoffLatitude,
    dropoffLongitude,
    pickupName,
    dropoffName,
    pickupTypeLabel,
    dropoffTypeLabel,
  );
  const hasPoints = points.length > 0;
  const hasBothPoints = points.length === 2;

  const fitToCurrentRoute = useCallback(
    (map: L.Map, markerPoints: RouteMapPoint[]) => {
      const boundsPoints =
        routeBoundsRef.current.length > 0
          ? routeBoundsRef.current
          : markerPoints.map((point) => point.latLng);
      fitMapToLatLngs(map, boundsPoints);
    },
    [],
  );

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const abortController = new AbortController();

    void (async () => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const fetchId = ++routeFetchIdRef.current;
      const nextPoints = getRoutePoints(
        pickupLatitude,
        pickupLongitude,
        dropoffLatitude,
        dropoffLongitude,
        pickupName,
        dropoffName,
        pickupTypeLabel,
        dropoffTypeLabel,
      );

      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      } else {
        markersLayerRef.current = L.layerGroup().addTo(map);
      }

      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }

      setRouteStats(null);
      routeBoundsRef.current = nextPoints.map((point) => point.latLng);

      for (const point of nextPoints) {
        const marker = L.marker(point.latLng, {
          icon: point.kind === "pickup" ? pickupMarkerIcon : dropoffMarkerIcon,
        });
        bindLocationPopup(marker, point.typeLabel, point.name, point.kind);
        markersLayerRef.current.addLayer(marker);
      }

      if (nextPoints.length === 2) {
        const [pickupPoint, dropoffPoint] = nextPoints;
        setRouteLoading(true);

        try {
          const drivingRoute = await fetchDrivingRoute(
            {
              latitude: pickupPoint.latLng.lat,
              longitude: pickupPoint.latLng.lng,
            },
            {
              latitude: dropoffPoint.latLng.lat,
              longitude: dropoffPoint.latLng.lng,
            },
            abortController.signal,
          );

          if (fetchId !== routeFetchIdRef.current || !mapRef.current) {
            return;
          }

          const routeLatLngs = drivingRoute.path.map((point) =>
            L.latLng(point.latitude, point.longitude),
          );
          routeBoundsRef.current = routeLatLngs;

          routeLineRef.current = L.polyline(routeLatLngs, {
            color: "#1C3A34",
            weight: 4,
            opacity: 0.8,
            lineJoin: "round",
            lineCap: "round",
          }).addTo(map);

          setRouteStats({
            distanceMeters: drivingRoute.distanceMeters,
            durationSeconds: drivingRoute.durationSeconds,
            isStraightLine: false,
          });
        } catch (error) {
          if (abortController.signal.aborted) {
            return;
          }

          if (fetchId !== routeFetchIdRef.current || !mapRef.current) {
            return;
          }

          routeBoundsRef.current = nextPoints.map((point) => point.latLng);
          routeLineRef.current = L.polyline(
            nextPoints.map((point) => point.latLng),
            {
              color: "#1C3A34",
              weight: 3,
              opacity: 0.55,
              dashArray: "8 10",
            },
          ).addTo(map);

          setRouteStats({
            distanceMeters: haversineDistanceMeters(
              {
                latitude: pickupPoint.latLng.lat,
                longitude: pickupPoint.latLng.lng,
              },
              {
                latitude: dropoffPoint.latLng.lat,
                longitude: dropoffPoint.latLng.lng,
              },
            ),
            durationSeconds: null,
            isStraightLine: true,
          });
        } finally {
          if (fetchId === routeFetchIdRef.current) {
            setRouteLoading(false);
          }
        }
      } else {
        setRouteLoading(false);
        setRouteStats(null);
      }

      if (visible && mapRef.current) {
        fitToCurrentRoute(map, nextPoints);
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [
    mapReady,
    dropoffLatitude,
    dropoffLongitude,
    dropoffName,
    dropoffTypeLabel,
    fitToCurrentRoute,
    pickupLatitude,
    pickupLongitude,
    pickupName,
    pickupTypeLabel,
    visible,
    locale,
    distanceUnitKm,
    distanceUnitM,
  ]);

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
      routeFetchIdRef.current += 1;
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      routeLineRef.current = null;
      routeBoundsRef.current = [];
      setMapReady(false);
      setRouteLoading(false);
      setRouteStats(null);
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !visible || !mapReady) {
      return;
    }

    const markerPoints = getRoutePoints(
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      pickupName,
      dropoffName,
      pickupTypeLabel,
      dropoffTypeLabel,
    );

    const timers = [
      window.setTimeout(() => {
        map.invalidateSize({ animate: false });
        fitToCurrentRoute(map, markerPoints);
      }, 150),
      window.setTimeout(() => {
        map.invalidateSize({ animate: false });
        fitToCurrentRoute(map, markerPoints);
      }, 500),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    visible,
    mapReady,
    pickupLatitude,
    pickupLongitude,
    dropoffLatitude,
    dropoffLongitude,
    pickupName,
    pickupTypeLabel,
    dropoffName,
    dropoffTypeLabel,
    fitToCurrentRoute,
  ]);

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

    const markerPoints = getRoutePoints(
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
      pickupName,
      dropoffName,
      pickupTypeLabel,
      dropoffTypeLabel,
    );

    fitToCurrentRoute(map, markerPoints);
  }

  return (
    <div className={cn("ride-request-route-map space-y-2", className)}>
      {hasPoints ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="ride-request-route-map__chip" title={pickupName}>
            <span
              className="inline-flex shrink-0"
              dangerouslySetInnerHTML={{ __html: getMapLegendPinHtml("active") }}
            />
            <span className="max-w-[12rem] truncate sm:max-w-[14rem]">{pickupName}</span>
          </div>
          {hasBothPoints ? (
            <div className="ride-request-route-map__chip" title={dropoffName}>
              <span
                className="inline-flex shrink-0"
                dangerouslySetInnerHTML={{ __html: getMapLegendPinHtml("dropoff") }}
              />
              <span className="max-w-[12rem] truncate sm:max-w-[14rem]">{dropoffName}</span>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecenter}
            disabled={!mapReady || !hasPoints}
            className="h-8 border-slate-200 bg-white text-[#1C3A34] hover:bg-[#f8fafb]"
          >
            <Crosshair className="size-3.5" />
            {recenterLabel}
          </Button>
        </div>
      ) : null}

      <div
        className="ride-request-route-map__canvas relative overflow-hidden rounded-xl border border-slate-200/80 bg-[#e8eef0]"
        style={{ height }}
      >
        <div ref={containerRef} className="absolute inset-0 z-0" aria-label="Ride route map" />

        {!mapReady ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#e8eef0] text-sm text-slate-500">
            {loadingLabel}
          </div>
        ) : null}

        {!hasPoints && mapReady ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#e8eef0]/90 px-6 text-center text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : null}

        {routeLoading && hasBothPoints && mapReady ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#1C3A34]/45 to-transparent px-4 pb-3 pt-8 text-center text-xs font-medium text-white">
            {loadingLabel}
          </div>
        ) : null}

        {routeStats && !routeLoading && hasBothPoints && mapReady ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3">
            <div className="ride-request-route-map__stats">
              <div className="ride-request-route-map__stat">
                <Route className="size-3.5 shrink-0 text-[#C9B87A]" />
                <div className="min-w-0">
                  <p className="ride-request-route-map__stat-label">
                    {routeStats.isStraightLine ? straightLineLabel : distanceLabel}
                  </p>
                  <p className="ride-request-route-map__stat-value">
                    {formatDistanceDisplay(
                      routeStats.distanceMeters,
                      locale,
                      distanceUnitKm,
                      distanceUnitM,
                    )}
                  </p>
                </div>
              </div>
              {routeStats.durationSeconds != null ? (
                <div className="ride-request-route-map__stat">
                  <Clock className="size-3.5 shrink-0 text-[#C9B87A]" />
                  <div className="min-w-0">
                    <p className="ride-request-route-map__stat-label">{durationLabel}</p>
                    <p className="ride-request-route-map__stat-value">
                      {formatRouteDuration(routeStats.durationSeconds, locale)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-3">
          <div className="pointer-events-auto flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleZoomIn}
              disabled={!mapReady || !hasPoints}
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
              disabled={!mapReady || !hasPoints}
              className="size-9 border-slate-200 bg-white/95 text-[#1C3A34] shadow-sm backdrop-blur hover:bg-white"
              aria-label="Zoom out"
            >
              <Minus className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
