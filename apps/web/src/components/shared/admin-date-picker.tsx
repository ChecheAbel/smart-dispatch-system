"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { AdminField } from "./admin-form-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  adminDatePickerCalendarClass,
  adminDatePickerPopoverClass,
  adminDatePickerTriggerClass,
} from "@/lib/admin-theme";
import {
  ETHIOPIAN_MONTHS_AM,
  ethiopianToGregorian,
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/lib/ethiopian-calendar";
import { cn } from "@/lib/utils";

const WEEKDAYS_AM = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];

type AdminDatePickerProps = {
  id: string;
  label: string;
  placeholder: string;
  value?: Date;
  minDate?: Date;
  maxDate?: Date;
  clearLabel?: string;
  todayLabel?: string;
  disabled?: boolean;
  error?: string;
  onChange: (date: Date | undefined) => void;
  className?: string;
};

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateDisabled(date: Date, minDate?: Date, maxDate?: Date) {
  const day = startOfDay(date);
  if (minDate && day < startOfDay(minDate)) return true;
  if (maxDate && day > startOfDay(maxDate)) return true;
  return false;
}

function EthiopianMonthCalendar({
  value,
  activeMonthDate,
  onActiveMonthChange,
  onSelect,
  minDate,
  maxDate,
}: {
  value?: Date;
  activeMonthDate: Date;
  onActiveMonthChange: (date: Date) => void;
  onSelect: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const eth = useMemo(() => gregorianToEthiopian(activeMonthDate), [activeMonthDate]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const daysInMonth = eth.month === 13 ? ((eth.year + 1) % 4 === 0 ? 6 : 5) : 30;
  const firstDayIndex = ethiopianToGregorian(eth.year, eth.month, 1).getDay();

  const daysGrid = useMemo(() => {
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [daysInMonth, firstDayIndex]);

  const selectedDay = useMemo(() => {
    if (!value) return null;
    const ethSel = gregorianToEthiopian(value);
    return ethSel.year === eth.year && ethSel.month === eth.month ? ethSel.day : null;
  }, [value, eth.year, eth.month]);

  function getCellDate(day: number) {
    return startOfDay(ethiopianToGregorian(eth.year, eth.month, day));
  }

  function handlePrevMonth() {
    let month = eth.month - 1;
    let year = eth.year;
    if (month < 1) {
      month = 13;
      year -= 1;
    }
    onActiveMonthChange(ethiopianToGregorian(year, month, 1));
  }

  function handleNextMonth() {
    let month = eth.month + 1;
    let year = eth.year;
    if (month > 13) {
      month = 1;
      year += 1;
    }
    onActiveMonthChange(ethiopianToGregorian(year, month, 1));
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex size-8 items-center justify-center rounded-lg text-[#1C3A34] transition-colors hover:bg-[#1C3A34]/8"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-[#1C3A34]">
          {ETHIOPIAN_MONTHS_AM[eth.month - 1]} {eth.year} ዓ.ም.
        </p>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex size-8 items-center justify-center rounded-lg text-[#1C3A34] transition-colors hover:bg-[#1C3A34]/8"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS_AM.map((day) => (
          <div
            key={day}
            className="flex h-8 items-center justify-center text-xs font-semibold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5">
        {daysGrid.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="size-10" />;
          }

          const cellDate = getCellDate(day);
          const disabled = isDateDisabled(cellDate, minDate, maxDate);
          const isSelected = selectedDay === day;
          const isToday = isSameLocalDay(cellDate, today);

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cellDate)}
              className={cn(
                "mx-auto flex size-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                disabled && "cursor-not-allowed text-slate-300",
                !disabled && !isSelected && "text-[#1C3A34] hover:bg-[#1C3A34]/8",
                isToday && !isSelected && "bg-[#C9B87A]/15 font-semibold text-[#1C3A34]",
                isSelected && "bg-[#1C3A34] font-semibold text-white hover:bg-[#162e29]",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDatePicker({
  id,
  label,
  placeholder,
  value,
  minDate,
  maxDate,
  clearLabel,
  todayLabel,
  disabled = false,
  error,
  onChange,
  className,
}: AdminDatePickerProps) {
  const { locale } = useLocale();
  const isEthiopian = locale === "am";
  const [open, setOpen] = useState(false);
  const [activeMonthDate, setActiveMonthDate] = useState(() => value ?? new Date());

  const resolvedClearLabel = clearLabel ?? (isEthiopian ? "አጽዳ" : "Clear");
  const resolvedTodayLabel = todayLabel ?? (isEthiopian ? "ዛሬ" : "Today");

  useEffect(() => {
    if (value) {
      setActiveMonthDate(value);
    }
  }, [value, locale]);

  function handleOpenChange(nextOpen: boolean) {
    if (disabled) {
      return;
    }

    if (nextOpen) {
      setActiveMonthDate(value ?? new Date());
    }
    setOpen(nextOpen);
  }

  function handleSelect(date: Date | undefined) {
    onChange(date);
    setOpen(false);
  }

  const displayValue = value
    ? isEthiopian
      ? formatEthiopianDate(value, "am")
      : format(value, "MMM d, yyyy")
    : null;

  const detailValue = value
    ? isEthiopian
      ? formatEthiopianDate(value, "am")
      : format(value, "EEEE, MMM d, yyyy")
    : null;

  return (
    <AdminField label={label} htmlFor={id} error={error} className={className}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              id={id}
              disabled={disabled}
              data-empty={!value}
              data-state={open ? "open" : "closed"}
              className={cn(
                adminDatePickerTriggerClass,
                value ? "text-[#1C3A34]" : "text-slate-400",
                error &&
                  "border-red-300 bg-red-50/60 text-red-900 focus-visible:border-red-400 focus-visible:ring-red-200/60",
              )}
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 text-slate-400" />
          <span className="truncate">{displayValue ?? placeholder}</span>
        </PopoverTrigger>
        <PopoverContent className={cn(adminDatePickerPopoverClass, "min-w-80")} align="start">
          <div className="border-b border-slate-100 bg-[#1C3A34]/4 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f7d45]">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
              {detailValue ?? placeholder}
            </p>
          </div>

          <div className={adminDatePickerCalendarClass}>
            {isEthiopian ? (
              <EthiopianMonthCalendar
                value={value}
                activeMonthDate={activeMonthDate}
                onActiveMonthChange={setActiveMonthDate}
                onSelect={handleSelect}
                minDate={minDate}
                maxDate={maxDate}
              />
            ) : (
              <Calendar
                mode="single"
                selected={value}
                defaultMonth={value}
                month={activeMonthDate}
                onMonthChange={setActiveMonthDate}
                onSelect={handleSelect}
                className="w-full [--cell-size:2.5rem]"
                classNames={{
                  root: "w-full",
                  month: "flex w-full flex-col gap-3",
                  month_grid: "w-full",
                  weekdays: "mb-1 flex w-full",
                  weekday:
                    "flex h-8 flex-1 items-center justify-center text-xs font-semibold uppercase tracking-wide text-slate-500",
                  week: "mt-1.5 flex w-full",
                  caption_label: "text-sm font-semibold text-[#1C3A34]",
                  today: "rounded-lg bg-[#C9B87A]/15 font-semibold text-[#1C3A34]",
                  outside: "text-slate-300",
                  disabled:
                    "opacity-100 text-slate-400 [&_button]:text-slate-400 [&_button]:opacity-100 [&_button]:disabled:opacity-100 [&_button]:hover:bg-transparent [&_button]:hover:text-slate-400 cursor-not-allowed",
                  button_previous:
                    "text-[#1C3A34] hover:bg-[#1C3A34]/8 hover:text-[#1C3A34]",
                  button_next: "text-[#1C3A34] hover:bg-[#1C3A34]/8 hover:text-[#1C3A34]",
                }}
                disabled={(date) => isDateDisabled(date, minDate, maxDate)}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-slate-500 hover:bg-white hover:text-[#1C3A34]"
              disabled={!value}
              onClick={() => handleSelect(undefined)}
            >
              {resolvedClearLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 font-medium text-[#1C3A34] hover:bg-[#1C3A34]/8"
              onClick={() => {
                const today = startOfDay(new Date());
                if (minDate && today < startOfDay(minDate)) {
                  handleSelect(startOfDay(minDate));
                  return;
                }
                if (maxDate && today > startOfDay(maxDate)) {
                  return;
                }
                handleSelect(today);
              }}
            >
              {resolvedTodayLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </AdminField>
  );
}
