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
  variant?: "pills" | "rows";
};

export function DashboardChartLegend({
  items,
  className,
  variant = "pills",
}: DashboardChartLegendProps) {
  if (items.length === 0) return null;

  if (variant === "rows") {
    const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);

    return (
      <ul className={cn("space-y-2", className)}>
        {items.map((item) => {
          const share =
            total > 0 && item.value !== undefined
              ? Math.round((item.value / total) * 100)
              : null;

          return (
            <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2.5 text-slate-600">
                <span
                  className="size-2.5 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate font-medium">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                {item.value !== undefined ? (
                  <span className="font-bold text-[#1C3A34]">{item.value}</span>
                ) : null}
                {share !== null ? (
                  <span className="text-[11px] font-semibold text-slate-400">{share}%</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50/70 px-2.5 py-1.5"
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
