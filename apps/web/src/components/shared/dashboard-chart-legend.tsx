import { cn } from "@/lib/utils";

export type DashboardChartLegendItem = {
  key: string;
  label: string;
  color: string;
  value?: number;
};

type DashboardChartLegendProps = {
  items: DashboardChartLegendItem[];
  className?: string;
};

export function DashboardChartLegend({ items, className }: DashboardChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-2.5 py-1"
        >
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
          {item.value !== undefined ? (
            <span className="text-[11px] font-bold tabular-nums text-slate-900">{item.value}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
