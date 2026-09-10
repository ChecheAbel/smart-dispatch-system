"use client";

import { useState } from "react";
import { Check, CheckCircle2, ChevronDown, Clock, Loader2, Navigation, X } from "lucide-react";
import type { RideRequestLeg, RideRequestStatus } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateRideRequestLegStatus } from "@/lib/admin-ride-request-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";

interface RideRequestLegActionMenuProps {
  rideRequestId: string;
  leg: RideRequestLeg;
  locale?: string;
  onSuccess: () => void;
}

const COPY = {
  en: {
    actions: "Actions",
    startLeg: "Start Leg",
    completeLeg: "Complete Leg",
    cancelLeg: "Cancel Leg",
    completeDialogTitle: "Complete Itinerary Leg",
    completeDialogDesc: "Record the actual standby/waiting time spent by the driver at this stop.",
    actualWaitLabel: "Actual Standby / Wait Time (minutes)",
    plannedWaitHint: "Planned wait time was",
    minutes: "min",
    confirmComplete: "Confirm & Complete Leg",
    cancel: "Cancel",
    toastStarted: "Leg marked in progress",
    toastCompleted: "Leg marked completed",
    toastCancelled: "Leg cancelled",
    errorUpdating: "Failed to update leg status",
  },
  am: {
    actions: "ተግባራት",
    startLeg: "ምዕራፍ ጀምር",
    completeLeg: "ምዕራፍ ጨርስ",
    cancelLeg: "ምዕራፍ ሰርዝ",
    completeDialogTitle: "የጉዞ ምዕራፉን አጠናቅቅ",
    completeDialogDesc: "ሹፌሩ በዚህ ማረፊያ ያሳለፈውን ትክክለኛ የቆይታ ጊዜ ይመዝግቡ።",
    actualWaitLabel: "ትክክለኛ የቆይታ ጊዜ (ደቂቃዎች)",
    plannedWaitHint: "የታቀደው የቆይታ ጊዜ",
    minutes: "ደቂቃ",
    confirmComplete: "አረጋግጥና አጠናቅቅ",
    cancel: "ተመለስ",
    toastStarted: "ምዕራፉ በሂደት ላይ እንዲሆን ተደርጓል",
    toastCompleted: "ምዕራፉ በተሳካ ሁኔታ ተጠናቋል",
    toastCancelled: "ምዕራፉ ተሰርዟል",
    errorUpdating: "የምዕራፉን ሁኔታ ማዘመን አልተቻለም",
  },
};

export function RideRequestLegActionMenu({
  rideRequestId,
  leg,
  locale = "en",
  onSuccess,
}: RideRequestLegActionMenuProps) {
  const isAm = locale === "am";
  const copy = isAm ? COPY.am : COPY.en;

  const [loading, setLoading] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [waitMinutes, setWaitMinutes] = useState<number>(leg.planned_wait_minutes ?? 0);

  const handleUpdateStatus = async (status: RideRequestStatus, actualWait?: number) => {
    try {
      setLoading(true);
      await updateRideRequestLegStatus(rideRequestId, leg.id, {
        status,
        actual_wait_minutes: actualWait,
      });

      if (status === "in_progress") {
        showSuccessToast({ title: copy.toastStarted });
      } else if (status === "completed") {
        showSuccessToast({ title: copy.toastCompleted });
      } else if (status === "cancelled") {
        showSuccessToast({ title: copy.toastCancelled });
      }

      setCompleteOpen(false);
      onSuccess();
    } catch (err) {
      showErrorToast({
        title: err instanceof Error ? err.message : copy.errorUpdating,
      });
    } finally {
      setLoading(false);
    }
  };

  if (leg.status === "completed" || leg.status === "cancelled") {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {leg.status === "pending" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => handleUpdateStatus("in_progress")}
          className="h-7 cursor-pointer gap-1 px-2.5 text-xs font-semibold text-[#1C3A34] hover:bg-[#1C3A34]/10 dark:text-[#C9B87A] dark:hover:bg-[#C9B87A]/20"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Navigation className="size-3" />
          )}
          <span>{copy.startLeg}</span>
        </Button>
      ) : null}

      {leg.status === "in_progress" ? (
        <Button
          type="button"
          size="sm"
          disabled={loading}
          onClick={() => {
            setWaitMinutes(leg.planned_wait_minutes ?? 0);
            setCompleteOpen(true);
          }}
          className="h-7 cursor-pointer gap-1 bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3" />
          )}
          <span>{copy.completeLeg}</span>
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
              aria-label={copy.actions}
            />
          }
        >
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 text-xs">
          {leg.status === "pending" ? (
            <DropdownMenuItem
              onClick={() => handleUpdateStatus("in_progress")}
              className="gap-2 cursor-pointer"
            >
              <Navigation className="size-3.5 text-sky-600" />
              <span>{copy.startLeg}</span>
            </DropdownMenuItem>
          ) : null}
          {leg.status === "in_progress" ? (
            <DropdownMenuItem
              onClick={() => {
                setWaitMinutes(leg.planned_wait_minutes ?? 0);
                setCompleteOpen(true);
              }}
              className="gap-2 cursor-pointer"
            >
              <Check className="size-3.5 text-emerald-600" />
              <span>{copy.completeLeg}</span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleUpdateStatus("cancelled")}
            className="gap-2 text-red-600 cursor-pointer focus:text-red-700"
          >
            <X className="size-3.5" />
            <span>{copy.cancelLeg}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1C3A34] dark:text-foreground">
              {copy.completeDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {copy.completeDialogDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-card">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {leg.dropoff_address || leg.pickup_address}
              </p>
              <p className="mt-1 text-slate-500">
                {copy.plannedWaitHint}:{" "}
                <span className="font-semibold text-[#1C3A34] dark:text-[#C9B87A]">
                  {leg.planned_wait_minutes} {copy.minutes}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {copy.actualWaitLabel}
              </label>
              <div className="relative mt-1">
                <Clock className="pointer-events-none absolute top-2.5 left-3 size-4 text-slate-400" />
                <Input
                  type="number"
                  min="0"
                  max="1440"
                  value={waitMinutes}
                  onChange={(e) => setWaitMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className={`${adminInputClass} pl-9`}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setCompleteOpen(false)}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={() => handleUpdateStatus("completed", waitMinutes)}
              className={adminPrimaryButtonClass}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              <span>{copy.confirmComplete}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
