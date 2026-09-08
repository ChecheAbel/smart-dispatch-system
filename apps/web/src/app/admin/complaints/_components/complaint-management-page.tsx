"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Car,
  MessageSquare,
  Pencil,
} from "lucide-react";
import type {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintSummary,
} from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { DataTable, type DataTableColumn, type DataTableFetchParams } from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Button } from "@/components/ui/button";
import { fetchAdminComplaints, fetchComplaintSummary } from "@/lib/complaint-api";
import { PERMISSIONS } from "@/lib/permissions";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  getComplaintUiStrings,
} from "./complaint-ui-strings";
import { getCategoryBadge, getPriorityBadge, getStatusBadge } from "./complaint-badges";
import { ComplaintStats } from "./complaint-stats";
import { ComplaintFilterBar } from "./complaint-filter-bar";
import { ManageComplaintSheet } from "./manage-complaint-sheet";

export function ComplaintManagementPage() {
  const { locale } = useLocale();
  const copy = useMemo(() => getComplaintUiStrings(locale === "am"), [locale]);
  const { hasPermission } = useAuth();

  const canRead = hasPermission(PERMISSIONS.complaints.read);
  const canWrite = hasPermission(PERMISSIONS.complaints.write);

  const [summary, setSummary] = useState<ComplaintSummary | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Complaint | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const statusOptions = useMemo(
    () =>
      STATUSES.map((value) => ({
        value,
        label: copy.statuses[value] || value,
      })),
    [copy.statuses],
  );

  const priorityOptions = useMemo(
    () =>
      PRIORITIES.map((value) => ({
        value,
        label: copy.priorities[value] || value,
      })),
    [copy.priorities],
  );

  const categoryOptions = useMemo(
    () =>
      CATEGORIES.map((value) => ({
        value,
        label: copy.categories[value] || value,
      })),
    [copy.categories],
  );

  const statusFilterOptions = useMemo(
    () => [{ value: "all", label: copy.allStatuses }, ...statusOptions],
    [copy.allStatuses, statusOptions],
  );

  const priorityFilterOptions = useMemo(
    () => [{ value: "all", label: copy.allPriorities }, ...priorityOptions],
    [copy.allPriorities, priorityOptions],
  );

  const categoryFilterOptions = useMemo(
    () => [{ value: "all", label: copy.allCategories }, ...categoryOptions],
    [copy.allCategories, categoryOptions],
  );

  useEffect(() => {
    if (!canRead) return;
    void fetchComplaintSummary(true)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [canRead, refresh]);

  const load = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchAdminComplaints({
        page,
        limit,
        search: search || undefined,
        status: statusFilter === "all" ? undefined : (statusFilter as ComplaintStatus),
        priority: priorityFilter === "all" ? undefined : (priorityFilter as ComplaintPriority),
        category: categoryFilter === "all" ? undefined : (categoryFilter as ComplaintCategory),
      }),
    [categoryFilter, priorityFilter, statusFilter],
  );

  const columns = useMemo<DataTableColumn<Complaint>[]>(
    () => [
      {
        id: "reference",
        header: copy.reference,
        cell: (r) => (
          <button
            type="button"
            onClick={() => setSelected(r)}
            className="font-mono text-xs font-bold text-[var(--brand-primary)] hover:underline dark:text-[var(--brand-accent)]"
          >
            {r.reference_number}
          </button>
        ),
      },
      {
        id: "requester",
        header: copy.requester,
        cell: (r) => (
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-xs font-bold text-[var(--brand-primary)] dark:bg-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)] dark:text-[var(--brand-accent)]">
              {r.requester.name ? r.requester.name.slice(0, 1).toUpperCase() : "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-foreground">
                {r.requester.name}
              </p>
              <p className="truncate text-[11px] text-slate-400 dark:text-muted-foreground">
                {r.requester.mobile_number || r.requester.email || "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "category",
        header: copy.category,
        cell: (r) => getCategoryBadge(r.category, copy),
      },
      {
        id: "subject",
        header: copy.complaint,
        cell: (r) => (
          <div className="max-w-xs xl:max-w-md">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-foreground">
              {r.subject}
            </p>
            <p className="line-clamp-1 text-[11px] text-slate-500 dark:text-muted-foreground">
              {r.description}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: copy.status,
        cell: (r) => getStatusBadge(r.status, copy),
      },
      {
        id: "priority",
        header: copy.priority,
        cell: (r) => getPriorityBadge(r.priority, copy),
      },
      {
        id: "ride",
        header: copy.relatedRide,
        cell: (r) =>
          r.ride_request_id ? (
            <Link
              href={`/admin/dispatch/rides/${r.ride_request_id}`}
              className="group inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-white hover:text-[var(--brand-primary)] dark:border-border dark:bg-muted/40 dark:text-muted-foreground dark:hover:text-[var(--brand-accent)]"
            >
              <Car className="size-3 text-slate-400 group-hover:text-[var(--brand-primary)] dark:group-hover:text-[var(--brand-accent)]" />
              <span>{r.ride_request_id.slice(0, 8)}</span>
            </Link>
          ) : (
            <span className="text-xs text-slate-400 dark:text-muted-foreground">—</span>
          ),
      },
      {
        id: "created_at",
        header: copy.submitted,
        cell: (r) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-muted-foreground">
            <Calendar className="size-3.5 shrink-0 text-slate-400" />
            <span>
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(r.created_at))}
            </span>
          </div>
        ),
      },
    ],
    [copy, locale],
  );

  const isFiltered = statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all";

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      {/* Interactive Metric Cards */}
      <ComplaintStats
        summary={summary}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        categoryFilter={categoryFilter}
        onSelectFilter={(status, priority, category) => {
          setStatusFilter(status);
          setPriorityFilter(priority);
          setCategoryFilter(category);
        }}
        copy={copy.stats}
      />

      {/* Main Complaints Table */}
      <DataTable
        title={copy.title}
        description={copy.description}
        columns={columns}
        fetchData={load}
        getRowKey={(r) => r.id}
        showIndexColumn
        refreshDeps={[refresh, statusFilter, priorityFilter, categoryFilter]}
        emptyIcon={MessageSquare}
        emptyTitle={copy.empty}
        emptyDescription={copy.emptyDescription}
        actionsColumnHeader={copy.manage}
        renderRowActions={(r) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] dark:text-[var(--brand-accent)] dark:hover:bg-[var(--brand-accent)]/10"
            aria-label={copy.manage}
            onClick={() => setSelected(r)}
          >
            <Pencil className="size-3.5" />
            <span>{copy.manage}</span>
          </Button>
        )}
        minTableWidth="1100px"
        filterBar={
          <ComplaintFilterBar
            copy={copy}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statusFilterOptions={statusFilterOptions}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            priorityFilterOptions={priorityFilterOptions}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categoryFilterOptions={categoryFilterOptions}
            isFiltered={isFiltered}
            onClearFilters={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
              setCategoryFilter("all");
            }}
          />
        }
      />

      {/* Complaint Details & Workflow Resolution Sheet */}
      <ManageComplaintSheet
        selected={selected}
        onClose={() => setSelected(null)}
        canWrite={canWrite}
        locale={locale}
        copy={copy}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        onSaved={() => setRefresh((prev) => prev + 1)}
      />
    </div>
  );
}
