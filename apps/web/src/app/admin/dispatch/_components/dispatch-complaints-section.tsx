"use client";

import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";
import type { AdminDispatchComplaintItem } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminCardClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  PRIORITY_BADGE_CLASS,
  SectionHeader,
  type OverviewCopy,
} from "./dispatch-overview-types";

interface ComplaintsSectionProps {
  copy: OverviewCopy;
  items: AdminDispatchComplaintItem[];
  loading: boolean;
}

export function ComplaintsSection({ copy, items, loading }: ComplaintsSectionProps) {
  return (
    <section
      id="dispatch-complaints"
      className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24 shadow-sm")}
    >
      <SectionHeader
        icon={MessageSquareWarning}
        title={copy.complaints.title}
        description={copy.complaints.description}
        count={loading ? undefined : items.length}
        href="/admin/complaints"
        viewAll={copy.viewAll}
      />

      <div className="max-h-[24rem] divide-y divide-slate-100 overflow-y-auto dark:divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title={copy.complaints.empty}
            hint={copy.complaints.emptyHint}
          />
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href="/admin/complaints"
              className="group flex flex-col gap-1.5 px-5 py-3.5 transition-colors hover:bg-slate-50/90 sm:px-6 dark:hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-xs font-bold text-slate-800 group-hover:text-[var(--brand-primary)] dark:text-foreground dark:group-hover:text-[var(--brand-accent)]">
                  {item.subject}
                </p>
                <Badge
                  variant="outline"
                  className={cn("capitalize text-[10px] font-semibold shrink-0", PRIORITY_BADGE_CLASS[item.priority])}
                >
                  <span
                    className={cn(
                      "mr-1 size-1.5 rounded-full inline-block",
                      item.priority === "urgent"
                        ? "bg-red-500 animate-pulse"
                        : item.priority === "high"
                          ? "bg-orange-500"
                          : "bg-slate-400",
                    )}
                  />
                  {copy.complaints[item.priority]}
                </Badge>
              </div>
              <p className="truncate text-[11px] text-slate-500 dark:text-muted-foreground">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {item.requester_name}
                </span>{" "}
                · <span className="font-mono">{item.reference_number}</span>
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
