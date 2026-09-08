"use client";

import { Star } from "lucide-react";
import type { DriverRatingSummary } from "@smart-dispatch/types";
import { formatMessage } from "@/translations";
import { cn } from "@/lib/utils";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export function DriverRatingStars({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const filled = Math.round(value);
  const starClass = size === "md" ? "size-5" : "size-3.5";

  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {STAR_VALUES.map((star) => (
        <Star
          key={star}
          className={cn(
            starClass,
            star <= filled
              ? "fill-[#C9B87A] text-[#9A8644]"
              : "fill-slate-100 text-slate-200",
          )}
        />
      ))}
    </div>
  );
}

export function DriverRatingCell({
  rating,
  unratedLabel,
  countTemplate,
  compact = true,
}: {
  rating: DriverRatingSummary | null | undefined;
  unratedLabel: string;
  countTemplate: string;
  compact?: boolean;
}) {
  if (!rating || rating.count === 0 || rating.average == null) {
    return <span className="text-xs text-slate-400 italic whitespace-nowrap">{unratedLabel}</span>;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1 rounded-md border border-[#C9B87A]/30 bg-[#C9B87A]/10 px-1.5 py-0.5 dark:border-[#C9B87A]/25 dark:bg-[#C9B87A]/15">
          <Star className="size-3.5 fill-[#C9B87A] text-[#9A8644]" />
          <span className="tabular-nums text-xs font-bold text-slate-800 dark:text-foreground">
            {rating.average.toFixed(1)}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 tabular-nums dark:text-muted-foreground">
          ({formatMessage(countTemplate, { count: rating.count })})
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <DriverRatingStars value={rating.average} />
      <span className="tabular-nums text-sm font-semibold text-slate-800 dark:text-foreground">
        {rating.average.toFixed(1)}
      </span>
      <span className="text-xs text-slate-500 dark:text-muted-foreground">
        {formatMessage(countTemplate, { count: rating.count })}
      </span>
    </div>
  );
}

