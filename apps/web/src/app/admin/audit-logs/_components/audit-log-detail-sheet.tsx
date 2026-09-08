"use client";

import { ScrollText } from "lucide-react";
import type { AuditLog } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminHeadingClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import type { AdminAuditLogsMessages } from "@/translations";
import { formatAuditSummary } from "./audit-log-types";

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm font-medium text-slate-800 dark:text-foreground">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

type AuditLogDetailSheetProps = {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: AdminAuditLogsMessages;
};

export function AuditLogDetailSheet({
  log,
  open,
  onOpenChange,
  copy,
}: AuditLogDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200/80 px-4 pb-3.5 pt-4 dark:border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/10 text-[#1C3A34] dark:bg-muted dark:text-foreground">
              <ScrollText className="size-4" />
            </div>
            <div>
              <SheetTitle className={cn("text-base font-bold", adminHeadingClass)}>
                {copy.detail.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {copy.detail.description}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {log ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <DetailField
              label={copy.detail.actor}
              value={
                log.actor_email
                  ? `${log.actor_name ?? copy.detail.systemActor} (${log.actor_email})`
                  : copy.detail.systemActor
              }
            />
            <DetailField
              label={copy.detail.action}
              value={copy.actionLabels[log.action]}
            />
            <DetailField
              label={copy.detail.module}
              value={
                copy.moduleLabels[log.module as keyof typeof copy.moduleLabels] ??
                log.module
              }
            />
            <DetailField
              label={copy.detail.target}
              value={log.entity_label ?? log.entity_id}
            />
            <DetailField
              label={copy.detail.summary}
              value={formatAuditSummary(log, copy)}
            />
            <DetailField
              label={copy.detail.request}
              value={
                log.request_method && log.request_path
                  ? `${log.request_method} ${log.request_path}`
                  : log.request_path
              }
            />
            <DetailField label={copy.detail.ipAddress} value={log.ip_address} />
            <DetailField label={copy.detail.userAgent} value={log.user_agent} />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
                {copy.detail.metadata}
              </p>
              <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200/90 bg-slate-50/70 p-3.5 font-mono text-xs text-slate-700 dark:border-border dark:bg-muted/40 dark:text-muted-foreground">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}

        <SheetFooter className="border-t border-slate-200/80 p-4 dark:border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {copy.detail.close}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
