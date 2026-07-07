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
const HOUR12_OPTIONS = Array.from({ length: 12 }, (_, index) => (index + 1) % 12 || 12);
const PERIOD_OPTIONS = ["AM", "PM"] as const;

type TimePeriod = (typeof PERIOD_OPTIONS)[number];

type AdminTimePickerProps = {
  id: string;
  label: string;
  placeholder: string;
  value?: TimeValue;
  minTime?: TimeValue;
  clearLabel?: string;
  hourLabel?: string;
  minuteLabel?: string;
  periodLabel?: string;
  amLabel?: string;
  pmLabel?: string;
  applyLabel?: string;
  disabled?: boolean;
  locale?: string;
  hour12?: boolean;
  onChange: (value: TimeValue | undefined) => void;
  className?: string;
};

function formatTimeDisplay(value: TimeValue, locale: string, hour12 = false) {
  const date = new Date(2000, 0, 1, value.hour, value.minute);
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12,
  });
}

function to12HourParts(hour24: number): { hour12: number; period: TimePeriod } {
  const period: TimePeriod = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { hour12, period };
}

function to24Hour(hour12: number, period: TimePeriod): number {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }

  return hour12 === 12 ? 12 : hour12 + 12;
}

function buildTimeValue(hour: number, minute: number): TimeValue {
  return { hour, minute };
}

function buildTimeValueFrom12Hour(
  hour12: number,
  minute: number,
  period: TimePeriod,
): TimeValue {
  return buildTimeValue(to24Hour(hour12, period), minute);
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
  periodLabel = "Period",
  amLabel = "AM",
  pmLabel = "PM",
  applyLabel = "Apply",
  disabled = false,
  locale = "en",
  hour12 = false,
  onChange,
  className,
}: AdminTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftHour, setDraftHour] = useState<string>(() => {
    if (!value) return "";
    if (!hour12) return String(value.hour);
    return String(to12HourParts(value.hour).hour12);
  });
  const [draftMinute, setDraftMinute] = useState<string>(
    value ? String(value.minute) : "",
  );
  const [draftPeriod, setDraftPeriod] = useState<TimePeriod | "">(() => {
    if (!value || !hour12) return "";
    return to12HourParts(value.hour).period;
  });

  const periodLabels: Record<TimePeriod, string> = {
    AM: amLabel,
    PM: pmLabel,
  };

  const displayValue = useMemo(
    () => (value ? formatTimeDisplay(value, locale, hour12) : placeholder),
    [hour12, locale, placeholder, value],
  );

  function syncDraft(nextValue?: TimeValue) {
    if (!nextValue) {
      setDraftHour("");
      setDraftMinute("");
      setDraftPeriod("");
      return;
    }

    if (hour12) {
      const parts = to12HourParts(nextValue.hour);
      setDraftHour(String(parts.hour12));
      setDraftPeriod(parts.period);
    } else {
      setDraftHour(String(nextValue.hour));
      setDraftPeriod("");
    }

    setDraftMinute(String(nextValue.minute));
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
    if (!draftHour || !draftMinute || (hour12 && !draftPeriod)) {
      return;
    }

    const nextValue = hour12
      ? buildTimeValueFrom12Hour(Number(draftHour), Number(draftMinute), draftPeriod as TimePeriod)
      : buildTimeValue(Number(draftHour), Number(draftMinute));

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

  const draftTimeValue = useMemo(() => {
    if (!draftHour || !draftMinute || (hour12 && !draftPeriod)) {
      return undefined;
    }

    return hour12
      ? buildTimeValueFrom12Hour(Number(draftHour), Number(draftMinute), draftPeriod as TimePeriod)
      : buildTimeValue(Number(draftHour), Number(draftMinute));
  }, [draftHour, draftMinute, draftPeriod, hour12]);

  const canApply =
    draftTimeValue !== undefined &&
    (!minTime || !isTimeBefore(draftTimeValue, minTime));

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
              {value ? formatTimeDisplay(value, locale, hour12) : placeholder}
            </p>
          </div>

          <div className={cn("grid gap-3 p-4", hour12 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
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
                    {(hour12 ? HOUR12_OPTIONS : HOUR_OPTIONS).map((hour) => (
                      <SelectItem
                        key={hour}
                        value={String(hour)}
                        disabled={
                          !hour12 &&
                          isHourDisabled(hour, minTime)
                        }
                      >
                        {hour12 ? String(hour) : String(hour).padStart(2, "0")}
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
                disabled={disabled || draftHour === "" || (hour12 && !draftPeriod)}
              >
                <SelectTrigger className={cn(adminInputClass, "w-full")}>
                  <SelectValue placeholder={minuteLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MINUTE_OPTIONS.map((minute) => {
                      const draftHour24 = hour12
                        ? draftHour && draftPeriod
                          ? to24Hour(Number(draftHour), draftPeriod as TimePeriod)
                          : undefined
                        : draftHour
                          ? Number(draftHour)
                          : undefined;

                      return (
                        <SelectItem
                          key={minute}
                          value={String(minute)}
                          disabled={
                            !hour12 &&
                            isMinuteDisabled(minute, draftHour24, minTime)
                          }
                        >
                          {String(minute).padStart(2, "0")}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {hour12 ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">{periodLabel}</Label>
                <Select
                  value={draftPeriod}
                  onValueChange={(value) => setDraftPeriod((value as TimePeriod | null) ?? "")}
                  disabled={disabled || draftHour === ""}
                >
                  <SelectTrigger className={cn(adminInputClass, "w-full")}>
                    <SelectValue placeholder={periodLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PERIOD_OPTIONS.map((period) => (
                        <SelectItem key={period} value={period}>
                          {periodLabels[period]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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
