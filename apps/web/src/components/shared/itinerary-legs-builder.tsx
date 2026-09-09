"use client";

import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import type { CreateRideRequestLegInput, RideRequestLocationOption } from "@smart-dispatch/types";
import { isValidCoordinatePair } from "@/lib/map/coordinates";
import { Button } from "@/components/ui/button";
import {
  ItineraryStopCard,
  type ItineraryStopItem,
} from "./itinerary-stop-card";

export type { ItineraryStopItem };

interface ItineraryLegsBuilderProps {
  stops: ItineraryStopItem[];
  onChange: (stops: ItineraryStopItem[]) => void;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoordinates?: { latitude?: number | null; longitude?: number | null };
  dropoffCoordinates?: { latitude?: number | null; longitude?: number | null };
  savedLocations?: RideRequestLocationOption[];
  locale?: string;
  disabled?: boolean;
}

export function ItineraryLegsBuilder({
  stops,
  onChange,
  pickupAddress,
  dropoffAddress,
  pickupCoordinates,
  dropoffCoordinates,
  savedLocations = [],
  locale = "en",
  disabled = false,
}: ItineraryLegsBuilderProps) {
  const isAm = locale === "am";

  const addStop = () => {
    const newStop: ItineraryStopItem = {
      id: `stop-${Date.now()}`,
      address: "",
      locationId: null,
      latitude: null,
      longitude: null,
      useCustom: savedLocations.length === 0,
      plannedWaitMinutes: 30,
      stopPurpose: "meeting",
    };
    onChange([...stops, newStop]);
  };

  const removeStop = (index: number) => {
    onChange(stops.filter((_, i) => i !== index));
  };

  const updateStop = (index: number, patch: Partial<ItineraryStopItem>) => {
    const next = [...stops];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  };

  const moveStop = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    const next = [...stops];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.02]">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-[#1C3A34] dark:text-[#eef1f5]">
            {isAm ? "ባለብዙ-ምዕራፍ የጉዞ መስመር (Multi-Stop Itinerary)" : "Multi-Leg Itinerary & Waypoints"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAm
              ? "የተቀመጡ ወይም ብጁ ማረፊያዎችን፣ ስብሰባዎችን እና የቆይታ ጊዜዎችን ይጨምሩ"
              : "Add intermediate waypoints from saved locations or pin custom addresses on the map"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStop}
          disabled={disabled}
          className="h-8 gap-1.5 rounded-xl border-[#C9B87A]/40 text-xs font-bold text-[#1C3A34] hover:bg-[#C9B87A]/10 dark:border-white/20 dark:text-[#d8c77f] dark:hover:bg-white/10"
        >
          <Plus className="size-3.5" />
          {isAm ? "ማረፊያ ጨምር" : "Add Stop"}
        </Button>
      </div>

      <div className="relative space-y-3 pl-6">
        <div className="absolute top-3.5 bottom-3.5 left-2.5 w-0.5 bg-gradient-to-b from-emerald-500 via-[#C9B87A] to-sky-500" />

        {/* Origin / Start */}
        <div className="relative flex flex-col gap-0.5 text-xs">
          <span className="absolute -left-6 top-0 flex size-5 items-center justify-center rounded-full bg-emerald-500 font-bold text-white shadow-xs text-[10px]">
            A
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isAm ? "መነሻ፡" : "Start:"}
            </span>
            <span className="truncate text-slate-600 dark:text-slate-300">
              {pickupAddress || (isAm ? "ያልተመረጠ" : "Select pickup location")}
            </span>
          </div>
          {isValidCoordinatePair(pickupCoordinates?.latitude ?? undefined, pickupCoordinates?.longitude ?? undefined) && (
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              {pickupCoordinates?.latitude?.toFixed(5)}, {pickupCoordinates?.longitude?.toFixed(5)}
            </p>
          )}
        </div>

        {/* Intermediate Stops */}
        <AnimatePresence mode="popLayout">
          {stops.map((stop, index) => (
            <ItineraryStopCard
              key={stop.id}
              stop={stop}
              index={index}
              totalStops={stops.length}
              savedLocations={savedLocations}
              onUpdate={(patch) => updateStop(index, patch)}
              onRemove={() => removeStop(index)}
              onMove={(direction) => moveStop(index, direction)}
              locale={locale}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>

        {/* Final Destination */}
        <div className="relative flex flex-col gap-0.5 text-xs">
          <span className="absolute -left-6 top-0 flex size-5 items-center justify-center rounded-full bg-sky-500 font-bold text-white shadow-xs text-[10px]">
            {String.fromCharCode(66 + stops.length)}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isAm ? "መድረሻ፡" : "Final Drop-off:"}
            </span>
            <span className="truncate text-slate-600 dark:text-slate-300">
              {dropoffAddress || (isAm ? "ያልተመረጠ" : "Select drop-off location")}
            </span>
          </div>
          {isValidCoordinatePair(dropoffCoordinates?.latitude ?? undefined, dropoffCoordinates?.longitude ?? undefined) && (
            <p className="text-[10px] text-sky-600 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 inline-block" />
              {dropoffCoordinates?.latitude?.toFixed(5)}, {dropoffCoordinates?.longitude?.toFixed(5)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function convertStopsToLegsPayload(
  pickupAddress: string,
  dropoffAddress: string,
  stops: ItineraryStopItem[],
  pickupCoords?: { latitude?: number | null; longitude?: number | null },
  dropoffCoords?: { latitude?: number | null; longitude?: number | null },
): CreateRideRequestLegInput[] {
  if (stops.length === 0) return [];

  const points = [
    { address: pickupAddress, ...pickupCoords, plannedWaitMinutes: 0, stopPurpose: "origin" },
    ...stops,
    { address: dropoffAddress, ...dropoffCoords, plannedWaitMinutes: 0, stopPurpose: "destination" },
  ];

  const legs: CreateRideRequestLegInput[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    legs.push({
      sequence_order: i + 1,
      pickup_address: current.address,
      pickup_latitude: current.latitude ?? null,
      pickup_longitude: current.longitude ?? null,
      dropoff_address: next.address,
      dropoff_latitude: next.latitude ?? null,
      dropoff_longitude: next.longitude ?? null,
      planned_wait_minutes: current.plannedWaitMinutes ?? 0,
      stop_purpose: current.stopPurpose ?? null,
    });
  }

  return legs;
}
