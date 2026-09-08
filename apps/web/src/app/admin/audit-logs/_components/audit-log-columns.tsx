"use client";

import { Eye } from "lucide-react";
import type { AuditLog } from "@smart-dispatch/types";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminAuditLogsMessages } from "@/translations";
import { actionBadgeConfig, formatAuditSummary, formatDateTime } from "./audit-log-types";

export function getAuditLogColumns(
  copy: AdminAuditLogsMessages,
  locale: string,
): DataTableColumn<AuditLog>[] {
  return [
    {
      id: "time",
      header: copy.columns.time,
      cellClassName: "text-slate-500 whitespace-nowrap tabular-nums text-xs",
      cell: (log) => formatDateTime(log.created_at, locale),
    },
    {
      id: "actor",
      header: copy.columns.actor,
      cell: (log) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-foreground">
            {log.actor_name ?? copy.detail.systemActor}
          </p>
          <p className="truncate text-xs text-slate-500">{log.actor_email ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "action",
      header: copy.columns.action,
      cell: (log) => {
        const config = actionBadgeConfig(log.action);
        return (
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              config.badge,
            )}
          >
            <span className={cn("size-1.5 rounded-full", config.dot)} />
            <span>{copy.actionLabels[log.action]}</span>
          </Badge>
        );
      },
    },
    {
      id: "module",
      header: copy.columns.module,
      cell: (log) => (
        <Badge
          variant="outline"
          className="rounded-md border-slate-200 bg-slate-50/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-border dark:bg-muted dark:text-muted-foreground"
        >
          {copy.moduleLabels[log.module as keyof typeof copy.moduleLabels] ?? log.module}
        </Badge>
      ),
    },
    {
      id: "summary",
      header: copy.columns.summary,
      cellClassName: "max-w-md text-slate-600 dark:text-slate-300",
      cell: (log) => (
        <span className="line-clamp-2 text-xs leading-relaxed">
          {formatAuditSummary(log, copy)}
        </span>
      ),
    },
    {
      id: "target",
      header: copy.columns.target,
      cellClassName: "text-slate-500 font-mono text-xs",
      cell: (log) => log.entity_label ?? log.entity_id ?? "—",
    },
  ];
}

export function AuditLogRowActions({
  log,
  label,
  onView,
}: {
  log: AuditLog;
  label: string;
  onView: (log: AuditLog) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-8 text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34] dark:hover:bg-muted dark:hover:text-foreground"
      aria-label={label}
      onClick={() => onView(log)}
    >
      <Eye className="size-4" />
    </Button>
  );
}
