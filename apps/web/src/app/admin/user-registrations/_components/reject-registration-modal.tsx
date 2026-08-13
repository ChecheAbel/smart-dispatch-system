"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, UserX } from "lucide-react";
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
  helperText?: string;
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
  helperText,
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
      <DialogContent showCloseButton={!submitting} className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b border-red-100 bg-red-50/80 px-5 py-4 dark:border-red-400/20 dark:bg-red-400/10">
          <div className="flex items-start gap-3 pr-6">
            <div className="mt-0.5 rounded-xl bg-red-600 p-2 text-white shadow-sm">
              <AlertTriangle className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className={cn("text-base font-semibold", adminHeadingClass)}>
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="registration-rejection-reason"
              className="text-sm font-medium text-slate-700 dark:text-foreground"
            >
              {reasonLabel}
            </Label>
            <textarea
              id="registration-rejection-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (error) setError(null);
              }}
              placeholder={reasonPlaceholder}
              rows={4}
              maxLength={MAX_REASON_LENGTH}
              disabled={submitting}
              className={cn(
                "w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition",
                "border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-200/70",
                "disabled:opacity-70 dark:border-border dark:bg-muted/40 dark:text-foreground dark:focus:border-red-400/50 dark:focus:ring-red-400/20",
                error && "border-red-300 focus:border-red-400",
              )}
            />
            <div className="flex items-center justify-between gap-3">
              {error ? (
                <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
              ) : helperText ? (
                <p className="text-xs text-slate-400 dark:text-muted-foreground">{helperText}</p>
              ) : (
                <span />
              )}
              <p className="shrink-0 text-xs tabular-nums text-slate-400 dark:text-muted-foreground">
                {reason.length}/{MAX_REASON_LENGTH}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:justify-end dark:border-border dark:bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200 dark:border-border"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
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

type ConfirmActionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmingLabel: string;
  onConfirm: () => void | Promise<void>;
  tone?: "danger" | "warning";
};

export function ConfirmActionModal({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmingLabel,
  onConfirm,
  tone = "warning",
}: ConfirmActionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const isDanger = tone === "danger";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!submitting} className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div
          className={cn(
            "border-b px-5 py-4",
            isDanger
              ? "border-red-100 bg-red-50/80 dark:border-red-400/20 dark:bg-red-400/10"
              : "border-orange-100 bg-orange-50/80 dark:border-orange-400/20 dark:bg-orange-400/10",
          )}
        >
          <div className="flex items-start gap-3 pr-6">
            <div
              className={cn(
                "mt-0.5 rounded-xl p-2 text-white shadow-sm",
                isDanger ? "bg-red-600" : "bg-orange-500",
              )}
            >
              {isDanger ? <AlertTriangle className="size-4" /> : <UserX className="size-4" />}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className={cn("text-base font-semibold", adminHeadingClass)}>
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </div>

        {error ? (
          <p className="px-5 pt-4 text-sm text-red-600 dark:text-red-300">{error}</p>
        ) : null}

        <DialogFooter className="gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:justify-end dark:border-border dark:bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-slate-200 dark:border-border"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className={cn(
              "text-white",
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-600 hover:bg-orange-700",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {confirmingLabel}
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
