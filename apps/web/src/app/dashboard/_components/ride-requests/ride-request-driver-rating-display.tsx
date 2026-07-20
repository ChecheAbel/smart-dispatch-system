"use client";

import { MessageSquareQuote, Star } from "lucide-react";
import type { RideRequestDriverRating } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import { adminPrimaryButtonClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/translations";
import { formatSubmittedAt } from "./ride-request-utils";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export type RideRequestDriverRatingDisplayLabels = {
  section: string;
  noComment: string;
  ratedOn: string;
  /** Shown under the score (admin). */
  scoreCaption?: string;
  commentLabel?: string;
  /** Customer rate CTA */
  description?: string;
  rateDriver?: string;
  /** Admin empty state */
  pendingTitle?: string;
  pendingDescription?: string;
};

type RideRequestDriverRatingDisplayProps = {
  rating: RideRequestDriverRating | null;
  driverName: string;
  locale: string;
  variant: "customer" | "admin";
  labels: RideRequestDriverRatingDisplayLabels;
  onRateDriver?: () => void;
};

function RatingStars({ value, size = "md" }: { value: number; size?: "md" | "lg" }) {
  const starClass = size === "lg" ? "size-6 sm:size-7" : "size-4";
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {STAR_VALUES.map((star) => {
        const lit = star <= value;
        return (
          <Star
            key={star}
            className={cn(
              starClass,
              lit
                ? "fill-[#C9B87A] text-[#9A8644] drop-shadow-[0_1px_4px_rgba(201,184,122,0.35)]"
                : "fill-slate-100 text-slate-200",
            )}
          />
        );
      })}
    </div>
  );
}

export function RideRequestDriverRatingSection({
  request,
  locale,
  variant,
  labels,
  onRateDriver,
}: {
  request: {
    status: string;
    assigned_driver: { name: string } | null;
    driver_rating: RideRequestDriverRating | null;
    can_rate_driver: boolean;
  };
  locale: string;
  variant: "customer" | "admin";
  labels: RideRequestDriverRatingDisplayLabels;
  onRateDriver?: () => void;
}) {
  if (request.status !== "completed" || !request.assigned_driver) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        <Star className="size-3.5 text-[#C9B87A]" />
        {labels.section}
      </h3>
      <RideRequestDriverRatingDisplay
        variant={variant}
        rating={request.driver_rating}
        driverName={request.assigned_driver.name}
        locale={locale}
        labels={labels}
        onRateDriver={
          variant === "customer" && request.can_rate_driver && onRateDriver
            ? onRateDriver
            : undefined
        }
      />
    </section>
  );
}

export function RideRequestDriverRatingDisplay({
  rating,
  driverName,
  locale,
  variant,
  labels,
  onRateDriver,
}: RideRequestDriverRatingDisplayProps) {
  if (rating) {
    const comment = rating.comment?.trim();

    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200/80",
          variant === "admin"
            ? "bg-gradient-to-br from-[#f8fafb] via-white to-[#C9B87A]/5"
            : "bg-white",
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
          <div className="space-y-2">
            {variant === "admin" && labels.scoreCaption ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {labels.scoreCaption}
              </p>
            ) : null}
            <div className="flex items-end gap-2 tabular-nums">
              <span className="text-4xl font-extrabold leading-none tracking-tight text-[#1C3A34] sm:text-5xl">
                {rating.rating}
              </span>
              <span className="pb-1 text-base font-semibold text-slate-400 sm:text-lg">/5</span>
            </div>
            <RatingStars value={rating.rating} size={variant === "admin" ? "lg" : "md"} />
          </div>

          {variant === "admin" ? (
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {driverName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatMessage(labels.ratedOn, {
                  date: formatSubmittedAt(rating.created_at, locale),
                })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {formatMessage(labels.ratedOn, {
                date: formatSubmittedAt(rating.created_at, locale),
              })}
            </p>
          )}
        </div>

        <div className="border-t border-slate-200/70 bg-white/70 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-[#C9B87A]" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1">
              {labels.commentLabel ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {labels.commentLabel}
                </p>
              ) : null}
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  comment ? "text-slate-700" : "italic text-slate-400",
                )}
              >
                {comment || labels.noComment}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "customer" && onRateDriver && labels.description && labels.rateDriver) {
    return (
      <div className="rounded-xl border border-dashed border-[#C9B87A]/50 bg-[#C9B87A]/5 p-4">
        <p className="text-sm text-slate-600">{labels.description}</p>
        <Button type="button" className={cn(adminPrimaryButtonClass, "mt-3")} onClick={onRateDriver}>
          <Star className="size-4" />
          {labels.rateDriver}
        </Button>
      </div>
    );
  }

  if (variant === "admin" && labels.pendingTitle) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <Star className="size-5 text-slate-300" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[#1C3A34]">{labels.pendingTitle}</p>
            {labels.pendingDescription ? (
              <p className="text-sm leading-relaxed text-slate-500">{labels.pendingDescription}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
