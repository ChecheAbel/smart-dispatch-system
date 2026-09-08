"use client";

import { AlertTriangle, ArrowRight, Clock3, Megaphone, ShieldAlert } from "lucide-react";
import type { AdminDispatchOverview } from "@smart-dispatch/types";
import { formatMessage } from "@/translations";
import { cn } from "@/lib/utils";
import { scrollToSection, type OverviewCopy } from "./dispatch-overview-types";

interface DispatchAlertsBannerProps {
  overview: AdminDispatchOverview;
  loading: boolean;
  canReadRideRequests: boolean;
  locale: string;
  copy: OverviewCopy;
}

export function DispatchAlertsBanner({
  overview,
  loading,
  canReadRideRequests,
  locale,
  copy,
}: DispatchAlertsBannerProps) {
  if (loading || !canReadRideRequests) {
    return null;
  }

  const { counts, queues } = overview;
  const hasEscalations = counts.escalated > 0;
  const hasNotStarted = counts.not_started > 0;
  const hasDisrupted = counts.disrupted > 0;
  const hasUrgentComplaints = counts.urgent_complaints > 0;

  if (!hasEscalations && !hasNotStarted && !hasDisrupted && !hasUrgentComplaints) {
    return null;
  }

  const isAm = locale === "am";
  const totalIssues =
    counts.escalated + counts.disrupted + counts.not_started + counts.urgent_complaints;

  function getEscalatedTargetId() {
    if (queues.not_started.some((item) => item.escalation_level)) {
      return "dispatch-not-started";
    }
    if (queues.needs_assignment.some((item) => item.escalation_level)) {
      return "dispatch-needs";
    }
    return "dispatch-disrupted";
  }

  return (
    <aside
      aria-label="Dispatch Operational Alerts"
      className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-red-50/50 p-4 shadow-sm dark:border-amber-500/30 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-red-950/10"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm dark:bg-amber-400 dark:text-slate-950">
            <ShieldAlert className="size-4" />
          </span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              {isAm ? "ትኩረት የሚሹ ጉዳዮች" : "Dispatch Action Required"}
            </h2>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              {isAm
                ? `${totalIssues} ጉዳዮች የክትትል እርምጃ ያስፈልጋቸዋል`
                : `${totalIssues} active issues require dispatch supervision`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hasEscalations ? (
          <button
            type="button"
            onClick={() => scrollToSection(getEscalatedTargetId())}
            className="group inline-flex items-center gap-2 rounded-lg border border-orange-300/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-orange-950 shadow-xs transition-all hover:border-orange-400 hover:bg-orange-50/60 dark:border-orange-500/30 dark:bg-card dark:text-orange-200 dark:hover:bg-orange-950/40"
          >
            <Megaphone className="size-3.5 text-orange-600 dark:text-orange-400" />
            <span>
              {formatMessage(copy.attentionEscalated, { count: String(counts.escalated) })}
            </span>
            <ArrowRight className="size-3 text-orange-500 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : null}

        {hasDisrupted ? (
          <button
            type="button"
            onClick={() => scrollToSection("dispatch-disrupted")}
            className="group inline-flex items-center gap-2 rounded-lg border border-red-300/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-950 shadow-xs transition-all hover:border-red-400 hover:bg-red-50/60 dark:border-red-500/30 dark:bg-card dark:text-red-200 dark:hover:bg-red-950/40"
          >
            <AlertTriangle className="size-3.5 text-red-600 dark:text-red-400" />
            <span>
              {formatMessage(copy.attentionDisrupted, { count: String(counts.disrupted) })}
            </span>
            <ArrowRight className="size-3 text-red-500 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : null}

        {hasNotStarted ? (
          <button
            type="button"
            onClick={() => scrollToSection("dispatch-not-started")}
            className="group inline-flex items-center gap-2 rounded-lg border border-amber-300/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-xs transition-all hover:border-amber-400 hover:bg-amber-50/60 dark:border-amber-500/30 dark:bg-card dark:text-amber-200 dark:hover:bg-amber-950/40"
          >
            <Clock3 className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              {formatMessage(copy.attentionNotStarted, { count: String(counts.not_started) })}
            </span>
            <ArrowRight className="size-3 text-amber-500 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : null}

        {hasUrgentComplaints ? (
          <button
            type="button"
            onClick={() => scrollToSection("dispatch-complaints")}
            className="group inline-flex items-center gap-2 rounded-lg border border-rose-300/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-rose-950 shadow-xs transition-all hover:border-rose-400 hover:bg-rose-50/60 dark:border-rose-500/30 dark:bg-card dark:text-rose-200 dark:hover:bg-rose-950/40"
          >
            <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
            <span>
              {formatMessage(copy.attentionUrgentComplaints, {
                count: String(counts.urgent_complaints),
              })}
            </span>
            <ArrowRight className="size-3 text-rose-500 transition-transform group-hover:translate-x-0.5" />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
