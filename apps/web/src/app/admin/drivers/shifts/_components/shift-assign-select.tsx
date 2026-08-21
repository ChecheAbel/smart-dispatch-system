"use client";

import { useState } from "react";
import type { DriverShiftTemplate } from "@smart-dispatch/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminSelectTriggerClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { formatShiftHours, shiftBadgeClass, shiftDotClass, shiftTemplateLabel, UNASSIGNED_SHIFT } from "./shift-helpers";

type ShiftAssignSelectProps = {
  templates: DriverShiftTemplate[];
  value: string | null;
  disabled?: boolean;
  compact?: boolean;
  locale?: string;
  unassignedLabel: string;
  templateLabels: Record<string, string>;
  onChange: (templateId: string | null) => Promise<void>;
};

export function ShiftAssignSelect({
  templates,
  value,
  disabled,
  compact,
  locale = "en",
  unassignedLabel,
  templateLabels,
  onChange,
}: ShiftAssignSelectProps) {
  const [pending, setPending] = useState(false);
  const selected = value ?? UNASSIGNED_SHIFT;

  const selectedSlug = templates.find((template) => template.id === value)?.slug ?? null;

  return (
    <Select
      items={[
        { label: unassignedLabel, value: UNASSIGNED_SHIFT },
        ...templates.map((template) => ({
          label: `${shiftTemplateLabel(template, templateLabels)} ${formatShiftHours(template.start_time, template.end_time, locale)}`,
          value: template.id,
        })),
      ]}
      value={selected}
      disabled={disabled || pending}
      onValueChange={(next) => {
        const nextValue = (next as string | null) ?? UNASSIGNED_SHIFT;
        const nextId = nextValue === UNASSIGNED_SHIFT ? null : nextValue;
        if (nextId === value) return;
        setPending(true);
        void onChange(nextId).finally(() => setPending(false));
      }}
    >
      <SelectTrigger
        aria-label={unassignedLabel}
        className={cn(
          adminSelectTriggerClass,
          compact
            ? cn(
                "h-9 w-full min-w-0 justify-start gap-1.5 px-2 text-xs shadow-none [&_[data-shift-hours]]:hidden",
                shiftBadgeClass(selectedSlug),
              )
            : "min-w-[12.5rem]",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="min-w-[18rem]">
        <SelectGroup>
          <SelectItem value={UNASSIGNED_SHIFT}>
            <span className="grid w-full grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-x-2">
              <span className={cn("size-2 justify-self-center rounded-full", shiftDotClass(UNASSIGNED_SHIFT))} />
              <span className="text-left leading-none">{unassignedLabel}</span>
            </span>
          </SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <span className="grid w-full grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-x-2">
                <span className={cn("size-2 justify-self-center rounded-full", shiftDotClass(template.slug))} />
                <span className="text-left leading-none">{shiftTemplateLabel(template, templateLabels)}</span>
                <span data-shift-hours className="text-slate-400 tabular-nums leading-none">
                  {formatShiftHours(template.start_time, template.end_time, locale)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
