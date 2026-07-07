"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminDatePickerPopoverClass,
  adminDatePickerTriggerClass,
  adminFilterLabelClass,
  adminInputClass,
} from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

export type TimeValue = {
  hour: number;
  minute: number;
};

const MINUTE_INTERVAL = 5;
const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_INTERVAL }, (_, index) => index * MINUTE_INTERVAL);
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);

type AdminTimePickerProps = {
  id: string;
  label: string;
  placeholder: string;
  value?: TimeValue;
  minTime?: TimeValue;
  clearLabel?: string;
  hourLabel?: string;
  minuteLabel?: string;
  applyLabel?: string;
  disabled?: boolean;
  locale?: string;
  onChange: (value: TimeValue | undefined) => void;
  className?: string;
};

function formatTimeDisplay(value: TimeValue, locale: string) {
  const date = new Date(2000, 0, 1, value.hour, value.minute);
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

function isTimeBefore(time: TimeValue, minTime: TimeValue) {
  return time.hour < minTime.hour || (time.hour === minTime.hour && time.minute < minTime.minute);
}

function isHourDisabled(hour: number, minTime?: TimeValue) {
  return minTime ? hour < minTime.hour : false;
}

function isMinuteDisabled(minute: number, hour: number | undefined, minTime?: TimeValue) {
  if (!minTime || hour === undefined) {
    return false;
  }

  if (hour > minTime.hour) {
    return false;
  }

  if (hour < minTime.hour) {
    return true;
  }

  return minute < minTime.minute;
}

export function AdminTimePicker({
  id,
  label,
  placeholder,
  value,
  minTime,
  clearLabel = "Clear",
  hourLabel = "Hour",
  minuteLabel = "Minute",
  applyLabel = "Apply",
  disabled = false,
  locale = "en",
  onChange,
  className,
}: AdminTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftHour, setDraftHour] = useState<string>(value ? String(value.hour) : "");
  const [draftMinute, setDraftMinute] = useState<string>(
    value ? String(value.minute) : "",
  );

  const displayValue = useMemo(
    () => (value ? formatTimeDisplay(value, locale) : placeholder),
    [locale, placeholder, value],
  );

  function syncDraft(nextValue?: TimeValue) {
    setDraftHour(nextValue ? String(nextValue.hour) : "");
    setDraftMinute(nextValue ? String(nextValue.minute) : "");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (disabled) {
      return;
    }

    if (nextOpen) {
      syncDraft(value);
    }

    setOpen(nextOpen);
  }

  function applyDraft() {
    if (!draftHour || !draftMinute) {
      return;
    }

    const nextValue = {
      hour: Number(draftHour),
      minute: Number(draftMinute),
    };

    if (minTime && isTimeBefore(nextValue, minTime)) {
      return;
    }

    onChange(nextValue);
    setOpen(false);
  }

  function handleClear() {
    onChange(undefined);
    syncDraft(undefined);
    setOpen(false);
  }

  const canApply =
    draftHour !== "" &&
    draftMinute !== "" &&
    !isMinuteDisabled(Number(draftMinute), Number(draftHour), minTime) &&
    !isHourDisabled(Number(draftHour), minTime);

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
          <Clock className="size-4 shrink-0 text-slate-400" />
          <span className="truncate">{displayValue}</span>
        </PopoverTrigger>
        <PopoverContent className={cn(adminDatePickerPopoverClass, "min-w-72")} align="start">
          <div className="border-b border-slate-100 bg-[#1C3A34]/4 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f7d45]">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
              {value ? formatTimeDisplay(value, locale) : placeholder}
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">{hourLabel}</Label>
              <Select
                value={draftHour}
                onValueChange={(value) => setDraftHour(value ?? "")}
                disabled={disabled}
              >
                <SelectTrigger className={cn(adminInputClass, "w-full")}>
                  <SelectValue placeholder={hourLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {HOUR_OPTIONS.map((hour) => (
                      <SelectItem
                        key={hour}
                        value={String(hour)}
                        disabled={isHourDisabled(hour, minTime)}
                      >
                        {String(hour).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">{minuteLabel}</Label>
              <Select
                value={draftMinute}
                onValueChange={(value) => setDraftMinute(value ?? "")}
                disabled={disabled || draftHour === ""}
              >
                <SelectTrigger className={cn(adminInputClass, "w-full")}>
                  <SelectValue placeholder={minuteLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MINUTE_OPTIONS.map((minute) => (
                      <SelectItem
                        key={minute}
                        value={String(minute)}
                        disabled={isMinuteDisabled(minute, Number(draftHour), minTime)}
                      >
                        {String(minute).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-slate-500 hover:bg-white hover:text-[#1C3A34]"
              disabled={!value}
              onClick={handleClear}
            >
              {clearLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 font-medium text-[#1C3A34] hover:bg-[#1C3A34]/8"
              disabled={!canApply}
              onClick={applyDraft}
            >
              {applyLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function roundUpToMinuteInterval(date: Date, interval = MINUTE_INTERVAL): TimeValue {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const roundedMinutes = Math.ceil(minutes / interval) * interval;
  const hour = Math.floor(roundedMinutes / 60) % 24;
  const minute = roundedMinutes % 60;

  return { hour, minute };
}
