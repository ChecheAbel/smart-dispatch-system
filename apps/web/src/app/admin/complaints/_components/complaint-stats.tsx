"use client";

import { CheckCircle2, CircleAlert, MessageSquare, ShieldAlert } from "lucide-react";
import type { ComplaintSummary } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import type { ComplaintUiStrings } from "./complaint-ui-strings";

interface ComplaintStatsProps {
  summary: ComplaintSummary | null;
  statusFilter: string;
  priorityFilter: string;
  categoryFilter: string;
  onSelectFilter: (status: string, priority: string, category: string) => void;
  copy: ComplaintUiStrings["stats"];
}

export function ComplaintStats({
  summary,
  statusFilter,
  priorityFilter,
  categoryFilter,
  onSelectFilter,
  copy,
}: ComplaintStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={copy.total}
        value={summary?.total ?? 0}
        description={copy.totalDesc}
        icon={MessageSquare}
        loading={!summary}
        active={statusFilter === "all" && priorityFilter === "all" && categoryFilter === "all"}
        onClick={() => onSelectFilter("all", "all", "all")}
      />
      <StatCard
        title={copy.open}
        value={summary?.open ?? 0}
        description={copy.openDesc}
        icon={CircleAlert}
        loading={!summary}
        active={statusFilter === "submitted" && priorityFilter === "all"}
        onClick={() => onSelectFilter("submitted", "all", categoryFilter)}
      />
      <StatCard
        title={copy.urgent}
        value={summary?.urgent ?? 0}
        description={copy.urgentDesc}
        icon={ShieldAlert}
        loading={!summary}
        active={priorityFilter === "urgent"}
        onClick={() => onSelectFilter("all", "urgent", categoryFilter)}
      />
      <StatCard
        title={copy.resolved}
        value={summary?.resolved ?? 0}
        description={copy.resolvedDesc}
        icon={CheckCircle2}
        loading={!summary}
        active={statusFilter === "resolved"}
        onClick={() => onSelectFilter("resolved", "all", categoryFilter)}
      />
    </div>
  );
}
