"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, Clock3, Eye, ListFilter, Mail, MapPin, MessageSquare, Phone, RotateCcw, Route, ShieldAlert, UserRound, UsersRound } from "lucide-react";
import type { Complaint, ComplaintPriority, ComplaintStatus, ComplaintSummary } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { DataTable, type DataTableColumn, type DataTableFetchParams } from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { adminFilterLabelClass, adminHeadingClass, adminPrimaryButtonClass, adminSelectTriggerClass } from "@/lib/admin-theme";
import { fetchAdminComplaints, fetchComplaintSummary, updateComplaint } from "@/lib/complaint-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

const statuses: ComplaintStatus[] = ["submitted", "under_review", "in_progress", "resolved", "closed", "rejected"];
const priorities: ComplaintPriority[] = ["low", "medium", "high", "urgent"];

function statusBadgeClass(status: ComplaintStatus) {
  if (status === "resolved" || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200";
  }
  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200";
  }
  if (status === "in_progress" || status === "under_review") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200";
}

function priorityBadgeClass(priority: ComplaintPriority) {
  if (priority === "urgent") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200";
  }
  if (priority === "high") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200";
  }
  return "border-slate-200 bg-white text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground";
}

const copyFor = (am: boolean) => ({
  title: am ? "የቅሬታ አስተዳደር" : "Complaint management", description: am ? "የደንበኞችን ቅሬታ ይከታተሉ እና ምላሽ ይስጡ።" : "Review, respond to, and resolve customer complaints.", workflow: am ? "የስራ ሂደት" : "Workflow", workflowDescription: am ? "የቅሬታውን የሂደት ሁኔታ እና ቅድሚያ ያዘምኑ።" : "Update the complaint status and priority.", customerDetails: am ? "የደንበኛ መረጃ" : "Customer details", complaintDetails: am ? "የቅሬታ ዝርዝር" : "Complaint details", resolution: am ? "ምላሽ እና መፍትሄ" : "Response & resolution", resolutionHint: am ? "ይህ ምላሽ ለደንበኛው ይታያል።" : "This response will be visible to the customer.", responsePlaceholder: am ? "የተወሰደውን እርምጃ እና መፍትሄ ያስገቡ" : "Explain the action taken and the resolution provided", lastUpdated: am ? "መጨረሻ የተዘመነው" : "Last updated", readOnly: am ? "የማንበብ ፈቃድ ብቻ" : "Read-only access",
  total: am ? "ጠቅላላ" : "Total complaints", open: am ? "ክፍት" : "Open", urgent: am ? "አስቸኳይ" : "Urgent", resolved: am ? "የተፈታ" : "Resolved", requester: am ? "ጠያቂ" : "Requester", complaint: am ? "ቅሬታ" : "Complaint", category: am ? "ምድብ" : "Category", priority: am ? "ቅድሚያ" : "Priority", status: am ? "ሁኔታ" : "Status", submitted: am ? "የቀረበበት" : "Submitted", manage: am ? "አስተዳድር" : "Manage", response: am ? "ይፋዊ ምላሽ" : "Official response", save: am ? "ለውጦችን አስቀምጥ" : "Save changes", saved: am ? "ቅሬታው ተዘምኗል።" : "Complaint updated.", details: am ? "የደንበኛ መግለጫ" : "Customer description", relatedRide: am ? "ተዛማጅ ጉዞ" : "Related ride", noRide: am ? "የለም" : "None", empty: am ? "ምንም ቅሬታ የለም" : "No complaints found", filterTitle: am ? "ማጣሪያዎች" : "Filters", filterDescription: am ? "ቅሬታዎችን በሁኔታ እና በቅድሚያ ያጣሩ።" : "Narrow complaints by workflow status and priority.", allStatuses: am ? "ሁሉም ሁኔታዎች" : "All statuses", allPriorities: am ? "ሁሉም ቅድሚያዎች" : "All priorities", clearFilters: am ? "ማጣሪያዎችን አጽዳ" : "Clear filters",
});

