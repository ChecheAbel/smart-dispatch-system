import type { DriverShiftTemplate } from "@smart-dispatch/types";

export const UNASSIGNED_SHIFT = "unassigned";

export function addisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatWorkDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(workDate: string, days: number) {
  const date = parseLocalDate(workDate);
  date.setDate(date.getDate() + days);
  return formatWorkDateLocal(date);
}

export function startOfIsoWeek(workDate: string) {
  const date = parseLocalDate(workDate);
  const weekday = date.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + diff);
  return formatWorkDateLocal(date);
}

export function formatShiftTime(time: string, locale = "en") {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return time;

  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hour, minute));
}

export function formatShiftHours(startTime: string, endTime: string, locale = "en") {
  return `${formatShiftTime(startTime, locale)}–${formatShiftTime(endTime, locale)}`;
}

export function formatWeekRange(start: string, end: string, locale = "en") {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  const localeTag = locale === "am" ? "am-ET" : "en-GB";
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    const startDay = new Intl.DateTimeFormat(localeTag, { day: "numeric" }).format(startDate);
    const endLabel = new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(endDate);
    return `${startDay}–${endLabel}`;
  }

  const startLabel = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    year: startDate.getFullYear() === endDate.getFullYear() ? undefined : "numeric",
  }).format(startDate);
  const endLabel = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(endDate);
  return `${startLabel} – ${endLabel}`;
}

export function weekdayParts(workDate: string, locale = "en") {
  const date = parseLocalDate(workDate);
  const localeTag = locale === "am" ? "am-ET" : "en-GB";
  return {
    weekday: new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat(localeTag, { day: "numeric" }).format(date),
  };
}

export function isWeekend(workDate: string) {
  const weekday = parseLocalDate(workDate).getDay();
  return weekday === 0 || weekday === 6;
}

export function driverInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase();
}

const SHIFT_PALETTE = [
  {
    badge:
      "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50 dark:border-amber-400/35 dark:bg-amber-400/14 dark:text-amber-200",
    bar: "bg-amber-400",
    dot: "bg-amber-500",
  },
  {
    badge:
      "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50 dark:border-sky-400/35 dark:bg-sky-400/14 dark:text-sky-200",
    bar: "bg-sky-400",
    dot: "bg-sky-500",
  },
  {
    badge:
      "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-400/35 dark:bg-indigo-400/14 dark:text-indigo-200",
    bar: "bg-indigo-400",
    dot: "bg-indigo-500",
  },
  {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400/35 dark:bg-emerald-400/14 dark:text-emerald-200",
    bar: "bg-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    badge:
      "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-50 dark:border-rose-400/35 dark:bg-rose-400/14 dark:text-rose-200",
    bar: "bg-rose-400",
    dot: "bg-rose-500",
  },
  {
    badge:
      "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-50 dark:border-violet-400/35 dark:bg-violet-400/14 dark:text-violet-200",
    bar: "bg-violet-400",
    dot: "bg-violet-500",
  },
] as const;

function paletteIndex(slug: string) {
  if (slug === "morning") return 0;
  if (slug === "afternoon") return 1;
  if (slug === "night") return 2;
  let hash = 0;
  for (const char of slug) hash = (hash + char.charCodeAt(0)) % SHIFT_PALETTE.length;
  return hash;
}

function paletteForSlug(slug: string | null | undefined) {
  if (!slug || slug === UNASSIGNED_SHIFT) return null;
  return SHIFT_PALETTE[paletteIndex(slug)];
}

export function shiftBarClass(slug: string) {
  return paletteForSlug(slug)?.bar ?? "bg-slate-300";
}

export function shiftTemplateLabel(
  template: Pick<DriverShiftTemplate, "slug" | "name">,
  labels: Record<string, string>,
) {
  return labels[template.slug] ?? template.name;
}

export function shiftBadgeClass(slug: string | null | undefined) {
  return (
    paletteForSlug(slug)?.badge ??
    "border-dashed border-slate-200 bg-transparent text-slate-500 hover:bg-transparent dark:border-border"
  );
}

export function shiftDotClass(slug: string | null | undefined) {
  if (slug === UNASSIGNED_SHIFT) {
    return "bg-white ring-1 ring-slate-300 dark:bg-transparent dark:ring-border";
  }
  return paletteForSlug(slug)?.dot ?? "bg-slate-300";
}
