"use client";

import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { Car, MapPin, Star } from "lucide-react";
import type { RideRequest } from "@smart-dispatch/types";
import { AdminTextareaField } from "@/components/shared/admin-form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  adminBadgeGoldClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { rateRideRequestDriver } from "@/lib/ride-request-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getCustomerRequestHistoryMessages } from "@/translations";
import { cn } from "@/lib/utils";

type RateDriverSheetProps = {
  request: RideRequest | null;
  open: boolean;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onRated: (request: RideRequest) => void;
};

function driverInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

type DriverRatingStarsProps = {
  value: number;
  hoverValue: number;
  scoreLabel: string;
  hint: string;
  selectedLabel: (count: number) => string;
  starLabel: (count: number) => string;
  onChange: (value: number) => void;
  onHoverChange: (value: number) => void;
};

function DriverRatingStars({
  value,
  hoverValue,
  scoreLabel,
  hint,
  selectedLabel,
  starLabel,
  onChange,
  onHoverChange,
}: DriverRatingStarsProps) {
  const display = hoverValue || value;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const current = value || 0;
    if (event.key === "ArrowRight") {
      onChange(Math.min(5, current + 1));
    } else {
      onChange(Math.max(1, current - 1));
    }
  }

  return (
    <div
      className="rounded-2xl bg-gradient-to-b from-[#C9B87A]/10 via-[#f8fafb] to-transparent px-3 py-6 sm:px-5"
      onMouseLeave={() => onHoverChange(0)}
    >
      <div
        className="mb-5 flex min-h-[3.25rem] items-end justify-center gap-1 tabular-nums"
        aria-live="polite"
      >
        {display > 0 ? (
          <>
            <span className="text-5xl font-extrabold leading-none tracking-tight text-[#1C3A34]">
              {display}
            </span>
            <span className="pb-1 text-lg font-semibold text-slate-400">/5</span>
          </>
        ) : (
          <span className="text-5xl font-extrabold leading-none text-transparent" aria-hidden>
            0
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label={scoreLabel}
        className="flex items-center justify-center"
        onKeyDown={handleKeyDown}
      >
        {STAR_VALUES.map((starValue) => {
          const lit = starValue <= display;
          const committed = starValue <= value;
          const isActive = value === starValue;

          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={starLabel(starValue)}
              onMouseEnter={() => onHoverChange(starValue)}
              onFocus={() => onHoverChange(starValue)}
              onBlur={() => onHoverChange(0)}
              onClick={() => onChange(starValue)}
              className={cn(
                "group relative rounded-xl p-1.5 transition-all duration-200 sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B87A]/45 focus-visible:ring-offset-2",
                lit && "scale-[1.06]",
                isActive && committed && "scale-[1.1]",
              )}
              style={{ transitionDelay: lit ? `${starValue * 20}ms` : "0ms" }}
            >
              <span
                className={cn(
                  "pointer-events-none absolute inset-1.5 rounded-lg opacity-0 transition-opacity duration-200 sm:inset-2",
                  lit && "opacity-100 bg-[#C9B87A]/15",
                )}
                aria-hidden
              />
              <Star
                strokeWidth={lit ? 1.35 : 1.15}
                className={cn(
                  "relative size-9 transition-all duration-200 sm:size-11",
                  lit
                    ? "fill-[#C9B87A] text-[#9A8644] drop-shadow-[0_2px_8px_rgba(201,184,122,0.45)]"
                    : "fill-slate-50 text-slate-200 group-hover:fill-[#C9B87A]/20 group-hover:text-[#C9B87A]/70",
                  !lit && "group-hover:scale-105",
                )}
              />
            </button>
          );
        })}
      </div>

      <p
        className={cn(
          "mt-4 text-center text-sm font-medium transition-colors",
          value > 0 ? "text-[#1C3A34]" : "text-slate-500",
        )}
      >
        {value > 0 ? selectedLabel(value) : hint}
      </p>
    </div>
  );
}

