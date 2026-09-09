"use client";

import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { VehicleType, VehicleClass } from "@smart-dispatch/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { BookCopy } from "./book-types";

interface BookFiltersProps {
  copy: BookCopy;
  search: string;
  onSearchChange: (val: string) => void;
  selectedType: string;
  onTypeChange: (val: string) => void;
  selectedClass: string;
  onClassChange: (val: string) => void;
  availabilityFilter: "all" | "available" | "busy";
  onAvailabilityChange: (val: "all" | "available" | "busy") => void;
  types: VehicleType[];
  classes: VehicleClass[];
}

export function BookFilters({
  copy,
  search,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedClass,
  onClassChange,
  availabilityFilter,
  onAvailabilityChange,
  types,
  classes,
}: BookFiltersProps) {
  return (
    <>
      {/* Animated Hero Section */}
      <section className="relative -mt-px flex w-full items-center justify-center overflow-hidden bg-[#1C3A34] pt-32 pb-32 dark:bg-[#0d1117] sm:pb-40">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1], rotate: [0, 90, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_50%)] rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05], rotate: [0, -90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -right-[10%] h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_#1C3A34_0%,_transparent_50%)] blur-[100px] dark:opacity-40"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_40%,transparent_100%)] opacity-50" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-3xl drop-shadow-2xl"
          >
            {copy.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="mt-6 text-white/70 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed font-light"
          >
            {copy.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Search & filters — single toolbar */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 -mt-10 sm:-mt-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_12px_40px_-16px_rgba(28,58,52,0.35)] dark:border-white/10 dark:bg-[#171c24] dark:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]"
        >
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.85fr))]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 w-full rounded-xl border-0 bg-transparent pr-10 pl-10 text-sm font-medium text-[#1C3A34] outline-none placeholder:text-slate-400 focus:bg-slate-50/80 dark:text-[#eef1f5] dark:placeholder:text-[#7f8996] dark:focus:bg-white/[0.045] lg:h-12"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#1C3A34] dark:hover:bg-white/[0.06] dark:hover:text-[#C9B87A]"
                  aria-label={copy.clearFilters}
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>

            <Select
              key={`type-select-${types.length}`}
              value={selectedType}
              onValueChange={(value) => {
                if (value) onTypeChange(value);
              }}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3.5 text-sm font-medium text-[#1C3A34] shadow-none hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[#1C3A34]/15 dark:bg-[#11161d] dark:text-[#e8ecf1] dark:hover:bg-[#202731] dark:focus-visible:ring-[#C9B87A]/25 lg:h-12">
                <span className="truncate">
                  {selectedType === "all-types-placeholder"
                    ? copy.allTypes
                    : types.find((t) => t.id === selectedType)?.name || copy.allTypes}
                </span>
              </SelectTrigger>
              <SelectContent className="z-[10000] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#1b212a] dark:text-[#e8ecf1] dark:shadow-black/35">
                <SelectItem value="all-types-placeholder" className="rounded-md">
                  {copy.allTypes}
                </SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="rounded-md">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              key={`class-select-${classes.length}`}
              value={selectedClass}
              onValueChange={(value) => {
                if (value) onClassChange(value);
              }}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3.5 text-sm font-medium text-[#1C3A34] shadow-none hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[#1C3A34]/15 dark:bg-[#11161d] dark:text-[#e8ecf1] dark:hover:bg-[#202731] dark:focus-visible:ring-[#C9B87A]/25 lg:h-12">
                <span className="truncate">
                  {selectedClass === "all-classes-placeholder"
                    ? copy.allClasses
                    : classes.find((c) => c.id === selectedClass)?.name || copy.allClasses}
                </span>
              </SelectTrigger>
              <SelectContent className="z-[10000] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#1b212a] dark:text-[#e8ecf1] dark:shadow-black/35">
                <SelectItem value="all-classes-placeholder" className="rounded-md">
                  {copy.allClasses}
                </SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="rounded-md">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={availabilityFilter}
              onValueChange={(val) => onAvailabilityChange(val as "all" | "available" | "busy")}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3.5 text-sm font-medium text-[#1C3A34] shadow-none hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[#1C3A34]/15 dark:bg-[#11161d] dark:text-[#e8ecf1] dark:hover:bg-[#202731] dark:focus-visible:ring-[#C9B87A]/25 lg:h-12">
                <span className="truncate">
                  {availabilityFilter === "all"
                    ? copy.allAvailability
                    : availabilityFilter === "available"
                      ? copy.availableNow
                      : copy.inService}
                </span>
              </SelectTrigger>
              <SelectContent className="z-[10000] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#1b212a] dark:text-[#e8ecf1] dark:shadow-black/35">
                <SelectItem value="all" className="rounded-md">
                  {copy.allAvailability}
                </SelectItem>
                <SelectItem value="available" className="rounded-md">
                  {copy.availableNow}
                </SelectItem>
                <SelectItem value="busy" className="rounded-md">
                  {copy.inService}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </div>
    </>
  );
}
