"use client";

import { RotateCcw } from "lucide-react";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFilterLabelClass, adminSelectTriggerClass } from "@/lib/admin-theme";
import type { AdminAuditLogsMessages } from "@/translations";
import { ACTION_OPTIONS, MODULE_OPTIONS } from "./audit-log-types";

type AuditLogFilterBarProps = {
  copy: AdminAuditLogsMessages;
  moduleFilter: string;
  actionFilter: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
  onModuleChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onFromDateChange: (date: Date | undefined) => void;
  onToDateChange: (date: Date | undefined) => void;
  onReset: () => void;
};

export function AuditLogFilterBar({
  copy,
  moduleFilter,
  actionFilter,
  fromDate,
  toDate,
  onModuleChange,
  onActionChange,
  onFromDateChange,
  onToDateChange,
  onReset,
}: AuditLogFilterBarProps) {
  const isFiltered =
    moduleFilter !== "all" ||
    actionFilter !== "all" ||
    fromDate !== undefined ||
    toDate !== undefined;

  const moduleItems = [
    { label: copy.filters.moduleAll, value: "all" },
    ...MODULE_OPTIONS.map((module) => ({
      label: copy.moduleLabels[module] ?? module,
      value: module,
    })),
  ];

  const actionItems = [
    { label: copy.filters.actionAll, value: "all" },
    ...ACTION_OPTIONS.map((action) => ({
      label: copy.actionLabels[action],
      value: action,
    })),
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
      <div className="w-full space-y-1.5 sm:w-56">
        <Label htmlFor="audit-module-filter" className={adminFilterLabelClass}>
          {copy.filters.module}
        </Label>
        <Select
          items={moduleItems}
          value={moduleFilter}
          onValueChange={(value) => onModuleChange(value ?? "all")}
        >
          <SelectTrigger id="audit-module-filter" className={adminSelectTriggerClass}>
            <SelectValue placeholder={copy.filters.module} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {moduleItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full space-y-1.5 sm:w-48">
        <Label htmlFor="audit-action-filter" className={adminFilterLabelClass}>
          {copy.filters.action}
        </Label>
        <Select
          items={actionItems}
          value={actionFilter}
          onValueChange={(value) => onActionChange(value ?? "all")}
        >
          <SelectTrigger id="audit-action-filter" className={adminSelectTriggerClass}>
            <SelectValue placeholder={copy.filters.action} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {actionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full sm:w-44">
        <AdminDatePicker
          id="audit-from-date"
          className="w-full"
          label={copy.filters.dateFrom}
          placeholder={copy.filters.pickDate}
          clearLabel={copy.filters.clearDate}
          todayLabel={copy.filters.today}
          value={fromDate}
          maxDate={toDate}
          onChange={onFromDateChange}
        />
      </div>

      <div className="w-full sm:w-44">
        <AdminDatePicker
          id="audit-to-date"
          className="w-full"
          label={copy.filters.dateTo}
          placeholder={copy.filters.pickDate}
          clearLabel={copy.filters.clearDate}
          todayLabel={copy.filters.today}
          value={toDate}
          minDate={fromDate}
          onChange={onToDateChange}
        />
      </div>

      {isFiltered ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-9 gap-1.5 border-dashed border-slate-300 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-border dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          <span>{copy.filters.clearDates}</span>
        </Button>
      ) : null}
    </div>
  );
}
