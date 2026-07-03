"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminHeadingClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { formatMessage, getTranslations } from "@/translations";

type DeleteConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  deletingLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function DeleteConfirmModal({
  open,
  onOpenChange,
  itemName,
  title,
  description,
  cancelLabel,
  confirmLabel,
  deletingLabel,
  onConfirm,
}: DeleteConfirmModalProps) {
  const { locale } = useLocale();
  const copy = getTranslations(locale).common.deleteModal;

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = itemName?.trim() || copy.fallbackName;
  const resolvedTitle = title ?? formatMessage(copy.title, { name });
  const resolvedDescription = description ?? copy.description;

  useEffect(() => {
    if (!open) {
      setDeleting(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!deleting) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent showCloseButton={!deleting} className="gap-4 p-5 sm:max-w-sm">
        <div className="space-y-1 pr-6">
          <DialogTitle className={cn("text-base font-semibold", adminHeadingClass)}>
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {resolvedDescription}
          </DialogDescription>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="border-slate-200"
          >
            {cancelLabel ?? copy.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {deletingLabel ?? copy.deleting}
              </>
            ) : (
              confirmLabel ?? copy.confirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
