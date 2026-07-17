"use client";

import { cn } from "@/lib/utils";

type DashboardChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
    dataKey?: string | number;
  }>;
  label?: string | number;
  labelFormatter?: (value: string) => string;
  valueFormatter?: (value: number, name?: string) => string;
  className?: string;
};

/** Pass to Recharts `<Tooltip />` so the wrapper stays clear of default chrome. */
export const dashboardChartTooltipWrapperStyle = {
  outline: "none",
  zIndex: 40,
} as const;

export function DashboardChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  className,
}: DashboardChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  // Recharts ComposedChart can emit both Area + Line for the same series
  const uniquePayload = payload.filter((entry, index, list) => {
    const key = `${entry.dataKey ?? entry.name}-${entry.color}`;
    return (
      list.findIndex((item) => `${item.dataKey ?? item.name}-${item.color}` === key) === index &&
      entry.value !== undefined &&
      entry.value !== null
    );
  });

  if (uniquePayload.length === 0) {
    return null;
  }

  const formattedLabel =
    label !== undefined
      ? labelFormatter
        ? labelFormatter(String(label))
        : String(label)
      : null;

  return (
    <div
      className={cn(
        "min-w-[8.5rem] overflow-hidden rounded-lg border border-[#1C3A34]/15 shadow-[0_8px_20px_-6px_rgba(28,58,52,0.28)]",
        className,
      )}
      style={{ backgroundColor: "#ffffff", opacity: 1 }}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-[#1C3A34] via-[#2F5E54] to-[#C9B87A]" />

      <div className="px-2.5 py-2" style={{ backgroundColor: "#ffffff" }}>
        {formattedLabel ? (
          <p className="mb-1.5 text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            {formattedLabel}
          </p>
        ) : null}

        <ul className="space-y-1">
          {uniquePayload.map((entry) => {
            const rawValue = Number(entry.value ?? 0);
            const displayValue = valueFormatter
              ? valueFormatter(rawValue, entry.name)
              : String(entry.value ?? 0);

            return (
              <li
                key={`${entry.dataKey ?? entry.name}-${entry.color}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color ?? "#1C3A34" }}
                  />
                  <span className="truncate text-[11px] font-medium text-slate-500">
                    {entry.name}
                  </span>
                </span>
                <span className="text-[11px] font-bold tabular-nums tracking-tight text-[#1C3A34]">
                  {displayValue}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
