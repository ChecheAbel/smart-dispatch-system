"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { adminHeadingClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

const MAX_REASON_LENGTH = 500;

type RejectRegistrationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonRequired: string;
  reasonTooLong: string;
  cancelLabel: string;
  confirmLabel: string;
  rejectingLabel: string;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function RejectRegistrationModal({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  reasonRequired,
  reasonTooLong,
  cancelLabel,
  confirmLabel,
  rejectingLabel,
  onConfirm,
}: RejectRegistrationModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError(reasonRequired);
      return;
    }

    if (trimmedReason.length > MAX_REASON_LENGTH) {
      setError(reasonTooLong);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm(trimmedReason);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : reasonRequired);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent showCloseButton={!submitting} className="gap-4 p-5 sm:max-w-md">
        <div className="space-y-1 pr-6">
          <DialogTitle className={cn("text-base font-semibold", adminHeadingClass)}>
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">{description}</DialogDescription>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registration-rejection-reason" className="text-sm font-medium text-slate-600">
            {reasonLabel}
          </Label>
          <textarea
            id="registration-rejection-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={reasonPlaceholder}
            rows={4}
            maxLength={MAX_REASON_LENGTH}
            disabled={submitting}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#1C3A34] focus:ring-2 focus:ring-[#1C3A34]/15 disabled:opacity-70"
          />
          <p className="text-xs text-slate-400">
            {reason.length}/{MAX_REASON_LENGTH}
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {rejectingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