export function ComplaintManagementPage() {
  const { locale } = useLocale(); const copy = copyFor(locale === "am"); const { hasPermission } = useAuth();
  const canRead = hasPermission(PERMISSIONS.complaints.read); const canWrite = hasPermission(PERMISSIONS.complaints.write);
  const [summary, setSummary] = useState<ComplaintSummary | null>(null); const [refresh, setRefresh] = useState(0); const [selected, setSelected] = useState<Complaint | null>(null); const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); const [priorityFilter, setPriorityFilter] = useState("all");
  const [form, setForm] = useState({ status: "submitted" as ComplaintStatus, priority: "medium" as ComplaintPriority, admin_response: "" });
  const statusOptions = useMemo(() => statuses.map((value) => ({ value, label: value.replace("_", " ") })), []);
  const priorityOptions = useMemo(() => priorities.map((value) => ({ value, label: value })), []);
  useEffect(() => { if (!canRead) return; void fetchComplaintSummary(true).then(setSummary).catch(() => setSummary(null)); }, [canRead, refresh]);
  function manage(row: Complaint) { setSelected(row); setForm({ status: row.status, priority: row.priority, admin_response: row.admin_response || "" }); }
  const load = useCallback(({ page, limit, search }: DataTableFetchParams) => fetchAdminComplaints({ page, limit, search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter as ComplaintStatus, priority: priorityFilter === "all" ? undefined : priorityFilter as ComplaintPriority }), [priorityFilter, statusFilter]);
  const columns = useMemo<DataTableColumn<Complaint>[]>(() => [
    { id: "reference", header: "Reference", cell: (r) => <span className="font-mono font-semibold">{r.reference_number}</span> },
    { id: "requester", header: copy.requester, cell: (r) => <div><p className="font-medium">{r.requester.name}</p><p className="text-xs text-muted-foreground">{r.requester.mobile_number}</p></div> },
    { id: "complaint", header: copy.complaint, cell: (r) => <div className="max-w-72"><p className="font-medium">{r.subject}</p><p className="truncate text-xs text-muted-foreground">{r.description}</p></div> },
    { id: "category", header: copy.category, cell: (r) => <span className="capitalize">{r.category}</span> },
    { id: "priority", header: copy.priority, cell: (r) => <Badge variant="outline" className={`capitalize ${priorityBadgeClass(r.priority)}`}>{r.priority}</Badge> },
    { id: "status", header: copy.status, cell: (r) => <Badge variant="outline" className={`capitalize ${statusBadgeClass(r.status)}`}>{r.status.replace("_", " ")}</Badge> },
    { id: "submitted", header: copy.submitted, cell: (r) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(r.created_at)) },
  ], [copy, locale]);
  async function save(event: FormEvent) { event.preventDefault(); if (!selected) return; setSaving(true); try { await updateComplaint(selected.id, { ...form, admin_response: form.admin_response.trim() || null }); showSuccessToast({ title: copy.saved }); setSelected(null); setRefresh((v) => v + 1); } catch (error) { showErrorToast({ title: error instanceof Error ? error.message : "Update failed" }); } finally { setSaving(false); } }
  if (!canRead) return <PageAccessDenied copy={{ eyebrow: "Restricted", title: "Access denied", description: "You do not have permission to manage complaints.", permissionNote: "Complaint permission required", sessionHint: "Ask an administrator to grant complaints.read.", goToDashboard: "Go to dashboard" }} />;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title={copy.total} value={summary?.total ?? 0} description={copy.description} icon={MessageSquare} loading={!summary}/><StatCard title={copy.open} value={summary?.open ?? 0} description={copy.description} icon={CircleAlert} loading={!summary}/><StatCard title={copy.urgent} value={summary?.urgent ?? 0} description={copy.description} icon={ShieldAlert} loading={!summary}/><StatCard title={copy.resolved} value={summary?.resolved ?? 0} description={copy.description} icon={CheckCircle2} loading={!summary}/></div>
    <DataTable
      title={copy.title}
      description={copy.description}
      columns={columns}
      fetchData={load}
      getRowKey={(r) => r.id}
      showIndexColumn
      refreshDeps={[refresh, statusFilter, priorityFilter]}
      emptyIcon={MessageSquare}
      emptyTitle={copy.empty}
      actionsColumnHeader={copy.manage}
      renderRowActions={(r) => <Button size="icon-sm" variant="outline" aria-label={copy.manage} title={copy.manage} onClick={() => manage(r)}><Eye className="size-4" /></Button>}
      minTableWidth="1100px"
      filterBar={
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] text-[var(--brand-primary)] dark:bg-accent dark:text-[var(--brand-accent)]">
                <ListFilter className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">{copy.filterTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">{copy.filterDescription}</p>
              </div>
            </div>
            {statusFilter !== "all" || priorityFilter !== "all" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 justify-start gap-1.5 px-2.5 text-slate-600 hover:text-[var(--brand-primary)] dark:text-muted-foreground dark:hover:text-foreground"
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
              >
                <RotateCcw className="size-3.5" />
                {copy.clearFilters}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 border-t border-slate-200/80 pt-4 dark:border-border sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="complaint-status-filter" className={adminFilterLabelClass}>{copy.status}</Label>
              <Select
                items={[
                  { value: "all", label: copy.allStatuses },
                  ...statusOptions,
                ]}
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value ?? "all")}
              >
                <SelectTrigger id="complaint-status-filter" className={adminSelectTriggerClass}>
                  <SelectValue placeholder={copy.allStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.allStatuses}</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="capitalize">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="complaint-priority-filter" className={adminFilterLabelClass}>{copy.priority}</Label>
              <Select
                items={[
                  { value: "all", label: copy.allPriorities },
                  ...priorityOptions,
                ]}
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value ?? "all")}
              >
                <SelectTrigger id="complaint-priority-filter" className={adminSelectTriggerClass}>
                  <SelectValue placeholder={copy.allPriorities} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{copy.allPriorities}</SelectItem>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="capitalize">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      }
    />
    <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden border-l-slate-200 bg-slate-50 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[44rem] data-[side=right]:sm:max-w-[calc(100vw-2rem)] dark:border-l-border dark:bg-background">
        <SheetHeader className="relative overflow-hidden border-b border-slate-200 bg-white px-5 py-6 pr-14 sm:px-7 dark:border-border dark:bg-card">
          <div className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] blur-2xl" />
          <div className="relative flex flex-wrap items-center gap-2">
            <Badge className="border-[var(--brand-primary)]/15 bg-[var(--brand-primary)] font-mono text-white hover:bg-[var(--brand-primary)] dark:border-[var(--brand-accent)]/30 dark:bg-[var(--brand-accent)] dark:text-slate-950">
              {selected?.reference_number}
            </Badge>
            {selected ? (
              <>
                <Badge variant="outline" className="capitalize">{selected.category}</Badge>
                <Badge variant="outline" className={`capitalize ${statusBadgeClass(form.status)}`}>
                  {form.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className={`capitalize ${priorityBadgeClass(form.priority)}`}>
                  {form.priority}
                </Badge>
              </>
            ) : null}
          </div>
          <SheetTitle className={`${adminHeadingClass} relative mt-3 text-2xl leading-tight`}>
            {selected?.subject}
          </SheetTitle>
          <SheetDescription className="relative mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {selected ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.created_at)) : null}
            </span>
            <span>
              {copy.lastUpdated}: {selected ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(selected.updated_at)) : null}
            </span>
          </SheetDescription>
        </SheetHeader>

        {selected ? (
          <form id="manage-complaint" onSubmit={save} className="min-h-0 flex-1 divide-y divide-slate-200 overflow-y-auto px-4 dark:divide-border sm:px-7">
            <section className="space-y-4 py-5 sm:py-6">
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-[var(--brand-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">{copy.customerDetails}</h3>
              </div>
              <div className="flex items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-base font-bold text-white dark:bg-[var(--brand-accent)] dark:text-slate-950">
                  {selected.requester.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-foreground">{selected.requester.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{copy.requester}</p>
                  <div className="mt-3 grid gap-2.5 text-sm sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-2.5 text-slate-600 dark:text-muted-foreground">
                      <Mail className="size-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 break-all">{selected.requester.email}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-muted-foreground">
                      <Phone className="size-4 shrink-0 text-slate-400" />
                      <span>{selected.requester.mobile_number}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 py-5 sm:py-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-[var(--brand-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">{copy.complaintDetails}</h3>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-muted-foreground">{selected.description}</p>
              <div className="flex items-start gap-3 border-l-2 border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-primary)_3%,transparent)] px-4 py-3 dark:bg-muted/25">
                <span className="mt-0.5 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]">
                  {selected.ride_request ? <Route className="size-4" /> : <MapPin className="size-4" />}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{copy.relatedRide}</p>
                  <p className="mt-1 text-sm leading-5 font-medium text-slate-800 dark:text-foreground">
                    {selected.ride_request ? `${selected.ride_request.pickup_address} → ${selected.ride_request.dropoff_address}` : copy.noRide}
                  </p>
                </div>
              </div>
            </section>

            <section className="py-5 sm:py-6">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <UsersRound className="size-4 text-[var(--brand-accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">{copy.workflow}</h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.workflowDescription}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="complaint-status">{copy.status}</Label>
                  <Select items={statusOptions} disabled={!canWrite} value={form.status} onValueChange={(value) => value && setForm({ ...form, status: value as ComplaintStatus })}>
                    <SelectTrigger id="complaint-status" className={adminSelectTriggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent align="start"><SelectGroup>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}><span className="capitalize">{option.label}</span></SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complaint-priority">{copy.priority}</Label>
                  <Select items={priorityOptions} disabled={!canWrite} value={form.priority} onValueChange={(value) => value && setForm({ ...form, priority: value as ComplaintPriority })}>
                    <SelectTrigger id="complaint-priority" className={adminSelectTriggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent align="start"><SelectGroup>{priorityOptions.map((option) => <SelectItem key={option.value} value={option.value}><span className="capitalize">{option.label}</span></SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="py-5 sm:py-6">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-300" />
                  <h3 className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground">{copy.resolution}</h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.resolutionHint}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-response">{copy.response}</Label>
                <Textarea
                  id="complaint-response"
                  className="min-h-36 resize-y rounded-xl border-slate-200 bg-slate-50/60 leading-6 shadow-inner focus-visible:bg-white dark:border-border dark:bg-muted/40 dark:focus-visible:bg-muted/60"
                  maxLength={2000}
                  placeholder={copy.responsePlaceholder}
                  disabled={!canWrite}
                  value={form.admin_response}
                  onChange={(event) => setForm({ ...form, admin_response: event.target.value })}
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">{form.admin_response.length}/2000</p>
              </div>
            </section>
          </form>
        ) : null}

        <SheetFooter className="border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 dark:border-border dark:bg-card">
          {canWrite ? (
            <Button className={`${adminPrimaryButtonClass} w-full sm:w-auto`} type="submit" form="manage-complaint" disabled={saving}>
              {saving ? (locale === "am" ? "በማስቀመጥ ላይ..." : "Saving...") : copy.save}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{copy.readOnly}</p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>;
}
