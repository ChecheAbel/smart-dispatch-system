"use client";

import { useMemo } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { DriverShiftWeek } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminBadgeGoldClass, adminCardClass, adminSearchInputClass } from "@/lib/admin-theme";
import { formatMessage } from "@/translations";
import { cn } from "@/lib/utils";
import { ShiftAssignSelect } from "./shift-assign-select";
import {
  addCalendarDays,
  addisToday,
  driverInitials,
  formatShiftHours,
  formatWeekRange,
  isWeekend,
  shiftBadgeClass,
  shiftBarClass,
  shiftDotClass,
  shiftTemplateLabel,
  startOfIsoWeek,
  weekdayParts,
} from "./shift-helpers";

type ShiftCopy = {
  eyebrow: string;
  weekTitle: string;
  weekDescription: string;
  searchPlaceholder: string;
  today: string;
  empty: { title: string; description: string; searchDescription: string };
  columns: { name: string; vehicle: string };
  unassigned: string;
  templates: Record<string, string>;
  assignedCount: string;
  prev: string;
  next: string;
};

type ShiftWeekGridProps = {
  week: DriverShiftWeek | null;
  loading: boolean;
  canWrite: boolean;
  locale: string;
  workDate: string;
  search: string;
  copy: ShiftCopy;
  onSearchChange: (value: string) => void;
  onSelectDate: (workDate: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onAssign: (driverUserId: string, workDate: string, shiftTemplateId: string | null) => Promise<void>;
};

function cellTone(workDate: string, selectedDate: string) {
  const today = addisToday();
  if (workDate === selectedDate) {
    return "bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)]";
  }
  if (workDate === today) {
    return "bg-amber-50/70 dark:bg-[var(--brand-accent)]/8";
  }
  if (isWeekend(workDate)) {
    return "bg-slate-50/80 dark:bg-muted/25";
  }
  return "";
}

export function ShiftWeekGrid({
  week,
  loading,
  canWrite,
  locale,
  workDate,
  search,
  copy,
  onSearchChange,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  onAssign,
}: ShiftWeekGridProps) {
  const templates = week?.templates ?? [];
  const days = week?.days ?? [];
  const today = addisToday();
  const weekStart = week?.start_date ?? startOfIsoWeek(workDate);
  const weekEnd = week?.end_date ?? addCalendarDays(weekStart, 6);
  const weekTitle = formatMessage(copy.weekTitle, {
    range: formatWeekRange(weekStart, weekEnd, locale),
  });

  const roster = useMemo(() => {
    const rows = week?.roster ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const vehicle = row.driver.assigned_vehicle;
      const haystack = [
        row.driver.name,
        row.driver.email,
        row.driver.mobile_number,
        vehicle?.plate_number,
        vehicle?.make,
        vehicle?.model,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [search, week]);

  return (
    <Card className={adminCardClass}>
      <CardHeader className="gap-4">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-2xl font-extrabold tracking-tight">{weekTitle}</CardTitle>
            <CardDescription>{copy.weekDescription}</CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="button" variant="outline" size="icon-sm" aria-label={copy.prev} onClick={onPrevWeek}>
                <ChevronLeft />
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={onToday}>
                {copy.today}
              </Button>
              <Button type="button" variant="outline" size="icon-sm" aria-label={copy.next} onClick={onNextWeek}>
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="relative w-full xl:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className={adminSearchInputClass}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && !week ? (
          <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-muted" />
        ) : (
          <>
            {days.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                {days.map((day) => {
                  const parts = weekdayParts(day.work_date, locale);
                  const total = day.assigned + day.unassigned;
                  const selected = day.work_date === workDate;
                  const isToday = day.work_date === today;
                  return (
                    <button
                      key={day.work_date}
                      type="button"
                      onClick={() => onSelectDate(day.work_date)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition-colors",
                        "hover:border-[color-mix(in_srgb,var(--brand-primary)_35%,transparent)] hover:bg-white",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-primary)_25%,transparent)]",
                        isWeekend(day.work_date)
                          ? "border-slate-200/80 bg-slate-50/90 dark:border-border dark:bg-muted/35"
                          : "border-slate-200/80 bg-[#f8fafb] dark:border-border dark:bg-muted/40",
                        selected &&
                          "border-[var(--brand-primary)] bg-white shadow-[inset_3px_0_0_0_#C9B87A] dark:border-[var(--brand-accent)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {parts.weekday}
                        </p>
                        {isToday ? (
                          <span className="rounded-full bg-[color-mix(in_srgb,var(--brand-accent)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[#8f7d45]">
                            {copy.today}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-[#1C3A34] dark:text-foreground">
                        {parts.day}
                      </p>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-muted">
                        <div className="flex h-full w-full">
                          {templates.map((template) => {
                            const count =
                              day.by_shift.find((row) => row.template_id === template.id)?.count ?? 0;
                            if (!total || !count) return null;
                            return (
                              <div
                                key={template.id}
                                className={cn("h-full", shiftBarClass(template.slug))}
                                style={{ width: `${(count / total) * 100}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-slate-500">
                          {formatMessage(copy.assignedCount, {
                            assigned: day.assigned,
                            total,
                          })}
                        </p>
                        <div className="flex items-center gap-1">
                          {templates.map((template) => {
                            const count =
                              day.by_shift.find((row) => row.template_id === template.id)?.count ?? 0;
                            return (
                              <span
                                key={template.id}
                                title={`${shiftTemplateLabel(template, copy.templates)} ${count}`}
                                className={cn("size-1.5 rounded-full", shiftDotClass(template.slug))}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {roster.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <CalendarClock className="size-10 text-slate-300" />
                <p className="font-semibold text-slate-700 dark:text-foreground">{copy.empty.title}</p>
                <p className="max-w-sm text-sm text-slate-500">
                  {search.trim() ? copy.empty.searchDescription : copy.empty.description}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-border">
                <table className="min-w-[1080px] w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 min-w-[220px] border-b border-slate-200 bg-[#f8fafb] px-4 py-3 text-left font-medium text-slate-500 dark:border-border dark:bg-muted/60">
                        {copy.columns.name}
                      </th>
                      {days.map((day) => {
                        const parts = weekdayParts(day.work_date, locale);
                        return (
                          <th
                            key={day.work_date}
                            className={cn(
                              "min-w-[138px] border-b border-slate-200 px-2 py-3 text-left font-medium dark:border-border",
                              cellTone(day.work_date, workDate),
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectDate(day.work_date)}
                              className="flex flex-col items-start gap-0.5 text-left"
                            >
                              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                                {parts.weekday}
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-foreground">
                                {parts.day}
                              </span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((row) => (
                      <tr key={row.driver.id} className="align-middle">
                        <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2.5 dark:border-border dark:bg-card">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-[11px] font-bold text-[var(--brand-primary)]">
                              {driverInitials(row.driver.name)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-800 dark:text-foreground">
                                {row.driver.name}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {row.driver.assigned_vehicle?.plate_number ?? copy.unassigned}
                              </div>
                            </div>
                          </div>
                        </td>
                        {days.map((day) => {
                          const assignment = row.assignments[day.work_date] ?? null;
                          return (
                            <td
                              key={day.work_date}
                              className={cn(
                                "border-b border-slate-100 px-2 py-2 dark:border-border",
                                cellTone(day.work_date, workDate),
                              )}
                            >
                              {canWrite ? (
                                <ShiftAssignSelect
                                  templates={templates}
                                  value={assignment?.shift.id ?? null}
                                  compact
                                  locale={locale}
                                  unassignedLabel={copy.unassigned}
                                  templateLabels={copy.templates}
                                  onChange={(shiftTemplateId) =>
                                    onAssign(row.driver.id, day.work_date, shiftTemplateId)
                                  }
                                />
                              ) : assignment ? (
                                <Badge
                                  variant="outline"
                                  className={cn("w-full justify-center text-xs", shiftBadgeClass(assignment.shift.slug))}
                                >
                                  {shiftTemplateLabel(assignment.shift, copy.templates)}
                                  <span className="ml-1 hidden font-normal text-slate-400 2xl:inline">
                                    {formatShiftHours(
                                      assignment.shift.start_time,
                                      assignment.shift.end_time,
                                      locale,
                                    )}
                                  </span>
                                </Badge>
                              ) : (
                                <span className="block rounded-lg border border-dashed border-slate-200 px-2 py-2 text-center text-xs text-slate-400 dark:border-border">
                                  {copy.unassigned}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
