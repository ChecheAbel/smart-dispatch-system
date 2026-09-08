"use client";

import type { FormEvent } from "react";
import { Loader2, Plus, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

export type PeriodFormState = {
  name: string;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type ShiftPeriodFormCopy = {
  add: string;
  edit: string;
  save: string;
  cancel: string;
  name: string;
  start: string;
  end: string;
  active: string;
  hoursHint: string;
};

type ShiftPeriodFormProps = {
  form: PeriodFormState;
  onChange: (updater: (prev: PeriodFormState) => PeriodFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  submitting: boolean;
  copy: ShiftPeriodFormCopy;
};

export function ShiftPeriodForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  submitting,
  copy,
}: ShiftPeriodFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 border-t border-slate-200/80 p-4 dark:border-border">
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-sm font-semibold tracking-tight", adminHeadingClass)}>
          {isEditing ? copy.edit : copy.add}
        </p>
        {isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            {copy.cancel}
          </Button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shift-period-name" className="text-xs font-medium">
          {copy.name}
        </Label>
        <Input
          id="shift-period-name"
          value={form.name}
          onChange={(event) =>
            onChange((current) => ({ ...current, name: event.target.value }))
          }
          className={adminInputClass}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="shift-period-start" className="text-xs font-medium">
            {copy.start}
          </Label>
          <Input
            id="shift-period-start"
            type="time"
            value={form.startTime}
            onChange={(event) =>
              onChange((current) => ({ ...current, startTime: event.target.value }))
            }
            className={adminInputClass}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shift-period-end" className="text-xs font-medium">
            {copy.end}
          </Label>
          <Input
            id="shift-period-end"
            type="time"
            value={form.endTime}
            onChange={(event) =>
              onChange((current) => ({ ...current, endTime: event.target.value }))
            }
            className={adminInputClass}
            required
          />
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">{copy.hoursHint}</p>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 dark:border-border dark:bg-muted/40">
        <Label
          htmlFor="shift-period-active"
          className="cursor-pointer text-xs font-medium text-slate-700 dark:text-foreground"
        >
          {copy.active}
        </Label>
        <Switch
          id="shift-period-active"
          checked={form.active}
          onCheckedChange={(active) =>
            onChange((current) => ({ ...current, active }))
          }
        />
      </div>

      <Button
        type="submit"
        className={cn(adminPrimaryButtonClass, "w-full gap-2")}
        disabled={submitting || !form.name.trim()}
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isEditing ? (
          <Save className="size-4" />
        ) : (
          <Plus className="size-4" />
        )}
        <span>{copy.save}</span>
      </Button>
    </form>
  );
}
