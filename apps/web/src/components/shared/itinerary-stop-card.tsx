"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Clock, MapPin, Trash2 } from "lucide-react";
import type { RideRequestLocationOption } from "@smart-dispatch/types";
import type { CoordinateMapPickerProps } from "@/components/shared/coordinate-map-picker/coordinate-map-picker";
import { DEFAULT_MAP_CENTER, isValidCoordinatePair } from "@/lib/map/coordinates";
import { buildLocationAddress } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { LocationModeSwitch } from "@/components/shared/location-mode-switch";
import { AdminSelectField, AdminTextField } from "@/components/shared/admin-form-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LazyCoordinateMapPicker = dynamic<CoordinateMapPickerProps>(
  () =>
    import("@/components/shared/coordinate-map-picker/coordinate-map-picker").then(
      (mod) => mod.CoordinateMapPicker,
    ),
  { ssr: false },
);

export interface ItineraryStopItem {
  id: string;
  address: string;
  locationId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  useCustom?: boolean;
  plannedWaitMinutes: number;
  stopPurpose: string;
}

export const STOP_PURPOSES = [
  { value: "meeting", labelEn: "Meeting / Discussion", labelAm: "ስብሰባ / ውይይት" },
  { value: "check_in", labelEn: "Hotel Check-in / Protocol", labelAm: "ሆቴል መግቢያ / ፕሮቶኮል" },
  { value: "site_visit", labelEn: "Site Inspection / Audit", labelAm: "የስራ ጉብኝት / ቁጥጥር" },
  { value: "boarding", labelEn: "Passenger Boarding", labelAm: "ተሳፋሪ መጫን" },
  { value: "layover", labelEn: "Layover / Standby", labelAm: "እረፍት / መጠበቂያ" },
];

