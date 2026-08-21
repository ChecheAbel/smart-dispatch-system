"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { DriverShiftTemplate } from "@smart-dispatch/types";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { adminHeadingClass, adminInputClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import {
  createDriverShiftTemplate,
  deleteDriverShiftTemplate,
  fetchDriverShiftTemplates,
  updateDriverShiftTemplate,
} from "@/lib/driver-shift-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/translations";
import { formatShiftHours, shiftBadgeClass, shiftDotClass, shiftTemplateLabel } from "./shift-helpers";

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

type PeriodForm = {
  name: string;
  startTime: string;
  endTime: string;
  active: boolean;
};

const emptyForm: PeriodForm = {
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
  const [form, setForm] = useState<PeriodForm>(emptyForm);
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
    await deleteDriverShiftTemplate(deleting.id);
    showSuccessToast(copy.toast.deleted);
    const next = await fetchDriverShiftTemplates(true);
    setTemplates(next);
    if (editingId === deleting.id) startCreate();
    setDeleting(null);
    onChanged();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className={adminHeadingClass}>{copy.title}</SheetTitle>
            <SheetDescription>{copy.description}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-2">
            {loading ? (
              <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-muted" />
            ) : templates.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.empty}</p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 dark:border-border dark:bg-card"
                >
                  <span className={cn("size-2.5 shrink-0 rounded-full", shiftDotClass(template.slug))} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-slate-800 dark:text-foreground">
                        {shiftTemplateLabel(template, templateLabels)}
                      </p>
                      {!template.active ? (
                        <Badge variant="outline" className="text-[10px]">
                          {copy.inactive}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={cn("text-[10px]", shiftBadgeClass(template.slug))}>
                          {copy.active}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs tabular-nums text-slate-500">
                      {formatShiftHours(template.start_time, template.end_time, locale)}
                    </p>
                  </div>
                  {canWrite ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copy.edit}
                        onClick={() => startEdit(template)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-600 hover:text-red-700"
                        aria-label={copy.delete.confirm}
                        onClick={() => setDeleting(template)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {canWrite ? (
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-200 p-4 dark:border-border">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#1C3A34] dark:text-foreground">
                  {editingId ? copy.edit : copy.add}
                </p>
                {editingId ? (
                  <Button type="button" variant="ghost" size="sm" onClick={startCreate}>
                    {copy.cancel}
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-period-name">{copy.name}</Label>
                <Input
                  id="shift-period-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className={adminInputClass}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="shift-period-start">{copy.start}</Label>
                  <Input
                    id="shift-period-start"
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                    className={adminInputClass}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift-period-end">{copy.end}</Label>
                  <Input
                    id="shift-period-end"
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                    className={adminInputClass}
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">{copy.hoursHint}</p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-border">
                <Label htmlFor="shift-period-active">{copy.active}</Label>
                <Switch
                  id="shift-period-active"
                  checked={form.active}
                  onCheckedChange={(active) => setForm((current) => ({ ...current, active }))}
                />
              </div>
              <Button type="submit" className={cn(adminPrimaryButtonClass, "w-full")} disabled={submitting}>
                <Plus />
                {copy.save}
              </Button>
            </form>
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
