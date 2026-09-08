"use client";

import { ListFilter, RotateCcw } from "lucide-react";
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
import type { ComplaintUiStrings } from "./complaint-ui-strings";

interface FilterOption {
  value: string;
  label: string;
}

interface ComplaintFilterBarProps {
  copy: ComplaintUiStrings;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusFilterOptions: FilterOption[];
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  priorityFilterOptions: FilterOption[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categoryFilterOptions: FilterOption[];
  isFiltered: boolean;
  onClearFilters: () => void;
}

export function ComplaintFilterBar({
  copy,
  statusFilter,
  onStatusFilterChange,
  statusFilterOptions,
  priorityFilter,
  onPriorityFilterChange,
  priorityFilterOptions,
  categoryFilter,
  onCategoryFilterChange,
  categoryFilterOptions,
  isFiltered,
  onClearFilters,
}: ComplaintFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* Filter Bar Header & Clear Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] text-[var(--brand-primary)] dark:bg-accent dark:text-[var(--brand-accent)]">
            <ListFilter className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">
              {copy.filterTitle}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
              {copy.filterDescription}
            </p>
          </div>
        </div>

        {isFiltered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 justify-start gap-1.5 px-2.5 text-slate-600 hover:text-[var(--brand-primary)] dark:text-muted-foreground dark:hover:text-foreground"
            onClick={onClearFilters}
          >
            <RotateCcw className="size-3.5" />
            {copy.clearFilters}
          </Button>
        ) : null}
      </div>

      {/* Filter Dropdown Selectors for Status, Priority & Category */}
      <div className="grid gap-3 border-t border-slate-200/80 pt-4 dark:border-border sm:grid-cols-3">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="complaint-status-filter" className={adminFilterLabelClass}>
            {copy.status}
          </Label>
          <Select
            items={statusFilterOptions}
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value ?? "all")}
          >
            <SelectTrigger id="complaint-status-filter" className={adminSelectTriggerClass}>
              <SelectValue placeholder={copy.allStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="complaint-priority-filter" className={adminFilterLabelClass}>
            {copy.priority}
          </Label>
          <Select
            items={priorityFilterOptions}
            value={priorityFilter}
            onValueChange={(value) => onPriorityFilterChange(value ?? "all")}
          >
            <SelectTrigger id="complaint-priority-filter" className={adminSelectTriggerClass}>
              <SelectValue placeholder={copy.allPriorities} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {priorityFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="complaint-category-filter" className={adminFilterLabelClass}>
            {copy.category}
          </Label>
          <Select
            items={categoryFilterOptions}
            value={categoryFilter}
            onValueChange={(value) => onCategoryFilterChange(value ?? "all")}
          >
            <SelectTrigger id="complaint-category-filter" className={adminSelectTriggerClass}>
              <SelectValue placeholder={copy.allCategories} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categoryFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
