import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminHeadingClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

type DashboardChartCardProps = {
  title: string;
  description?: string;
  highlight?: string | number;
  highlightLabel?: string;
  icon?: LucideIcon;
  loading?: boolean;
  empty?: boolean;
  emptyLabel: string;
  className?: string;
  contentClassName?: string;
  footer?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function DashboardChartCard({
  title,
  description,
  highlight,
  highlightLabel,
  icon: Icon = BarChart3,
  loading = false,
  empty = false,
  emptyLabel,
  className,
  contentClassName,
  footer,
  actions,
  children,
}: DashboardChartCardProps) {
  const showHighlight = highlight !== undefined && !loading && !empty;

  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-border dark:bg-card dark:shadow-[0_12px_30px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-border sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/[0.06] text-[#1C3A34] dark:bg-accent dark:text-[var(--brand-accent)]">
              <Icon className="size-3.5" strokeWidth={2.25} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h4
                  className={cn(
                    "truncate text-[15px] font-bold tracking-tight",
                    adminHeadingClass,
                  )}
                >
                  {title}
                </h4>
                {showHighlight ? (
                  <span className="inline-flex items-baseline gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 dark:bg-white/[0.04]">
                    <span className="text-sm font-bold tabular-nums tracking-tight text-[#1C3A34] dark:text-foreground">
                      {highlight}
                    </span>
                    {highlightLabel ? (
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase dark:text-muted-foreground">
                        {highlightLabel}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {description ? (
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
      </div>

      <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : empty ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2.5 rounded-xl bg-slate-50/80 px-4 text-center dark:bg-muted/35">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm ring-1 ring-slate-200/80 dark:bg-accent dark:text-muted-foreground dark:ring-border">
              <Icon className="size-4" />
            </span>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              {emptyLabel}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className={cn("h-72 w-full min-w-0", contentClassName)}>
              {children}
            </div>
            {footer ? (
              <div className="border-t border-slate-100 pt-3 dark:border-border">
                {footer}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
