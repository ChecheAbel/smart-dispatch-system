"use client";

import { useState } from "react";
import { format, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  adminDatePickerCalendarClass,
  adminDatePickerPopoverClass,
  adminDatePickerTriggerClass,
  adminFilterLabelClass,
} from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

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
  onChange: (date: Date | undefined) => void;
  className?: string;
};

export function AdminDatePicker({
  id,
  label,
  placeholder,
  value,
  minDate,
  maxDate,
  clearLabel = "Clear",
  todayLabel = "Today",
  disabled = false,
  onChange,
  className,
}: AdminDatePickerProps) {
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (disabled) {
      return;
    }

    setOpen(nextOpen);
  }

  function handleSelect(date: Date | undefined) {
    onChange(date);
    setOpen(false);
  }

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <Label htmlFor={id} className={adminFilterLabelClass}>
        {label}
      </Label>
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
              )}
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 text-slate-400" />
          <span className="truncate">
            {value ? format(value, "MMM d, yyyy") : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent className={cn(adminDatePickerPopoverClass, "min-w-80")} align="start">
          <div className="border-b border-slate-100 bg-[#1C3A34]/4 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f7d45]">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
              {value ? format(value, "EEEE, MMM d, yyyy") : placeholder}
            </p>
          </div>

          <div className={adminDatePickerCalendarClass}>
            <Calendar
              mode="single"
              selected={value}
              defaultMonth={value}
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
              disabled={(date) => {
                if (minDate && date < startOfDay(minDate)) {
                  return true;
                }
                if (maxDate && date > startOfDay(maxDate)) {
                  return true;
                }
                return false;
              }}
            />
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
              {clearLabel}
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
              {todayLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
