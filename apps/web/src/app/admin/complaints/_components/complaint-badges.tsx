"use client";

import { Tag } from "lucide-react";
import type { ComplaintPriority, ComplaintStatus } from "@smart-dispatch/types";
import { cn } from "@/lib/utils";
import type { ComplaintUiStrings } from "./complaint-ui-strings";

export function getStatusBadge(status: ComplaintStatus, copy: ComplaintUiStrings) {
  const meta: Record<ComplaintStatus, { dot: string; badge: string }> = {
    submitted: {
      dot: "bg-amber-500",
      badge:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    },
    under_review: {
      dot: "bg-blue-500",
      badge:
        "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
    },
    in_progress: {
      dot: "bg-indigo-500",
      badge:
        "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300",
    },
    resolved: {
      dot: "bg-emerald-500",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    closed: {
      dot: "bg-slate-400",
      badge:
        "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    rejected: {
      dot: "bg-rose-500",
      badge:
        "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    },
  };

  const current = meta[status] || meta.submitted;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        current.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", current.dot)} />
      {copy.statuses[status] || status}
    </span>
  );
}

export function getPriorityBadge(priority: ComplaintPriority, copy: ComplaintUiStrings) {
  const meta: Record<ComplaintPriority, { dot: string; badge: string }> = {
    urgent: {
      dot: "bg-red-500 animate-pulse",
      badge:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    },
    high: {
      dot: "bg-orange-500",
      badge:
        "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
    },
    medium: {
      dot: "bg-blue-500",
      badge:
        "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
    },
    low: {
      dot: "bg-slate-400",
      badge:
        "border-slate-200 bg-white text-slate-700 dark:border-border dark:bg-muted/40 dark:text-muted-foreground",
    },
  };

  const current = meta[priority] || meta.medium;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        current.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", current.dot)} />
      {copy.priorities[priority] || priority}
    </span>
  );
}

export function getCategoryBadge(category: string, copy: ComplaintUiStrings) {
  const label = copy.categories[category as keyof typeof copy.categories] || category;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground whitespace-nowrap">
      <Tag className="size-2.5 text-slate-400" />
      {label}
    </span>
  );
}
