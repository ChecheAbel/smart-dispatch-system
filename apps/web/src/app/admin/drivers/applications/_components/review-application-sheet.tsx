"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { DriverApplication } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  approveDriverApplication,
  fetchDriverApplicationById,
  rejectDriverApplication,
  resolveUploadUrl,
} from "@/lib/driver-application-api";
import { adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminDriverApplicationsMessages } from "@/translations";
import { cn } from "@/lib/utils";

type ReviewApplicationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string | null;
  canWrite: boolean;
  onSuccess?: () => void;
};

function formatApplicantName(application: DriverApplication) {
  return [application.first_name, application.middle_name, application.last_name]
    .filter(Boolean)
    .join(" ");
}

function formatSubmittedAt(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-[#f8fafb]/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#1C3A34] break-words">{value}</p>
    </div>
  );
}

export function ReviewApplicationSheet({
  open,
  onOpenChange,
  applicationId,
  canWrite,
  onSuccess,
}: ReviewApplicationSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminDriverApplicationsMessages(locale);
  const reviewCopy = copy.review;

  const [application, setApplication] = useState<DriverApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    if (!open || !applicationId) {
      setApplication(null);
      return;
    }

    let cancelled = false;

    async function loadApplication() {
      setLoading(true);

      try {
        const nextApplication = await fetchDriverApplicationById(applicationId!);
        if (!cancelled) {
          setApplication(nextApplication);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : copy.toast.loadFailed.description;
          showErrorToast({
            title: copy.toast.loadFailed.title,
            description: message,
          });
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadApplication();

    return () => {
      cancelled = true;
    };
  }, [applicationId, copy.toast.loadFailed, onOpenChange, open]);

  const photoUrl = resolveUploadUrl(application?.license_photo_url);

  async function handleApprove() {
    if (!application) return;

    setApproving(true);

    try {
      await approveDriverApplication(application.id);
      showSuccessToast({
        title: copy.toast.approveSuccess.title,
        description: formatMessage(copy.toast.approveSuccess.description, {
          name: formatApplicantName(application),
        }),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.toast.approveFailed.description;
      showErrorToast({
        title: copy.toast.approveFailed.title,
        description: message,
      });
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!application) return;

    try {
      await rejectDriverApplication(application.id);
      showSuccessToast({
        title: copy.toast.rejectSuccess.title,
        description: formatMessage(copy.toast.rejectSuccess.description, {
          name: formatApplicantName(application),
        }),
      });
      setRejectOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.toast.rejectFailed.description;
      showErrorToast({
        title: copy.toast.rejectFailed.title,
        description: message,
      });
      throw err;
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
        >
          <SheetHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
            <SheetTitle className={adminHeadingClass}>{reviewCopy.title}</SheetTitle>
            <SheetDescription className="leading-relaxed">{reviewCopy.description}</SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {loading || !application ? (
              <div className="space-y-4">
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : (
              <>
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#1C3A34]">{reviewCopy.applicantSection}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label={copy.columns.name} value={formatApplicantName(application)} />
                    <DetailItem label={copy.columns.email} value={application.email} />
                    <DetailItem label={copy.columns.mobile} value={application.mobile_number} />
                    <DetailItem
                      label={reviewCopy.submittedAt}
                      value={formatSubmittedAt(application.submitted_at, locale)}
                    />
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#1C3A34]">{reviewCopy.licenseSection}</h3>
                  <DetailItem label={reviewCopy.licenseNumber} value={application.license_number} />

                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {reviewCopy.licensePhoto}
                    </p>
                    {photoUrl ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafb]/80">
                        <div className="flex min-h-64 items-center justify-center bg-slate-100 p-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt={`${formatApplicantName(application)} license`}
                            className="max-h-80 w-full object-contain"
                          />
                        </div>
                        <div className="border-t border-slate-200 px-4 py-3">
                          <a
                            href={photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#1C3A34] hover:underline"
                          >
                            <ExternalLink className="size-4" />
                            {reviewCopy.openPhoto}
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                        {reviewCopy.noPhoto}
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          <SheetFooter
            className={cn(
              "mt-auto shrink-0 flex-row items-center gap-3 border-t border-slate-200/80 bg-[#f8fafb]/95 px-6 py-4",
              canWrite && application && !loading ? "justify-between" : "justify-end",
            )}
          >
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 rounded-lg border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-[#f8fafb]"
              onClick={() => onOpenChange(false)}
              disabled={approving || rejectOpen}
            >
              {reviewCopy.cancel}
            </Button>

            {canWrite && application && !loading ? (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  className="h-10 shrink-0 gap-2 whitespace-nowrap px-4"
                  disabled={approving || rejectOpen}
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="size-4" />
                  {copy.actions.reject}
                </Button>
                <Button
                  type="button"
                  className={cn(adminPrimaryButtonClass, "h-10 shrink-0 gap-2 whitespace-nowrap px-4")}
                  disabled={approving || rejectOpen}
                  onClick={() => void handleApprove()}
                >
                  <CheckCircle2 className="size-4" />
                  {approving ? reviewCopy.approving : copy.actions.approve}
                </Button>
              </div>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DeleteConfirmModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        itemName={application ? formatApplicantName(application) : undefined}
        title={reviewCopy.rejectConfirmTitle}
        description={reviewCopy.rejectConfirmDescription}
        cancelLabel={reviewCopy.rejectCancel}
        confirmLabel={reviewCopy.rejectConfirm}
        deletingLabel={reviewCopy.rejecting}
        onConfirm={handleReject}
      />
    </>
  );
}

export { formatApplicantName };
