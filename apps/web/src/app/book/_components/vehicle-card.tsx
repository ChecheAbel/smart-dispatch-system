"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@smart-dispatch/types";
import { VehiclePhotoMedia } from "@/components/book/vehicle-photo-media";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import {
  formatVehicleAvailableFrom,
  getVehicleAvailableFrom,
  isVehicleAvailableNow,
} from "@/lib/vehicle-availability";
import { cardVariant, type BookCopy } from "./book-types";

interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  locale: string;
  copy: BookCopy;
}

export function VehicleCard({
  vehicle,
  isSelected,
  onToggleSelect,
  locale,
  copy,
}: VehicleCardProps) {
  const isAvailable = isVehicleAvailableNow(vehicle);
  const availableFromLabel = formatVehicleAvailableFrom(
    getVehicleAvailableFrom(vehicle),
    locale,
  );

  const metaBits = [
    vehicle.vehicle_type?.name,
    vehicle.vehicle_class?.name,
    vehicle.year ? String(vehicle.year) : null,
    vehicle.vehicle_type?.passenger_capacity
      ? copy.seats.replace("{count}", String(vehicle.vehicle_type.passenger_capacity))
      : null,
  ].filter(Boolean);

  return (
    <motion.article
      variants={cardVariant}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-colors dark:bg-[#171c24]",
        isSelected
          ? "border-[#C9B87A] bg-[#1C3A34]/[0.02] dark:bg-[#C9B87A]/[0.055]"
          : "border-slate-200 hover:border-[#1C3A34]/25 dark:border-white/10 dark:hover:border-[#C9B87A]/35",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-[#11161d]">
        <VehiclePhotoMedia
          imageUrl={
            vehicle.images?.[0] ? getVehiclePhotoUrl(vehicle.images[0]) : undefined
          }
          alt={`${vehicle.make} ${vehicle.model}`}
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C3A34]/55 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide",
                isAvailable ? "text-emerald-200" : "text-amber-200",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isAvailable ? "bg-emerald-300" : "bg-amber-300",
                )}
              />
              {isAvailable
                ? copy.statusAvailable
                : `${copy.statusBusy} ${availableFromLabel}`}
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-black/35 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {vehicle.plate_number}
          </span>
        </div>

        {isSelected ? (
          <div className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-[#C9B87A] text-[#1C3A34]">
            <Check className="size-4" strokeWidth={3} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <Link
            href={`/book/${vehicle.id}`}
            className="block truncate text-lg font-extrabold tracking-tight text-[#1C3A34] transition-colors hover:text-[#254b43] dark:text-[#eef1f5] dark:hover:text-[#d8c77f]"
          >
            {vehicle.make} {vehicle.model}
          </Link>
          {metaBits.length > 0 ? (
            <p className="truncate text-xs font-medium text-slate-500">
              {metaBits.join(" · ")}
            </p>
          ) : null}
          {vehicle.notes ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
              {vehicle.notes}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={() => onToggleSelect(vehicle.id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors",
              isSelected
                ? "border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-600 dark:border-[#C9B87A]/35 dark:bg-[#222831] dark:text-[#d8c77f] dark:hover:border-red-400/40 dark:hover:text-red-300"
                : "bg-[#1C3A34] text-white hover:bg-[#254b43] dark:bg-[#C9B87A] dark:text-[#171a1f] dark:hover:bg-[#d8c98e]",
            )}
          >
            {isSelected ? (
              <>
                <Check className="size-4" strokeWidth={2.5} />
                {copy.selectedVehicle}
              </>
            ) : (
              copy.selectVehicle
            )}
          </button>
          <Link
            href={`/book/${vehicle.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-bold text-[#1C3A34] transition-colors hover:border-[#1C3A34]/30 hover:bg-slate-50 dark:border-white/10 dark:text-[#d8c77f] dark:hover:border-[#C9B87A]/35 dark:hover:bg-white/[0.05]"
            aria-label={copy.viewDetails}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
