"use client";

import type { RideRequest } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminHeadingClass } from "@/lib/admin-theme";
import {
  formatMessage,
  getCustomerRequestHistoryMessages,
  getCustomerRequestsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatScheduledAt, formatSubmittedAt, statusBadgeClass } from "./ride-request-utils";

type RideRequestDetailSheetProps = {
  request: RideRequest | null;
  open: boolean;
  locale: string;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

export function RideRequestDetailSheet({
  request,
  open,
  locale,
  onOpenChange,
}: RideRequestDetailSheetProps) {
  const historyCopy = getCustomerRequestHistoryMessages(locale as "en" | "am");
  const requestCopy = getCustomerRequestsMessages(locale as "en" | "am");

  if (!request) {
    return null;
  }

  const policyMessage = request.can_edit
    ? historyCopy.policyEdit
    : request.can_cancel
      ? request.cancel_deadline_at
        ? formatMessage(historyCopy.policyCancelDeadline, {
            time: formatSubmittedAt(request.cancel_deadline_at, locale),
          })
        : historyCopy.policyCancel
      : historyCopy.policyLocked;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200/80 pb-4">
          <SheetTitle className={adminHeadingClass}>{historyCopy.detailTitle}</SheetTitle>
          <SheetDescription>{historyCopy.detailDescription}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", statusBadgeClass(request.status))}>
              {requestCopy.status[request.status]}
            </Badge>
            <span className="text-xs text-slate-500">
              {historyCopy.submittedAt}: {formatSubmittedAt(request.created_at, locale)}
            </span>
          </div>

          <p className="rounded-lg border border-slate-200/80 bg-[#f8fafb]/80 px-3 py-2 text-xs leading-relaxed text-slate-600">
            {policyMessage}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label={requestCopy.pickupAddress} value={request.pickup_address} />
            <DetailRow label={requestCopy.dropoffAddress} value={request.dropoff_address} />
            <DetailRow
              label={requestCopy.scheduledAt}
              value={formatScheduledAt(request.scheduled_at, locale)}
            />
            <DetailRow
              label={requestCopy.passengerCount}
              value={formatMessage(requestCopy.passengersCount, { count: request.passenger_count })}
            />
            <DetailRow
              label={requestCopy.vehicleType}
              value={request.vehicle_type?.name ?? "—"}
            />
            <DetailRow
              label={requestCopy.vehicleClass}
              value={request.vehicle_class?.name ?? "—"}
            />
            <DetailRow label={requestCopy.region} value={request.region?.name ?? "—"} />
            <DetailRow
              label={requestCopy.notes}
              value={request.notes?.trim() || "—"}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
