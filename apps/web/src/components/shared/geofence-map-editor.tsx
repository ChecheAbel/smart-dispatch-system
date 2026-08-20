"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, Eraser, Minus, Plus, Undo2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { GeofenceCoordinate, GeofenceKind, GeofenceShape } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER: GeofenceCoordinate = {
  latitude: 9.0105,
  longitude: 38.7612,
};

export type GeofenceMapEditorValue = {
  center: GeofenceCoordinate | null;
  radiusM: number;
  coordinates: GeofenceCoordinate[];
};

type GeofenceMapEditorLabels = {
  clickForCenter: string;
  clickForVertex: string;
  radius: string;
  undoPoint: string;
  clearPoints: string;
  recenter: string;
  zoomIn: string;
  zoomOut: string;
};

type GeofenceMapEditorProps = {
  shape: GeofenceShape;
  kind: GeofenceKind;
  value: GeofenceMapEditorValue;
  onChange?: (value: GeofenceMapEditorValue) => void;
  height?: number;
  showHint?: boolean;
  readOnly?: boolean;
  labels: GeofenceMapEditorLabels;
};

function fenceStyle(kind: GeofenceKind) {
  if (kind === "restricted") {
    return {
      color: "#dc2626",
      fillColor: "#ef4444",
      fillOpacity: 0.18,
      weight: 2,
    };
  }

  return {
    color: "#059669",
    fillColor: "#10b981",
    fillOpacity: 0.18,
    weight: 2,
  };
}

export function GeofenceMapEditor({
  shape,
  kind,
  value,
  onChange,
  height = 320,
  showHint = true,
  readOnly = false,
  labels,
}: GeofenceMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const shapeRef = useRef(shape);
  const readOnlyRef = useRef(readOnly);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    shapeRef.current = shape;
  }, [shape]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const initial = value.center ?? value.coordinates[0] ?? DEFAULT_CENTER;

    const map = L.map(containerRef.current, {
      center: [initial.latitude, initial.longitude],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    mapRef.current = map;
    setMapReady(true);

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (readOnlyRef.current || !onChangeRef.current) {
        return;
      }

      const point = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      };
      const current = valueRef.current;

      if (shapeRef.current === "circle") {
        onChangeRef.current({
          ...current,
          center: point,
        });
        return;
      }

      onChangeRef.current({
        ...current,
        coordinates: [...current.coordinates, point],
      });
    });

    const resizeTimer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    const style = fenceStyle(kind);

    if (shape === "circle" && value.center && value.radiusM > 0) {
      const circle = L.circle([value.center.latitude, value.center.longitude], {
        radius: value.radiusM,
        ...style,
      }).addTo(layer);
      L.circleMarker([value.center.latitude, value.center.longitude], {
        radius: 5,
        color: style.color,
        fillColor: "#fff",
        fillOpacity: 1,
        weight: 2,
      }).addTo(layer);
      if (readOnly) {
        map.fitBounds(circle.getBounds(), { padding: [28, 28], maxZoom: 16 });
      }
    }

    if (shape === "polygon") {
      value.coordinates.forEach((point) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: 5,
          color: style.color,
          fillColor: "#fff",
          fillOpacity: 1,
          weight: 2,
        }).addTo(layer);
      });

      if (value.coordinates.length >= 2) {
        const latlngs = value.coordinates.map(
          (point) => [point.latitude, point.longitude] as L.LatLngExpression,
        );
        if (value.coordinates.length >= 3) {
          const polygon = L.polygon(latlngs, style).addTo(layer);
          if (readOnly) {
            map.fitBounds(polygon.getBounds(), { padding: [28, 28], maxZoom: 16 });
          }
        } else {
          L.polyline(latlngs, { color: style.color, weight: 2 }).addTo(layer);
        }
      }
    }
  }, [kind, readOnly, shape, value.center, value.coordinates, value.radiusM]);

  function handleUndoPoint() {
    onChange?.({
      ...value,
      coordinates: value.coordinates.slice(0, -1),
    });
  }

  function handleClearPoints() {
    onChange?.({
      ...value,
      coordinates: [],
      center: shape === "circle" ? null : value.center,
    });
  }

  function handleRecenter() {
    const map = mapRef.current;
    if (!map) return;

    if (shape === "circle" && value.center && value.radiusM > 0) {
      const circle = L.circle([value.center.latitude, value.center.longitude], {
        radius: value.radiusM,
      });
      map.fitBounds(circle.getBounds(), { padding: [28, 28], maxZoom: 16, animate: true });
      return;
    }

    if (shape === "polygon" && value.coordinates.length >= 3) {
      const latlngs = value.coordinates.map(
        (point) => [point.latitude, point.longitude] as L.LatLngExpression,
      );
      map.fitBounds(L.polygon(latlngs).getBounds(), {
        padding: [28, 28],
        maxZoom: 16,
        animate: true,
      });
      return;
    }

    const target = value.center ?? value.coordinates[value.coordinates.length - 1] ?? DEFAULT_CENTER;
    map.setView([target.latitude, target.longitude], 14, { animate: true });
  }

  return (
    <div className="space-y-4">
      {!readOnly && showHint ? (
        <p className="text-sm text-slate-500">
          {shape === "circle" ? labels.clickForCenter : labels.clickForVertex}
        </p>
      ) : null}

      {!readOnly && shape === "circle" ? (
        <div className="space-y-2.5">
          <Label htmlFor="geofence-radius">{labels.radius}</Label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={50}
              max={5000}
              step={10}
              value={value.radiusM}
              onChange={(event) =>
                onChange?.({
                  ...value,
                  radiusM: Number(event.target.value),
                })
              }
              className="h-2 w-full accent-[#1C3A34]"
            />
            <Input
              id="geofence-radius"
              type="number"
              min={1}
              className="w-28 shrink-0"
              value={value.radiusM}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next) || next <= 0) return;
                onChange?.({ ...value, radiusM: Math.round(next) });
              }}
            />
          </div>
        </div>
      ) : null}

      {!readOnly && shape === "polygon" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndoPoint}
            disabled={value.coordinates.length === 0}
          >
            <Undo2 className="mr-1.5 size-3.5" />
            {labels.undoPoint}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearPoints}
            disabled={value.coordinates.length === 0}
          >
            <Eraser className="mr-1.5 size-3.5" />
            {labels.clearPoints}
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-slate-200 bg-[#e8eef0] shadow-sm",
        )}
        style={{ height: `${height}px` }}
      >
        <div ref={containerRef} className="absolute inset-0 z-0" />
        {mapReady ? (
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleRecenter}
              className="size-9 border-slate-200 bg-white/95 shadow-md"
              aria-label={labels.recenter}
            >
              <Crosshair className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => mapRef.current?.zoomIn()}
              className="size-9 border-slate-200 bg-white/95 shadow-md"
              aria-label={labels.zoomIn}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => mapRef.current?.zoomOut()}
              className="size-9 border-slate-200 bg-white/95 shadow-md"
              aria-label={labels.zoomOut}
            >
              <Minus className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
