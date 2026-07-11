"use client";

import { useEffect, useState } from "react";
import type { AdminRideRequest, RideRequestStatus } from "@smart-dispatch/types";
import { RideRequestDetailSheet } from "@/app/dashboard/_components/ride-requests/ride-request-detail-sheet";
import { RejectRegistrationModal } from "@/app/admin/user-registrations/_components/reject-registration-modal";
import { AdminRideRequestDispatchPanel } from "./admin-ride-request-dispatch-panel";
import { formatScheduledAt } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import {
  assignAdminRideRequest,
  fetchAdminRideRequest,
  unassignAdminRideRequest,
  updateAdminRideRequestStatus,
} from "@/lib/admin-ride-request-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminRideRequestsMessages, formatMessage } from "@/translations";
import type { SupportedLocale } from "@/lib/locale";

type AdminRideRequestReviewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
  locale: SupportedLocale;
  canWrite: boolean;
  onSuccess: (result?: { status: RideRequestStatus }) => void;
};

type SubmittingAction = "confirm" | "reject" | "assign" | "unassign" | "start" | "complete" | null;

export function AdminRideRequestReviewSheet({
  open,
  onOpenChange,
  requestId,
  locale,
  canWrite,
  onSuccess,
}: AdminRideRequestReviewSheetProps) {
  const copy = getAdminRideRequestsMessages(locale);
  const [request, setRequest] = useState<AdminRideRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState<SubmittingAction>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isDetailLoading =
    open &&
    Boolean(requestId) &&
    !loadError &&
    (loading || !request || request.id !== requestId);

  const sheetDescription =
    request?.status === "cancelled"
      ? copy.review.rejectedDescription
      : request?.status === "completed"
        ? copy.review.completedDescription
        : request?.status === "in_progress"
          ? copy.review.inProgressDescription
          : copy.review.description;

  const isBusy = Boolean(submitting);

  useEffect(() => {
    if (!open || !requestId) {
      setRequest(null);
      setLoading(false);
      setLoadError(false);
      return;
    }

    let cancelled = false;

    async function loadRequest() {
      if (!requestId) {
        return;
      }

      setLoading(true);
      setLoadError(false);

      try {
        const loaded = await fetchAdminRideRequest(requestId, locale);
        if (!cancelled) {
          setRequest(loaded);
        }
      } catch {
        if (!cancelled) {
          setRequest(null);
          setLoadError(true);
          showErrorToast({ title: copy.toast.loadFailed });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRequest();

    return () => {
      cancelled = true;
    };
  }, [copy.toast.loadFailed, locale, open, requestId]);

  async function handleConfirm() {
    if (!request) {
      return;
    }

    setSubmitting("confirm");

    try {
      const updated = await updateAdminRideRequestStatus(request.id, "confirm", { locale });
      setRequest(updated);
      showSuccessToast({ title: copy.toast.approved });
      onSuccess({ status: updated.status });
      onOpenChange(false);
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.toast.approveFailed,
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleReject(reason: string) {
    if (!request) {
      return;
    }

    setSubmitting("reject");

    try {
      const updated = await updateAdminRideRequestStatus(request.id, "reject", {
        locale,
        rejectionReason: reason,
      });
      setRequest(updated);
      showSuccessToast({ title: copy.toast.rejected });
      onSuccess({ status: updated.status });
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.toast.rejectFailed,
      });
      throw error;
    } finally {
      setSubmitting(null);
    }
  }

  async function handleAssign(vehicleId: string) {
    if (!request) {
      return;
    }

    setSubmitting("assign");

    try {
      const updated = await assignAdminRideRequest(request.id, vehicleId, { locale });
      setRequest(updated);
      showSuccessToast({ title: copy.toast.assigned });
      onSuccess({ status: updated.status });
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.toast.assignFailed,
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleUnassign() {
    if (!request) {
      return;
    }

    setSubmitting("unassign");

    try {
      const updated = await unassignAdminRideRequest(request.id, { locale });
      setRequest(updated);
      showSuccessToast({ title: copy.toast.unassigned });
      onSuccess({ status: updated.status });
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.toast.unassignFailed,
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleStart() {
    if (!request) {
      return;
    }

    setSubmitting("start");

    try {
      const updated = await updateAdminRideRequestStatus(request.id, "start", { locale });
      setRequest(updated);
      showSuccessToast({ title: copy.toast.started });
      onSuccess({ status: updated.status });
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.toast.startFailed,
      });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleComplete() {
    if (!request) {
      return;
    }

    setSubmitting("complete");

    try {
      const updated = await updateAdminRideRequestStatus(request.id, "complete", { locale });
      setRequest(updated);
      showSuccessToast({ title: copy.toast.completed });
      onSuccess({ status: updated.status });
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.toast.completeFailed,
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <RideRequestDetailSheet
        request={request}
        open={open}
        locale={locale}
        loading={isDetailLoading}
        title={copy.review.title}
        description={sheetDescription}
        emptyTitle={loadError ? copy.toast.loadFailed : copy.review.loadEmpty}
        showCustomerPolicy={false}
        showCustomerActions={false}
        requester={request?.requester}
        requesterLabels={{
          section: copy.review.requesterSection,
          description: copy.review.requesterSectionDescription,
          email: copy.review.email,
          mobile: copy.review.mobile,
        }}
        onOpenChange={(next) => !isBusy && onOpenChange(next)}
        dispatchPanel={
          request ? (
            <div className="space-y-4">
              <AdminRideRequestDispatchPanel
                request={request}
                locale={locale}
                canWrite={canWrite}
                submitting={submitting === "assign" || submitting === "unassign" ? submitting : null}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
              />
            </div>
          ) : null
        }
        manageActions={
          canWrite && request
            ? {
                canConfirm: request.can_admin_confirm,
                canReject: request.can_admin_reject,
                canStart: request.can_admin_start || request.start_blocked_by_schedule,
                canComplete: request.can_admin_complete,
                confirmLabel: copy.review.approve,
                rejectLabel: copy.review.reject,
                confirmingLabel: copy.review.approving,
                rejectingLabel: copy.review.rejecting,
                startLabel: copy.review.startTrip,
                startingLabel: copy.review.startingTrip,
                completeLabel: copy.review.completeTrip,
                completingLabel: copy.review.completingTrip,
                startDisabled: request.start_blocked_by_schedule,
                startDisabledTitle: request.start_blocked_by_schedule
                  ? request.scheduled_at
                    ? formatMessage(copy.review.startTripScheduleBlocked, {
                        time: formatScheduledAt(request.scheduled_at, locale),
                      })
                    : copy.review.startTripScheduleBlocked
                  : undefined,
                onConfirm: () => void handleConfirm(),
                onReject: () => setRejectOpen(true),
                onStart: () => void handleStart(),
                onComplete: () => void handleComplete(),
                submitting:
                  submitting === "confirm" ||
                  submitting === "reject" ||
                  submitting === "start" ||
                  submitting === "complete"
                    ? submitting
                    : null,
                rejectButtonClassName:
                  "border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 hover:!text-white",
              }
            : undefined
        }
      />

      <RejectRegistrationModal
        open={rejectOpen}
        onOpenChange={(next) => !isBusy && setRejectOpen(next)}
        title={copy.rejectModal.title}
        description={copy.rejectModal.description}
        reasonLabel={copy.rejectModal.reasonLabel}
        reasonPlaceholder={copy.rejectModal.reasonPlaceholder}
        reasonRequired={copy.rejectModal.reasonRequired}
        reasonTooLong={copy.rejectModal.reasonTooLong}
        cancelLabel={copy.rejectModal.cancel}
        confirmLabel={copy.rejectModal.confirm}
        rejectingLabel={copy.review.rejecting}
        onConfirm={handleReject}
      />
    </>
  );
}
