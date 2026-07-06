"use client";

import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import type { User } from "@smart-dispatch/types";
import { UserRequesterProfileSection } from "@/app/admin/users/_components/user-requester-profile-section";
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
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  fetchUserById,
  updateUserAccountActivation,
  updateUserAccountStatus,
} from "@/lib/user-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminUserRegistrationsMessages } from "@/translations";
import type { SupportedLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { RejectRegistrationModal } from "./reject-registration-modal";

function formatUserName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{value?.trim() || "—"}</p>
    </div>
  );
}

type ReviewRegistrationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  locale: SupportedLocale;
  canWrite: boolean;
  onSuccess: () => void;
};

export function ReviewRegistrationSheet({
  open,
  onOpenChange,
  userId,
  locale,
  canWrite,
  onSuccess,
}: ReviewRegistrationSheetProps) {
  const copy = getAdminUserRegistrationsMessages(locale);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    if (!open || !userId) {
      setUser(null);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      if (!userId) return;

      setLoading(true);

      try {
        const loadedUser = await fetchUserById(userId);
        if (!cancelled) {
          setUser(loadedUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          showErrorToast(copy.toast.loadFailed);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [open, userId, copy.toast.loadFailed]);

  const isPending =
    user?.account_activation === "pending" && user.account_status === "active";

  async function handleApprove() {
    if (!user) return;

    setSubmittingAction("approve");

    try {
      await updateUserAccountActivation(user.id, "activated");
      showSuccessToast({
        title: copy.toast.approveSuccess.title,
        description: formatMessage(copy.toast.approveSuccess.description, {
          name: formatUserName(user),
        }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.toast.approveFailed.description;
      showErrorToast({
        title: copy.toast.approveFailed.title,
        description: message,
      });
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleReject(reason: string) {
    if (!user) return;

    setSubmittingAction("reject");

    try {
      await updateUserAccountStatus(user.id, "deactivated", reason);
      showSuccessToast({
        title: copy.toast.rejectSuccess.title,
        description: formatMessage(copy.toast.rejectSuccess.description, {
          name: formatUserName(user),
        }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.toast.rejectFailed.description;
      showErrorToast({
        title: copy.toast.rejectFailed.title,
        description: message,
      });
      throw error;
    } finally {
      setSubmittingAction(null);
    }
  }

  const isRejected = user?.account_status === "deactivated";

  const submittedAt = user?.requester_profile?.created_at
    ? new Date(user.requester_profile.created_at).toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
        >
          <SheetHeader className="border-b border-slate-100 px-6 py-5">
            <SheetTitle className={adminHeadingClass}>{copy.review.title}</SheetTitle>
            <SheetDescription className="leading-relaxed">{copy.review.description}</SheetDescription>
            {submittedAt ? (
              <p className="text-xs font-medium text-slate-500">
                {formatMessage(copy.review.submittedAt, { date: submittedAt })}
              </p>
            ) : null}
          </SheetHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : user ? (
            <div className="flex-1 space-y-6 px-6 py-6">
              <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
                <div className="flex items-start gap-3">
                  <div className={cn(adminIconBoxClass, "shrink-0")}>
                    <UserRound className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">{copy.review.profileSection}</h3>
                    <p className="text-xs leading-relaxed text-slate-500">
                      {copy.review.profileSectionDescription}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileField label={copy.review.fields.firstName} value={user.first_name} />
                  <ProfileField label={copy.review.fields.middleName} value={user.middle_name} />
                  <ProfileField label={copy.review.fields.lastName} value={user.last_name} />
                  <ProfileField label={copy.review.fields.email} value={user.email} />
                  <ProfileField label={copy.review.fields.mobile} value={user.mobile_number} />
                </div>
              </section>

              {user.requester_profile ? <UserRequesterProfileSection user={user} /> : null}

              {isRejected && user.account_block_reason ? (
                <section className="space-y-3 rounded-lg border border-red-200 bg-red-50/60 p-5">
                  <h3 className="text-sm font-semibold text-red-900">{copy.review.rejectionReasonTitle}</h3>
                  <p className="text-sm leading-relaxed text-red-800">{user.account_block_reason}</p>
                  <p className="text-xs text-red-700/80">{copy.review.rejectionReasonHint}</p>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-slate-500">
              {copy.toast.loadFailed.description}
            </div>
          )}

          {canWrite && isPending && user ? (
            <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 px-6 py-5">
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-70"
                disabled={submittingAction !== null}
                onClick={() => setRejectOpen(true)}
              >
                {copy.review.reject}
              </Button>
              <Button
                type="button"
                className={adminPrimaryButtonClass}
                disabled={submittingAction !== null}
                onClick={() => void handleApprove()}
              >
                {submittingAction === "approve" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {copy.review.approving}
                  </>
                ) : (
                  copy.review.approve
                )}
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <RejectRegistrationModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={copy.rejectModal.title}
        description={
          user
            ? formatMessage(copy.rejectModal.description, { name: formatUserName(user) })
            : copy.rejectModal.description
        }
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
