"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react";
import type {
  Complaint,
  ComplaintCategory,
  ComplaintStatus,
  ComplaintSummary,
  RideRequest,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  createComplaint,
  fetchComplaintSummary,
  fetchMyComplaints,
} from "@/lib/complaint-api";
import { adminPrimaryButtonClass } from "@/lib/admin-theme";
import { fetchRideRequests } from "@/lib/ride-request-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const categories: ComplaintCategory[] = [
  "trip",
  "driver",
  "vehicle",
  "billing",
  "service",
  "other",
];
const NO_RIDE = "none";

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

const labels = (am: boolean) => ({
  title: am ? "ቅሬታዎቼ" : "My complaints",
  description: am
    ? "ቅሬታ ያስገቡ እና የሂደቱን ሁኔታ ይከታተሉ።"
    : "Submit a concern and track how it is handled.",
  create: am ? "አዲስ ቅሬታ" : "New complaint",
  reference: am ? "ማጣቀሻ" : "Reference",
  subject: am ? "ርዕስ" : "Subject",
  category: am ? "ምድብ" : "Category",
  status: am ? "ሁኔታ" : "Status",
  submitted: am ? "የቀረበበት ጊዜ" : "Submitted",
  response: am ? "ምላሽ" : "Response",
  total: am ? "ጠቅላላ" : "Total",
  open: am ? "ክፍት" : "Open",
  resolved: am ? "የተፈታ" : "Resolved",
  noResponse: am ? "ገና ምላሽ የለም" : "Awaiting response",
  formDescription: am
    ? "ችግሩን በግልጽ ያብራሩ።"
    : "Describe the issue clearly so the support team can help.",
  relatedRide: am ? "ተዛማጅ ጉዞ (አማራጭ)" : "Related ride (optional)",
  none: am ? "የለም" : "None",
  details: am ? "ዝርዝር" : "Description",
  subjectPlaceholder: am
    ? "የቅሬታዎን አጭር ርዕስ ያስገቡ"
    : "Enter a short summary of your complaint",
  detailsPlaceholder: am
    ? "ምን እንደተከሰተ እና እንዴት እንድንረዳዎ እንደሚፈልጉ ያብራሩ"
    : "Describe what happened and how you would like us to help",
  submit: am ? "ቅሬታ አስገባ" : "Submit complaint",
  required: am ? "ሁሉንም አስፈላጊ መስኮች ይሙሉ።" : "Complete all required fields.",
  success: am ? "ቅሬታው ተልኳል።" : "Complaint submitted.",
  empty: am ? "ምንም ቅሬታ የለም" : "No complaints yet",
  statusLabels: {
    submitted: am ? "ቀርቧል" : "Submitted",
    under_review: am ? "በግምገማ ላይ" : "Under review",
    in_progress: am ? "በሂደት ላይ" : "In progress",
    resolved: am ? "ተፈቷል" : "Resolved",
    closed: am ? "ተዘግቷል" : "Closed",
    rejected: am ? "ውድቅ ሆኗል" : "Rejected",
  } satisfies Record<ComplaintStatus, string>,
});

