"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarClock } from "lucide-react";
import type { DriverShiftTemplate } from "@smart-dispatch/types";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminHeadingClass } from "@/lib/admin-theme";
import {
  createDriverShiftTemplate,
  deleteDriverShiftTemplate,
  fetchDriverShiftTemplates,
  updateDriverShiftTemplate,
} from "@/lib/driver-shift-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/translations";
import { shiftTemplateLabel } from "./shift-helpers";
import { ShiftPeriodForm, type PeriodFormState } from "./shift-period-form";
import { ShiftPeriodItem } from "./shift-period-item";

type PeriodsCopy = {
  button: string;
  title: string;
  description: string;
  add: string;
  edit: string;
  save: string;
  cancel: string;
  name: string;
  start: string;
  end: string;
  active: string;
  inactive: string;
  empty: string;
  hoursHint: string;
  toast: {
    created: { title: string; description: string };
    updated: { title: string; description: string };
    deleted: { title: string; description: string };
    failed: { title: string; description: string };
  };
  delete: {
    title: string;
    description: string;
    confirm: string;
    cancel: string;
    deleting: string;
  };
};

type ShiftPeriodsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  templateLabels: Record<string, string>;
  copy: PeriodsCopy;
  canWrite: boolean;
  onChanged: () => void;
};

const emptyForm: PeriodFormState = {
  name: "",
  startTime: "06:00",
  endTime: "14:00",
  active: true,
};

export function ShiftPeriodsSheet({
  open,
  onOpenChange,
  locale,
  templateLabels,
  copy,
  canWrite,
  onChanged,
}: ShiftPeriodsSheetProps) {
  const [templates, setTemplates] = useState<DriverShiftTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PeriodFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<DriverShiftTemplate | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setEditingId(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const next = await fetchDriverShiftTemplates(true);
        if (!cancelled) setTemplates(next);
      } catch (error) {
        if (!cancelled) {
          showErrorToast({
            title: copy.toast.failed.title,
            description: error instanceof Error ? error.message : copy.toast.failed.description,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [copy.toast.failed, open]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(template: DriverShiftTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      startTime: template.start_time,
      endTime: template.end_time,
      active: template.active,
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updateDriverShiftTemplate(editingId, {
          name: form.name.trim(),
          start_time: form.startTime,
          end_time: form.endTime,
          active: form.active,
        });
        showSuccessToast(copy.toast.updated);
      } else {
        await createDriverShiftTemplate({
          name: form.name.trim(),
          start_time: form.startTime,
          end_time: form.endTime,
          active: form.active,
        });
        showSuccessToast(copy.toast.created);
      }

      const next = await fetchDriverShiftTemplates(true);
      setTemplates(next);
      startCreate();
      onChanged();
    } catch (error) {
      showErrorToast({
        title: copy.toast.failed.title,
        description: error instanceof Error ? error.message : copy.toast.failed.description,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteDriverShiftTemplate(deleting.id);
      showSuccessToast(copy.toast.deleted);
      const next = await fetchDriverShiftTemplates(true);
      setTemplates(next);
      if (editingId === deleting.id) startCreate();
      setDeleting(null);
      onChanged();
    } catch (error) {
      showErrorToast({
        title: copy.toast.failed.title,
        description: error instanceof Error ? error.message : copy.toast.failed.description,
      });
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-slate-200/80 px-4 pb-3.5 pt-4 dark:border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/10 text-[#1C3A34] dark:bg-muted dark:text-foreground">
                <CalendarClock className="size-4" />
              </div>
              <div className="min-w-0">
                <SheetTitle className={cn("text-base font-bold", adminHeadingClass)}>
                  {copy.title}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  {copy.description}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="space-y-2">
                <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-muted" />
                <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-muted" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 p-8 text-center dark:border-border">
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-muted dark:text-muted-foreground">
                  <CalendarClock className="size-4" />
                </div>
                <p className="text-xs text-slate-500">{copy.empty}</p>
              </div>
            ) : (
              templates.map((template) => (
                <ShiftPeriodItem
                  key={template.id}
                  template={template}
                  templateLabels={templateLabels}
                  isEditing={editingId === template.id}
                  locale={locale}
                  canWrite={canWrite}
                  activeLabel={copy.active}
                  inactiveLabel={copy.inactive}
                  editLabel={copy.edit}
                  deleteLabel={copy.delete.confirm}
                  onEdit={startEdit}
                  onDelete={setDeleting}
                />
              ))
            )}
          </div>

          {canWrite ? (
            <ShiftPeriodForm
              form={form}
              onChange={setForm}
              onSubmit={handleSubmit}
              onCancel={startCreate}
              isEditing={Boolean(editingId)}
              submitting={submitting}
              copy={copy}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <DeleteConfirmModal
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        itemName={deleting ? shiftTemplateLabel(deleting, templateLabels) : undefined}
        title={copy.delete.title}
        description={
          deleting
            ? formatMessage(copy.delete.description, {
                name: shiftTemplateLabel(deleting, templateLabels),
              })
            : copy.delete.description
        }
        cancelLabel={copy.delete.cancel}
        confirmLabel={copy.delete.confirm}
        deletingLabel={copy.delete.deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
