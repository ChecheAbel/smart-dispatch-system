"use client";

type DashboardChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
  labelFormatter?: (value: string) => string;
  valueFormatter?: (value: number, name?: string) => string;
};

export function DashboardChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: DashboardChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const formattedLabel =
    label !== undefined
      ? labelFormatter
        ? labelFormatter(String(label))
        : String(label)
      : null;

  return (
    <div className="min-w-[9rem] rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm">
      {formattedLabel ? (
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          {formattedLabel}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const rawValue = Number(entry.value ?? 0);
          const displayValue = valueFormatter
            ? valueFormatter(rawValue, entry.name)
            : String(entry.value ?? 0);

          return (
            <div key={`${entry.name}-${entry.color}`} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color ?? "#1C3A34" }}
                />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="text-xs font-bold tabular-nums text-slate-900">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
