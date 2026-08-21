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
}: {
  rating: DriverRatingSummary | null | undefined;
  unratedLabel: string;
  countTemplate: string;
}) {
  if (!rating || rating.count === 0 || rating.average == null) {
    return <span className="text-slate-400">{unratedLabel}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <DriverRatingStars value={rating.average} />
      <span className="tabular-nums text-sm font-semibold text-slate-800">
        {rating.average.toFixed(1)}
      </span>
      <span className="text-xs text-slate-500">
        {formatMessage(countTemplate, { count: rating.count })}
      </span>
    </div>
  );
}
