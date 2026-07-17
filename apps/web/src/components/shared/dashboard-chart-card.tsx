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
  children,
}: DashboardChartCardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/[0.06] text-[#1C3A34]">
              <Icon className="size-3.5" strokeWidth={2.25} />
            </span>
            <h4 className={cn("truncate text-[15px] font-bold tracking-tight", adminHeadingClass)}>
              {title}
            </h4>
          </div>
          {description ? (
            <p className="pl-[42px] text-xs leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>

        {highlight !== undefined && !loading && !empty ? (
          <div className="shrink-0 rounded-xl border border-[#1C3A34]/10 bg-[#1C3A34]/[0.03] px-3 py-2 text-right">
            <p className="text-xl font-extrabold tabular-nums tracking-tight text-[#1C3A34] sm:text-2xl">
              {highlight}
            </p>
            {highlightLabel ? (
              <p className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                {highlightLabel}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : empty ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2.5 rounded-xl bg-slate-50/80 px-4 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm ring-1 ring-slate-200/80">
              <Icon className="size-4" />
            </span>
            <p className="text-sm text-slate-500">{emptyLabel}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className={cn("min-h-72 w-full min-w-0 flex-1", contentClassName)}>{children}</div>
            {footer ? <div className="border-t border-slate-100 pt-3">{footer}</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}