interface ItineraryStopCardProps {
  stop: ItineraryStopItem;
  index: number;
  totalStops: number;
  savedLocations?: RideRequestLocationOption[];
  onUpdate: (patch: Partial<ItineraryStopItem>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  locale?: string;
  disabled?: boolean;
}

export function ItineraryStopCard({
  stop,
  index,
  totalStops,
  savedLocations = [],
  onUpdate,
  onRemove,
  onMove,
  locale = "en",
  disabled = false,
}: ItineraryStopCardProps) {
  const isAm = locale === "am";
  const stopLetter = String.fromCharCode(66 + index);
  const showCustom = stop.useCustom || savedLocations.length === 0;

  const locationItems = savedLocations.map((loc) => ({
    label: loc.name,
    value: loc.id,
  }));

  const purposeOptions = useMemo(
    () =>
      STOP_PURPOSES.map((p) => ({
        value: p.value,
        label: isAm ? p.labelAm : p.labelEn,
      })),
    [isAm],
  );

  const handleSelectSavedLocation = (locationId: string) => {
    const loc = savedLocations.find((entry) => entry.id === locationId);
    if (loc) {
      onUpdate({
        locationId: loc.id,
        address: buildLocationAddress(loc),
        latitude: loc.latitude,
        longitude: loc.longitude,
        useCustom: false,
      });
    }
  };

  const handleToggleMode = (useCustom: boolean) => {
    onUpdate({ useCustom, locationId: useCustom ? null : "", address: "", latitude: null, longitude: null });
  };

  return (
    <motion.div
      key={stop.id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171c24]"
    >
      <span className="absolute -left-6 top-4 flex size-5 items-center justify-center rounded-full bg-[#C9B87A] font-bold text-[#1C3A34] shadow-xs text-[10px]">
        {stopLetter}
      </span>

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[#C9B87A]/15 p-1.5 text-[#1C3A34] dark:bg-[#C9B87A]/20 dark:text-[#d8c77f]">
            <MapPin className="size-3.5" />
          </div>
          <span className="text-xs font-bold text-[#1C3A34] dark:text-[#eef1f5]">
            {isAm ? `ማረፊያ ${index + 1}` : `Intermediate Stop ${index + 1}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {savedLocations.length > 0 ? (
            <LocationModeSwitch
              savedLabel={isAm ? "የተቀመጠ" : "Saved"}
              customLabel={isAm ? "ብጁ" : "Custom"}
              useCustom={showCustom}
              disabled={disabled}
              onSelectSaved={() => handleToggleMode(false)}
              onSelectCustom={() => handleToggleMode(true)}
            />
          ) : null}

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 dark:border-white/10 dark:bg-[#11161d]">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={index === 0 || disabled}
              className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              title="Move up"
            >
              <ArrowUp className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={index === totalStops - 1 || disabled}
              className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              title="Move down"
            >
              <ArrowDown className="size-3" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="rounded-md p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
              title="Remove stop"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Location Input Section */}
      {!showCustom ? (
        <div className="space-y-2">
          <AdminSelectField
            id={`itinerary-stop-${stop.id}-point`}
            label=""
            value={stop.locationId || null}
            onValueChange={handleSelectSavedLocation}
            items={locationItems}
            placeholder={isAm ? "የተቀመጠ የማረፊያ ቦታ ይምረጡ" : "Select a saved stop location"}
            required
            disabled={disabled}
          />
          {isValidCoordinatePair(stop.latitude ?? undefined, stop.longitude ?? undefined) && (
            <p className="text-[10px] text-[#C9B87A] font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9B87A] inline-block" />
              {stop.latitude?.toFixed(5)}, {stop.longitude?.toFixed(5)}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AdminTextField
            id={`itinerary-stop-${stop.id}-address`}
            label={isAm ? "የማረፊያ አድራሻ" : "Stop Address"}
            value={stop.address}
            onChange={(e) => onUpdate({ address: e.target.value })}
            placeholder={isAm ? "ምሳሌ፡ ካዛንቺስ፣ ንግድ ባንክ ፊት ለፊት..." : "e.g. Kazanchis, in front of Commercial Bank..."}
            required
            disabled={disabled}
          />
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#1C3A34] dark:text-[#eef1f5]">
              {isAm ? "ማረፊያን በካርታ ይሰኩ" : "Pin Stop on Map"}
            </Label>
            <LazyCoordinateMapPicker
              latitude={stop.latitude ?? undefined}
              longitude={stop.longitude ?? undefined}
              onCoordinatesChange={(lat, lng) => onUpdate({ latitude: lat, longitude: lng })}
              visible={true}
              height={280}
              defaultCenter={DEFAULT_MAP_CENTER}
              title={isAm ? "ማረፊያን በካርታ ይሰኩ" : "Pin Stop on Map"}
              hint={isAm ? "ትክክለኛውን ቦታ ለመወሰን ካርታውን ይንኩ ወይም ምልክቱን ይጎትቱ።" : "Click or drag the pin to set the exact location."}
              loadingLabel={isAm ? "ካርታ በመጫን ላይ..." : "Loading map..."}
              emptyLabel={isAm ? "ቦታ ለመወሰን ካርታውን ይንኩ" : "Click on the map to set a location"}
              recenterLabel={isAm ? "ካርታውን መልስ" : "Recenter map"}
            />
            {isValidCoordinatePair(stop.latitude ?? undefined, stop.longitude ?? undefined) && (
              <p className="text-[10px] text-[#C9B87A] font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9B87A] inline-block" />
                {stop.latitude?.toFixed(5)}, {stop.longitude?.toFixed(5)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Purpose & Standby Time Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {isAm ? "የማረፊያው ዓላማ" : "Stop Purpose"}
          </Label>
          <Select
            items={purposeOptions}
            value={stop.stopPurpose}
            onValueChange={(val) => {
              if (val) onUpdate({ stopPurpose: val });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-9 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-xs dark:border-white/10 dark:bg-[#11161d] dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#171c24] dark:border-white/10">
              <SelectGroup>
                {purposeOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {isAm ? "የመጠባበቂያ ጊዜ (ደቂቃ)" : "Standby Wait Time (min)"}
          </Label>
          <div className="relative">
            <Clock className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={0}
              max={480}
              step={15}
              value={stop.plannedWaitMinutes}
              onChange={(e) =>
                onUpdate({
                  plannedWaitMinutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              disabled={disabled}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-8 text-xs font-semibold text-slate-800 shadow-xs transition-colors focus:border-[#1C3A34] focus:outline-none dark:border-white/10 dark:bg-[#11161d] dark:text-slate-100"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
