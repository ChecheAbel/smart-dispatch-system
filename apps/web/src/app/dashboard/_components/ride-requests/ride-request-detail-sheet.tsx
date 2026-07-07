"use client";

import type { ComponentType, ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  CalendarClock,
  Car,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  Route,
  Shield,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import type { RideRequest, RideRequestRequesterSummary } from "@smart-dispatch/types";
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
import { adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { isValidCoordinatePair } from "@/lib/map/coordinates";
import {
  formatMessage,
  getCustomerRequestHistoryMessages,
  getCustomerRequestsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import {
  formatCoordinates,
  formatScheduledAt,
  formatSubmittedAt,
  statusBadgeClass,
} from "./ride-request-utils";

const LazyRideRequestRouteMap = dynamic(
  () =>
    import("./ride-request-route-map").then((mod) => mod.RideRequestRouteMap),
  { ssr: false },
);

type RideRequestManageActions = {
  canConfirm: boolean;
  canReject: boolean;
  canStart?: boolean;
  canComplete?: boolean;
  confirmLabel: string;
  rejectLabel: string;
  confirmingLabel: string;
  rejectingLabel: string;
  startLabel?: string;
  startingLabel?: string;
  completeLabel?: string;
  completingLabel?: string;
  onConfirm: () => void;
  onReject: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  submitting: "confirm" | "reject" | "start" | "complete" | null;
  startDisabled?: boolean;
  startDisabledTitle?: string;
  rejectButtonClassName?: string;
};

type RideRequestRequesterLabels = {
  section: string;
  description: string;
  email: string;
  mobile: string;
};

type RideRequestDetailSheetProps = {
  request: RideRequest | null;
  open: boolean;
  locale: string;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  showCustomerPolicy?: boolean;
  showCustomerActions?: boolean;
  requester?: RideRequestRequesterSummary;
  requesterLabels?: RideRequestRequesterLabels;
  manageActions?: RideRequestManageActions;
  dispatchPanel?: ReactNode;
};

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        <Icon className="size-3.5 text-[#C9B87A]" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

function RouteStopDetail({
  kind,
  label,
  savedLocationName,
  address,
  latitude,
  longitude,
  savedLocationLabel,
  customLocationLabel,
  coordinatesLabel,
}: {
  kind: "pickup" | "dropoff";
  label: string;
  savedLocationName?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  savedLocationLabel: string;
  customLocationLabel: string;
  coordinatesLabel: string;
}) {
  const isSaved = Boolean(savedLocationName);
  const coordinates = formatCoordinates(latitude, longitude);
  const hasCoordinates = isValidCoordinatePair(latitude ?? undefined, longitude ?? undefined);

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5">
      <div className="flex shrink-0 flex-col items-center pt-1 pl-1" aria-hidden>
        <span
          className={cn(
            "size-2.5 rounded-full ring-4",
            kind === "pickup"
              ? "bg-[#1C3A34] ring-[#1C3A34]/10"
              : "bg-[#C9B87A] ring-[#C9B87A]/20",
          )}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <Badge
            variant="outline"
            className="text-[10px] font-medium text-slate-500"
          >
            {isSaved ? savedLocationLabel : customLocationLabel}
          </Badge>
        </div>
        {savedLocationName ? (
          <p className="text-sm font-semibold text-[#1C3A34]">{savedLocationName}</p>
        ) : null}
        <p className={cn("text-sm text-slate-700", savedLocationName && "text-slate-600")}>
          {address}
        </p>
        {hasCoordinates && coordinates ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Navigation className="size-3 shrink-0" />
            <span>
              {coordinatesLabel}: {coordinates}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function formatRequesterName(requester: RideRequestRequesterSummary) {
  return [requester.first_name, requester.middle_name, requester.last_name].filter(Boolean).join(" ");
}

export function RideRequestDetailSheet({
  request,
  open,
  locale,
  onOpenChange,
  loading = false,
  title,
  description,
  emptyTitle,
  showCustomerPolicy = true,
  showCustomerActions = true,
  requester,
  requesterLabels,
  manageActions,
  dispatchPanel,
}: RideRequestDetailSheetProps) {
  const historyCopy = getCustomerRequestHistoryMessages(locale as "en" | "am");
  const requestCopy = getCustomerRequestsMessages(locale as "en" | "am");

  const sheetTitle = title ?? historyCopy.detailTitle;
  const sheetDescription = description ?? historyCopy.detailDescription;
  const sheetEmptyTitle = emptyTitle ?? historyCopy.emptyTitle;

  if (!open) {
    return null;
  }

  const policyMessage = request
    ? request.can_edit
      ? historyCopy.policyEdit
      : request.can_cancel
        ? request.cancel_deadline_at
          ? formatMessage(historyCopy.policyCancelDeadline, {
              time: formatSubmittedAt(request.cancel_deadline_at, locale),
            })
          : historyCopy.policyCancel
        : historyCopy.policyLocked
    : "";

  const scheduledLabel = request
    ? request.scheduled_at
      ? formatScheduledAt(request.scheduled_at, locale)
      : historyCopy.detailAsap
    : "";

  const shortRequestId = request ? request.id.slice(0, 8).toUpperCase() : "";
  const hasNotes = Boolean(request?.notes?.trim());
  const isSubmitting = Boolean(manageActions?.submitting);

  return (
    <Sheet open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200/80 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-sm text-slate-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {historyCopy.detailMapLoading}
          </div>
        ) : !request ? (
          <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-sm text-slate-500">
            {sheetEmptyTitle}
          </div>
        ) : (
          <>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-[#f8fafb] to-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-[#C9B87A]" />
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {requestCopy.scheduledAt}
                  </p>
                  <p className="text-base font-semibold text-[#1C3A34]">{scheduledLabel}</p>
                </div>
              </div>
              <Badge variant="outline" className={cn("shrink-0 text-xs", statusBadgeClass(request.status))}>
                {requestCopy.status[request.status]}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-200/60 pt-4">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {historyCopy.detailRequestId}
                </span>
                <span className="font-mono text-xs font-semibold text-[#1C3A34]">{shortRequestId}</span>
              </div>
              <span className="hidden h-3 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {historyCopy.submittedAt}
                </span>
                <span className="text-xs text-slate-700">
                  {formatSubmittedAt(request.created_at, locale)}
                </span>
              </div>
              <span className="hidden h-3 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {historyCopy.detailLastUpdated}
                </span>
                <span className="text-xs text-slate-700">
                  {formatSubmittedAt(request.updated_at, locale)}
                </span>
              </div>
            </div>
          </div>

          {requester && requesterLabels ? (
            <DetailSection title={requesterLabels.section} icon={UserRound}>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                <p className="text-sm font-semibold text-[#1C3A34]">{formatRequesterName(requester)}</p>
                <p className="mt-1 text-xs text-slate-500">{requesterLabels.description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailRow label={requesterLabels.email} value={requester.email} />
                  <DetailRow label={requesterLabels.mobile} value={requester.mobile_number} />
                </div>
              </div>
            </DetailSection>
          ) : null}

          {showCustomerPolicy ? (
          <p className="rounded-lg border border-slate-200/80 bg-[#f8fafb]/80 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            {policyMessage}
          </p>
          ) : null}

          {request.status === "cancelled" && request.rejection_reason ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-700">
                {historyCopy.detailRejectionReason}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-red-900">
                {request.rejection_reason}
              </p>
              <p className="mt-2 text-xs text-red-700/80">{historyCopy.detailRejectionReasonHint}</p>
            </div>
          ) : null}

          {!dispatchPanel && (request.assigned_vehicle || request.assigned_driver) ? (
            <DetailSection title={historyCopy.detailAssignmentSection} icon={Truck}>
              <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:grid-cols-2">
                <DetailRow
                  label={historyCopy.detailAssignedVehicle}
                  value={
                    request.assigned_vehicle
                      ? [
                          request.assigned_vehicle.plate_number,
                          [request.assigned_vehicle.make, request.assigned_vehicle.model]
                            .filter(Boolean)
                            .join(" "),
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "—"
                  }
                />
                <DetailRow
                  label={historyCopy.detailAssignedDriver}
                  value={request.assigned_driver?.name ?? "—"}
                />
                {request.assigned_driver?.mobile_number ? (
                  <DetailRow
                    label={historyCopy.detailAssignedDriverMobile}
                    value={request.assigned_driver.mobile_number}
                  />
                ) : null}
                {request.started_at ? (
                  <DetailRow
                    label={historyCopy.detailTripStartedAt}
                    value={formatSubmittedAt(request.started_at, locale)}
                  />
                ) : null}
                {request.completed_at ? (
                  <DetailRow
                    label={historyCopy.detailTripCompletedAt}
                    value={formatSubmittedAt(request.completed_at, locale)}
                  />
                ) : null}
              </div>
            </DetailSection>
          ) : null}

          {dispatchPanel}

          <DetailSection title={historyCopy.detailRouteSection} icon={Route}>
            <div className="space-y-2">
              <RouteStopDetail
                kind="pickup"
                label={historyCopy.detailPickupPoint}
                savedLocationName={request.pickup_location?.name}
                address={request.pickup_address}
                latitude={request.pickup_latitude}
                longitude={request.pickup_longitude}
                savedLocationLabel={historyCopy.detailSavedLocation}
                customLocationLabel={historyCopy.detailCustomLocation}
                coordinatesLabel={historyCopy.detailCoordinates}
              />
              <div className="ml-3 h-4 w-px bg-gradient-to-b from-[#1C3A34]/30 to-[#C9B87A]/70" aria-hidden />
              <RouteStopDetail
                kind="dropoff"
                label={historyCopy.detailDropoffPoint}
                savedLocationName={request.dropoff_location?.name}
                address={request.dropoff_address}
                latitude={request.dropoff_latitude}
                longitude={request.dropoff_longitude}
                savedLocationLabel={historyCopy.detailSavedLocation}
                customLocationLabel={historyCopy.detailCustomLocation}
                coordinatesLabel={historyCopy.detailCoordinates}
              />
            </div>

            <LazyRideRequestRouteMap
              visible={open}
              locale={locale}
              height={420}
              pickupLatitude={request.pickup_latitude}
              pickupLongitude={request.pickup_longitude}
              dropoffLatitude={request.dropoff_latitude}
              dropoffLongitude={request.dropoff_longitude}
              pickupName={request.pickup_location?.name ?? request.pickup_address}
              dropoffName={request.dropoff_location?.name ?? request.dropoff_address}
              pickupTypeLabel={historyCopy.detailPickupPoint}
              dropoffTypeLabel={historyCopy.detailDropoffPoint}
              loadingLabel={historyCopy.detailMapLoading}
              emptyLabel={historyCopy.detailMapEmpty}
              recenterLabel={historyCopy.detailMapRecenter}
              distanceLabel={historyCopy.detailMapDistance}
              durationLabel={historyCopy.detailMapDuration}
              straightLineLabel={historyCopy.detailMapStraightLine}
              distanceUnitKm={historyCopy.detailMapDistanceUnitKm}
              distanceUnitM={historyCopy.detailMapDistanceUnitM}
            />
          </DetailSection>

          <DetailSection title={historyCopy.detailTripSection} icon={Car}>
            <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:grid-cols-2">
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
            </div>
          </DetailSection>

          {hasNotes ? (
            <DetailSection title={historyCopy.detailNotesSection} icon={FileText}>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {request.notes?.trim()}
                </p>
              </div>
            </DetailSection>
          ) : null}

          {showCustomerActions ? (
          <DetailSection title={historyCopy.detailActionsSection} icon={Shield}>
            <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:grid-cols-2">
              <DetailRow
                label={historyCopy.detailCanEdit}
                value={request.can_edit ? historyCopy.detailYes : historyCopy.detailNo}
              />
              <DetailRow
                label={historyCopy.detailCanCancel}
                value={request.can_cancel ? historyCopy.detailYes : historyCopy.detailNo}
              />
              {request.cancel_deadline_at ? (
                <DetailRow
                  className="sm:col-span-2"
                  label={historyCopy.detailCancelDeadline}
                  value={formatSubmittedAt(request.cancel_deadline_at, locale)}
                />
              ) : null}
            </div>
          </DetailSection>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
              <Users className="size-3 text-[#C9B87A]" />
              {formatMessage(requestCopy.passengersCount, { count: request.passenger_count })}
            </span>
            {request.region ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600">
                <MapPin className="size-3 text-[#C9B87A]" />
                {request.region.name}
              </span>
            ) : null}
          </div>
        </div>

        {manageActions &&
        (manageActions.canConfirm ||
          manageActions.canReject ||
          manageActions.canStart ||
          manageActions.canComplete) ? (
          <SheetFooter className="shrink-0 border-t border-slate-200/80 px-6 py-4 sm:flex-row sm:justify-end">
            {manageActions.canReject ? (
              <Button
                type="button"
                variant="outline"
                className={
                  manageActions.rejectButtonClassName ??
                  "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
                }
                disabled={isSubmitting}
                onClick={manageActions.onReject}
              >
                {manageActions.submitting === "reject"
                  ? manageActions.rejectingLabel
                  : manageActions.rejectLabel}
              </Button>
            ) : null}
            {manageActions.canConfirm ? (
              <Button
                type="button"
                className={adminPrimaryButtonClass}
                disabled={isSubmitting}
                onClick={manageActions.onConfirm}
              >
                {manageActions.submitting === "confirm"
                  ? manageActions.confirmingLabel
                  : manageActions.confirmLabel}
              </Button>
            ) : null}
            {manageActions.canStart ? (
              <Button
                type="button"
                className={adminPrimaryButtonClass}
                disabled={isSubmitting || manageActions.startDisabled}
                title={manageActions.startDisabled ? manageActions.startDisabledTitle : undefined}
                onClick={manageActions.onStart}
              >
                {manageActions.submitting === "start"
                  ? manageActions.startingLabel
                  : manageActions.startLabel}
              </Button>
            ) : null}
            {manageActions.canComplete ? (
              <Button
                type="button"
                className={adminPrimaryButtonClass}
                disabled={isSubmitting}
                onClick={manageActions.onComplete}
              >
                {manageActions.submitting === "complete"
                  ? manageActions.completingLabel
                  : manageActions.completeLabel}
              </Button>
            ) : null}
          </SheetFooter>
        ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
