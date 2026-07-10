import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminCardClass, adminHeadingClass, adminIconBoxClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

type DashboardChartCardProps = {
  title: string;
  description?: string;
  highlight?: string | number;
  highlightLabel?: string;
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
  loading = false,
  empty = false,
  emptyLabel,
  className,
  contentClassName,
  footer,
  children,
}: DashboardChartCardProps) {
  return (
    <Card
      className={cn(
        adminCardClass,
        "rounded-2xl border-slate-200/80 bg-gradient-to-br from-white via-white to-[#1C3A34]/[0.03]",
        className,
      )}
    >
      <CardHeader className="space-y-3 border-b border-slate-100/80 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={cn(adminIconBoxClass, "mt-0.5 shrink-0")}>
              <BarChart3 className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className={cn("text-sm font-bold", adminHeadingClass)}>{title}</CardTitle>
              {description ? (
                <CardDescription className="text-xs leading-relaxed text-slate-500">
                  {description}
                </CardDescription>
              ) : null}
            </div>
          </div>
          {highlight !== undefined && !loading && !empty ? (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-extrabold tabular-nums tracking-tight text-[#1C3A34]">
                {highlight}
              </p>
              {highlightLabel ? (
                <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  {highlightLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-4 pb-4 sm:px-5">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : empty ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
            <BarChart3 className="size-5 text-slate-300" />
            <p className="text-sm text-slate-500">{emptyLabel}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={cn("h-64 w-full min-w-0", contentClassName)}>{children}</div>
            {footer ? <div className="border-t border-slate-100 pt-3">{footer}</div> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