export function RateDriverSheet({
  request,
  open,
  locale,
  onOpenChange,
  onRated,
}: RateDriverSheetProps) {
  const historyCopy = getCustomerRequestHistoryMessages(locale as "en" | "am");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setHoverRating(0);
    setComment("");
  }, [open, request?.id]);

  const driverName = request?.assigned_driver?.name ?? historyCopy.rating.unknownDriver;
  const commentLength = comment.length;

  const vehicleLine = useMemo(() => {
    if (!request?.assigned_vehicle) return null;
    const makeModel = [request.assigned_vehicle.make, request.assigned_vehicle.model]
      .filter(Boolean)
      .join(" ");
    return [request.assigned_vehicle.plate_number, makeModel].filter(Boolean).join(" · ");
  }, [request?.assigned_vehicle]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!request) return;

    if (rating < 1) {
      showErrorToast({ title: historyCopy.rating.required });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await rateRideRequestDriver(
        request.id,
        { rating, comment: comment.trim() || null },
        locale,
      );
      showSuccessToast({ title: historyCopy.toast.rated });
      onRated(updated);
      onOpenChange(false);
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : historyCopy.errors.rateFailed,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200/80 bg-gradient-to-br from-[#f8fafb] to-white px-6 py-5 text-left">
          <Badge className={cn("mb-2 w-fit", adminBadgeGoldClass)}>{historyCopy.rating.section}</Badge>
          <SheetTitle className={cn("text-xl", adminHeadingClass)}>{historyCopy.rating.title}</SheetTitle>
          <SheetDescription className="max-w-md text-sm leading-relaxed text-slate-500">
            {historyCopy.rating.description}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#f8fafb] to-white p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#1C3A34] text-lg font-bold text-white shadow-sm">
                  {driverInitials(driverName)}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className={adminEyebrowClass}>{historyCopy.detailAssignedDriver}</p>
                    <p className="mt-1 text-lg font-extrabold tracking-tight text-[#1C3A34]">
                      {driverName}
                    </p>
                  </div>
                  {vehicleLine ? (
                    <p className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Car className="size-3.5 shrink-0 text-[#C9B87A]" />
                      <span className="truncate">{vehicleLine}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {request ? (
                <div className="mt-4 space-y-1.5 border-t border-slate-200/60 pt-4">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                    <span className="line-clamp-1 font-medium">{request.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                    <span className="line-clamp-1 font-medium">{request.dropoff_address}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <section className="space-y-3">
              <p className={adminEyebrowClass}>{historyCopy.rating.scoreLabel}</p>
              <DriverRatingStars
                value={rating}
                hoverValue={hoverRating}
                scoreLabel={historyCopy.rating.scoreLabel}
                hint={historyCopy.rating.hint}
                selectedLabel={(count) =>
                  historyCopy.rating.selected.replace("{count}", String(count))
                }
                starLabel={(count) =>
                  historyCopy.rating.starLabel.replace("{count}", String(count))
                }
                onChange={setRating}
                onHoverChange={setHoverRating}
              />
            </section>

            <section className="space-y-2">
              <AdminTextareaField
                id="driver-rating-comment"
                label={historyCopy.rating.commentLabel}
                optional
                optionalLabel={historyCopy.rating.optional}
                placeholder={historyCopy.rating.commentPlaceholder}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
              />
              <p className="text-right text-[11px] font-medium text-slate-400">
                {commentLength}/500
              </p>
            </section>
          </div>

          <SheetFooter className="shrink-0 gap-2 border-t border-slate-200/80 bg-white px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg border-slate-200"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              {historyCopy.rating.cancel}
            </Button>
            <Button
              type="submit"
              className={cn(adminPrimaryButtonClass, "min-w-[9rem]")}
              disabled={submitting || rating < 1}
            >
              <Star className={cn("size-4", rating > 0 && "fill-[#C9B87A] text-[#C9B87A]")} />
              {submitting ? historyCopy.rating.submitting : historyCopy.rating.submit}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