export function CustomerComplaintsPage() {
  const { locale } = useLocale();
  const copy = labels(locale === "am");
  const { hasPermission } = useAuth();
  const canRead = hasPermission(PERMISSIONS.customer.complaints.read);
  const canWrite = hasPermission(PERMISSIONS.customer.complaints.write);
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<ComplaintSummary | null>(null);
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "service" as ComplaintCategory,
    subject: "",
    description: "",
    ride_request_id: "",
  });
  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category, label: category.replace("_", " ") })),
    [],
  );
  const rideOptions = useMemo(
    () => [
      { value: NO_RIDE, label: copy.none },
      ...rides.map((ride) => ({
        value: ride.id,
        label: `${ride.pickup_address} → ${ride.dropoff_address}`,
      })),
    ],
    [copy.none, rides],
  );
  useEffect(() => {
    if (!canRead) return;
    void fetchComplaintSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [canRead, refresh]);
  useEffect(() => {
    if (!open) return;
    void fetchRideRequests({ page: 1, limit: 100, locale })
      .then((r) => setRides(r.data))
      .catch(() => setRides([]));
  }, [locale, open]);
  const load = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchMyComplaints({ page, limit, search: search || undefined }),
    [],
  );
  const columns = useMemo<DataTableColumn<Complaint>[]>(
    () => [
      {
        id: "reference",
        header: copy.reference,
        cell: (row) => (
          <span className="font-mono text-sm font-semibold text-[#1C3A34] dark:text-foreground">
            {row.reference_number}
          </span>
        ),
      },
      {
        id: "subject",
        header: copy.subject,
        cell: (row) => (
          <div className="max-w-72">
            <p className="font-medium text-slate-800 dark:text-foreground">{row.subject}</p>
            <p className="truncate text-xs text-muted-foreground">{row.description}</p>
          </div>
        ),
      },
      {
        id: "category",
        header: copy.category,
        cell: (row) => <span className="capitalize">{row.category.replace("_", " ")}</span>,
      },
      {
        id: "status",
        header: copy.status,
        cell: (row) => (
          <Badge
            variant="outline"
            className={cn("font-semibold capitalize", statusBadgeClass(row.status))}
          >
            {copy.statusLabels[row.status]}
          </Badge>
        ),
      },
      {
        id: "response",
        header: copy.response,
        cell: (row) => {
          const response = row.admin_response?.trim();
          if (!response) {
            return (
              <div className="inline-flex max-w-72 items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
                <Clock3 className="size-3.5 shrink-0" />
                <span>{copy.noResponse}</span>
              </div>
            );
          }

          return (
            <p
              className="line-clamp-2 max-w-80 text-sm leading-relaxed text-slate-700 dark:text-foreground/90"
              title={response}
            >
              {response}
            </p>
          );
        },
      },
      {
        id: "created",
        header: copy.submitted,
        cell: (row) =>
          new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
            new Date(row.created_at),
          ),
      },
    ],
    [copy, locale],
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      return showErrorToast({ title: copy.required });
    }
    setSubmitting(true);
    try {
      await createComplaint({
        ...form,
        subject: form.subject.trim(),
        description: form.description.trim(),
        ride_request_id: form.ride_request_id || null,
      });
      showSuccessToast({ title: copy.success });
      setForm({ category: "service", subject: "", description: "", ride_request_id: "" });
      setOpen(false);
      setRefresh((v) => v + 1);
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.required,
      });
    } finally {
      setSubmitting(false);
    }
  }
  if (!canRead) {
    return (
      <PageAccessDenied
        fallbackPath="/dashboard"
        copy={{
          eyebrow: "Restricted",
          title: "Access denied",
          description: "You do not have permission to view complaints.",
          permissionNote: "Complaint permission required",
          sessionHint: "Ask an administrator to grant customer complaint access.",
          goToDashboard: "Go to dashboard",
        }}
      />
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={copy.total}
          value={summary?.total ?? 0}
          description={copy.description}
          icon={MessageSquare}
          loading={!summary}
        />
        <StatCard
          title={copy.open}
          value={summary?.open ?? 0}
          description={copy.noResponse}
          icon={CircleAlert}
          loading={!summary}
        />
        <StatCard
          title={copy.resolved}
          value={summary?.resolved ?? 0}
          description={copy.response}
          icon={CheckCircle2}
          loading={!summary}
        />
      </div>
      <DataTable
        title={copy.title}
        description={copy.description}
        columns={columns}
        fetchData={load}
        getRowKey={(r) => r.id}
        showIndexColumn
        refreshDeps={[refresh]}
        emptyIcon={MessageSquare}
        emptyTitle={copy.empty}
        toolbarActions={
          canWrite ? (
            <Button className={adminPrimaryButtonClass} onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              {copy.create}
            </Button>
          ) : null
        }
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{copy.create}</SheetTitle>
            <SheetDescription>{copy.formDescription}</SheetDescription>
          </SheetHeader>
          <form id="complaint-form" onSubmit={submit} className="space-y-5 px-4">
            <div className="space-y-2">
              <Label>{copy.category}</Label>
              <Select
                items={categoryOptions}
                value={form.category}
                onValueChange={(value) =>
                  value && setForm({ ...form, category: value as ComplaintCategory })
                }
              >
                <SelectTrigger className="w-full bg-background capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="capitalize">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{copy.relatedRide}</Label>
              <Select
                items={rideOptions}
                value={form.ride_request_id || NO_RIDE}
                onValueChange={(value) =>
                  value &&
                  setForm({ ...form, ride_request_id: value === NO_RIDE ? "" : value })
                }
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {rideOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} multiline>
                        <span className="line-clamp-2">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{copy.subject}</Label>
              <Input
                maxLength={200}
                placeholder={copy.subjectPlaceholder}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{copy.details}</Label>
              <textarea
                className="min-h-36 w-full rounded-md border bg-background p-3 text-sm placeholder:text-muted-foreground"
                maxLength={2000}
                placeholder={copy.detailsPlaceholder}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </form>
          <SheetFooter>
            <Button
              className={adminPrimaryButtonClass}
              type="submit"
              form="complaint-form"
              disabled={submitting}
            >
              <Send className="size-4" />
              {copy.submit}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
