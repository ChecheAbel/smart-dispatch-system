"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Route,
  Save,
  UserRound,
  UsersRound,
} from "lucide-react";
import type {
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
} from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  adminHeadingClass,
  adminPrimaryButtonClass,
  adminSelectTriggerClass,
} from "@/lib/admin-theme";
import { updateComplaint } from "@/lib/complaint-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getCategoryBadge, getPriorityBadge, getStatusBadge } from "./complaint-badges";
import type { ComplaintUiStrings } from "./complaint-ui-strings";

interface ManageComplaintSheetProps {
  selected: Complaint | null;
  onClose: () => void;
  canWrite: boolean;
  locale: string;
  copy: ComplaintUiStrings;
  statusOptions: { value: string; label: string }[];
  priorityOptions: { value: string; label: string }[];
  onSaved: () => void;
}

export function ManageComplaintSheet({
  selected,
  onClose,
  canWrite,
  locale,
  copy,
  statusOptions,
  priorityOptions,
  onSaved,
}: ManageComplaintSheetProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: "submitted" as ComplaintStatus,
    priority: "medium" as ComplaintPriority,
    admin_response: "",
  });

  useEffect(() => {
    if (selected) {
      setForm({
        status: selected.status,
        priority: selected.priority,
        admin_response: selected.admin_response || "",
      });
    }
  }, [selected]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !canWrite) return;

    setSaving(true);
    try {
      await updateComplaint(selected.id, {
        status: form.status,
        priority: form.priority,
        admin_response: form.admin_response || undefined,
      });
      showSuccessToast({ title: copy.saved });
      onSaved();
      onClose();
    } catch (error) {
      showErrorToast({
        title: copy.updateFailed,
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={Boolean(selected)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="flex flex-col gap-0 overflow-hidden border-l-slate-200 bg-slate-50 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[44rem] data-[side=right]:sm:max-w-[calc(100vw-2rem)] dark:border-l-border dark:bg-background">
        <SheetHeader className="relative overflow-hidden border-b border-slate-200 bg-white px-5 py-6 pr-14 sm:px-7 dark:border-border dark:bg-card">
          <div className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] blur-2xl" />
          <div className="relative flex flex-wrap items-center gap-2">
            <Badge className="border-[var(--brand-primary)]/15 bg-[var(--brand-primary)] font-mono text-white hover:bg-[var(--brand-primary)] dark:border-[var(--brand-accent)]/30 dark:bg-[var(--brand-accent)] dark:text-slate-950">
              {selected?.reference_number}
            </Badge>
            {selected ? (
              <>
                {getCategoryBadge(selected.category, copy)}
                {getStatusBadge(form.status, copy)}
                {getPriorityBadge(form.priority, copy)}
              </>
            ) : null}
          </div>
          <SheetTitle className={`${adminHeadingClass} relative mt-3 text-2xl leading-tight`}>
            {selected?.subject}
          </SheetTitle>
          <SheetDescription className="relative mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {selected
                ? new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(selected.created_at))
                : null}
            </span>
            <span>
              {copy.lastUpdated}:{" "}
              {selected
                ? new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(selected.updated_at))
                : null}
            </span>
          </SheetDescription>
        </SheetHeader>

        {selected ? (
          <form
            id="manage-complaint"
            onSubmit={handleSubmit}
            className="min-h-0 flex-1 divide-y divide-slate-200/90 overflow-y-auto px-4 dark:divide-border sm:px-7"
          >
            {/* Requester Information */}
            <section className="space-y-3 py-5 sm:py-6">
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">
                  {copy.customerDetails}
                </h3>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-base font-bold text-white dark:bg-[var(--brand-accent)] dark:text-slate-950">
                    {selected.requester.name ? selected.requester.name.slice(0, 1).toUpperCase() : "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900 dark:text-foreground">
                      {selected.requester.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-muted-foreground">
                      {copy.requester}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-muted-foreground">
                        <Mail className="size-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 truncate">{selected.requester.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-muted-foreground">
                        <Phone className="size-3.5 shrink-0 text-slate-400" />
                        <span>{selected.requester.mobile_number || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Issue Description & Linked Ride */}
            <section className="space-y-3 py-5 sm:py-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">
                  {copy.complaintDetails}
                </h3>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-muted-foreground">
                  {selected.description}
                </p>

                <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 dark:border-border dark:bg-muted/30">
                  <span className="mt-0.5 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]">
                    {selected.ride_request ? (
                      <Route className="size-4" />
                    ) : (
                      <MapPin className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
                      {copy.relatedRide}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-800 dark:text-foreground">
                      {selected.ride_request ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span>{selected.ride_request.pickup_address}</span>
                          <ArrowRight className="size-3 text-slate-400" />
                          <span>{selected.ride_request.dropoff_address}</span>
                        </span>
                      ) : (
                        copy.noRide
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Workflow & Priority Level */}
            <section className="space-y-4 py-5 sm:py-6">
              <div>
                <div className="flex items-center gap-2">
                  <UsersRound className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">
                    {copy.workflow}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                  {copy.workflowDescription}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="complaint-status" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    {copy.status}
                  </Label>
                  <Select
                    items={statusOptions}
                    disabled={!canWrite}
                    value={form.status}
                    onValueChange={(value) =>
                      value && setForm((prev) => ({ ...prev, status: value as ComplaintStatus }))
                    }
                  >
                    <SelectTrigger id="complaint-status" className={adminSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="complaint-priority" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    {copy.priority}
                  </Label>
                  <Select
                    items={priorityOptions}
                    disabled={!canWrite}
                    value={form.priority}
                    onValueChange={(value) =>
                      value && setForm((prev) => ({ ...prev, priority: value as ComplaintPriority }))
                    }
                  >
                    <SelectTrigger id="complaint-priority" className={adminSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Official Response & Resolution */}
            <section className="space-y-3 py-5 sm:py-6">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">
                    {copy.resolution}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                  {copy.resolutionHint}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="complaint-response" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                  {copy.response}
                </Label>
                <Textarea
                  id="complaint-response"
                  className="min-h-36 resize-y rounded-xl border-slate-200 bg-white leading-relaxed shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/20 dark:border-border dark:bg-muted/40 dark:text-foreground"
                  maxLength={2000}
                  placeholder={copy.responsePlaceholder}
                  disabled={!canWrite}
                  value={form.admin_response}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, admin_response: event.target.value }))
                  }
                />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{copy.resolutionHint}</span>
                  <span className="tabular-nums font-mono">{form.admin_response.length}/2000</span>
                </div>
              </div>
            </section>
          </form>
        ) : null}

        <SheetFooter className="border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-border dark:bg-card">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto text-xs"
          >
            {copy.cancel}
          </Button>

          {canWrite ? (
            <Button
              className={cn(adminPrimaryButtonClass, "w-full sm:w-auto text-xs gap-1.5")}
              type="submit"
              form="manage-complaint"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{copy.saving}</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>{copy.save}</span>
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{copy.readOnly}</p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
