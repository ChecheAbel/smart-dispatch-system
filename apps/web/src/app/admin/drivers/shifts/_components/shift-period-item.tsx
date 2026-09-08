"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { DriverShiftTemplate } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatShiftHours, shiftBadgeClass, shiftDotClass, shiftTemplateLabel } from "./shift-helpers";

type ShiftPeriodItemProps = {
  template: DriverShiftTemplate;
  templateLabels: Record<string, string>;
  isEditing: boolean;
  locale: string;
  canWrite: boolean;
  activeLabel: string;
  inactiveLabel: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: (template: DriverShiftTemplate) => void;
  onDelete: (template: DriverShiftTemplate) => void;
};

export function ShiftPeriodItem({
  template,
  templateLabels,
  isEditing,
  locale,
  canWrite,
  activeLabel,
  inactiveLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: ShiftPeriodItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        isEditing
          ? "border-[#1C3A34] bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/20"
          : "border-slate-200/80 bg-white dark:border-border dark:bg-card",
      )}
    >
      <span className={cn("size-2.5 shrink-0 rounded-full", shiftDotClass(template.slug))} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-foreground">
            {shiftTemplateLabel(template, templateLabels)}
          </p>
          {!template.active ? (
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 rounded-full border-slate-200 bg-slate-100/70 px-1.5 py-0 text-[10px] font-medium text-slate-600 dark:border-border dark:bg-muted dark:text-muted-foreground"
            >
              <span className="size-1 rounded-full bg-slate-400" />
              {inactiveLabel}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[10px] font-medium",
                shiftBadgeClass(template.slug),
              )}
            >
              <span className="size-1 rounded-full bg-emerald-500" />
              {activeLabel}
            </Badge>
          )}
        </div>
        <p className="text-xs tabular-nums text-slate-500">
          {formatShiftHours(template.start_time, template.end_time, locale)}
        </p>
      </div>

      {canWrite ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={editLabel}
            className="size-7 text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
            onClick={() => onEdit(template)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
            aria-label={deleteLabel}
            onClick={() => onDelete(template)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
