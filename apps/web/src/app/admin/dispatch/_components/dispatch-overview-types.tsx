"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";
import type {
  AdminDispatchOverview,
  ComplaintPriority,
  DispatchDisruptionReason,
  DispatchEscalationLevel,
  DispatchSlaPriority,
} from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import type { getAdminDispatchMessages } from "@/translations";

export type OverviewCopy = ReturnType<typeof getAdminDispatchMessages>;

export const emptyOverview: AdminDispatchOverview = {
  counts: {
    pending_approval: 0,
    needs_assignment: 0,
    in_progress: 0,
    upcoming_today: 0,
    disrupted: 0,
    not_started: 0,
    escalated: 0,
    open_complaints: 0,
    urgent_complaints: 0,
  },
  fleet: null,
  queues: {
    needs_assignment: [],
    in_progress: [],
    upcoming_today: [],
    disrupted: [],
    not_started: [],
  },
  complaints: [],
};

export const SLA_BADGE_CLASS: Record<DispatchSlaPriority, string> = {
  overdue:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  due_soon:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  on_track:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
  unscheduled:
    "border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
};

export const SLA_CARD_CLASS: Record<DispatchSlaPriority, string> = {
  overdue:
    "border-l-[3px] border-l-red-500 border-red-200/80 bg-red-50/30 dark:border-red-400/25 dark:border-l-red-400 dark:bg-red-400/8",
  due_soon:
    "border-l-[3px] border-l-amber-500 border-amber-200/80 bg-amber-50/25 dark:border-amber-400/25 dark:border-l-amber-400 dark:bg-amber-400/8",
  on_track:
    "border-l-[3px] border-l-emerald-500 border-slate-200/80 bg-white dark:border-border dark:border-l-emerald-400 dark:bg-card",
  unscheduled:
    "border-l-[3px] border-l-slate-300 border-slate-200/80 bg-white dark:border-border dark:border-l-muted-foreground/40 dark:bg-card",
};

export const PRIORITY_BADGE_CLASS: Record<ComplaintPriority, string> = {
  urgent:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  high: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200",
  medium:
    "border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
  low: "border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
};

export function slaLabel(priority: DispatchSlaPriority, copy: OverviewCopy) {
  if (priority === "overdue") return copy.sla.overdue;
  if (priority === "due_soon") return copy.sla.dueSoon;
  if (priority === "on_track") return copy.sla.onTrack;
  return copy.sla.unscheduled;
}

export function disruptionLabel(reason: DispatchDisruptionReason, copy: OverviewCopy) {
  if (reason === "vehicle_unavailable") return copy.disruption.vehicleUnavailable;
  if (reason === "driver_unavailable") return copy.disruption.driverUnavailable;
  if (reason === "geofence_violation") return copy.disruption.geofenceViolation;
  return copy.disruption.staleLocation;
}

export function escalationLabel(level: DispatchEscalationLevel, copy: OverviewCopy) {
  return level === "supervisor" ? copy.escalation.supervisor : copy.escalation.dispatcher;
}

export function EscalationBadge({
  level,
  copy,
}: {
  level?: DispatchEscalationLevel | null;
  copy: OverviewCopy;
}) {
  if (!level) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={
        level === "supervisor"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
          : "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200"
      }
    >
      {escalationLabel(level, copy)}
    </Badge>
  );
}

export function DisruptedTripsHelp({
  copy,
  label,
  labelClassName,
}: {
  copy: OverviewCopy;
  label?: string;
  labelClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label ? undefined : copy.disruption.helpAria}
        render={
          <span
            className="inline-flex cursor-help items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#1C3A34]/20 dark:focus-visible:ring-[var(--brand-accent)]/35"
            tabIndex={0}
            onClick={(event) => event.stopPropagation()}
          />
        }
      >
        {label ? <span className={labelClassName}>{label}</span> : null}
        <CircleHelp
          className={cn(
            "size-3.5 shrink-0 text-slate-400",
            !label && "transition-colors hover:text-slate-700 dark:hover:text-foreground",
          )}
        />
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className="max-w-sm flex-col items-start gap-2 whitespace-normal py-2.5 text-left leading-relaxed"
      >
        <p className="font-semibold">{copy.disruption.helpTitle}</p>
        <p>{copy.disruption.helpIntro}</p>
        <div>
          <p>{copy.disruption.helpIncludes}</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>{copy.disruption.helpVehicle}</li>
            <li>{copy.disruption.helpDriver}</li>
            <li>{copy.disruption.helpGeofence}</li>
            <li>{copy.disruption.helpStale}</li>
          </ul>
        </div>
        <p>{copy.disruption.helpOutcome}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  count,
  href,
  viewAll,
  action,
  titleHint,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  href: string;
  viewAll: string;
  action?: ReactNode;
  titleHint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-border">
      <div className="flex min-w-0 items-start gap-3">
        <div className={adminIconBoxClass}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {titleHint ?? (
              <h2 className={cn("text-base font-semibold", adminHeadingClass)}>{title}</h2>
            )}
            {typeof count === "number" ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-muted dark:text-muted-foreground">
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
        {action}
        <Button variant="outline" size="sm" render={<Link href={href} />} nativeButton={false}>
          <span className="text-xs">{viewAll}</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center sm:px-6">
      <div
        className={cn(
          "mb-3 flex size-11 items-center justify-center rounded-full",
          tone === "success"
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-300"
            : "bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
