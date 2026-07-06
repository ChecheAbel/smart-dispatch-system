"use client";

import { useCallback, useMemo, useState } from "react";
import { ClipboardCheck, Eye, MoreHorizontal } from "lucide-react";
import type { AccountActivation, AccountStatus, RequesterSegment, User } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMessage, getAdminUserRegistrationsMessages } from "@/translations";
import { fetchUsers } from "@/lib/user-api";
import { PERMISSIONS } from "@/lib/permissions";
import { adminBadgeGoldClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { RegistrationStats } from "./registration-stats";
import { ReviewRegistrationSheet } from "./review-registration-sheet";

type RegistrationStatusFilter = "all" | "pending" | "approved" | "rejected";

const REGISTRATION_STATUS_FILTERS: RegistrationStatusFilter[] = [
  "all",
  "pending",
  "approved",
  "rejected",
];

function formatUserName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

function requesterSegmentBadgeClass(segment: RequesterSegment) {
  switch (segment) {
    case "business":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "government":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
}

function statusFilters(status: RegistrationStatusFilter): {
  account_activation?: AccountActivation;
  account_status?: AccountStatus;
} {
  switch (status) {
    case "approved":
      return { account_activation: "activated" };
    case "rejected":
      return { account_status: "deactivated" };
    case "pending":
      return { account_activation: "pending", account_status: "active" };
    default:
      return {};
  }
}

function RegistrationRowActions({
  user,
  reviewLabel,
  menuLabel,
  onReview,
}: {
  user: User;
  reviewLabel: string;
  menuLabel: string;
  onReview: (user: User) => void;
}) {
  const name = formatUserName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(menuLabel, { name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onReview(user)}>
            <Eye />
            {reviewLabel}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserRegistrationsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminUserRegistrationsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.user_registrations.read);
  const canWrite = hasPermission(PERMISSIONS.user_registrations.write);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatusFilter>("pending");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewUserId, setReviewUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function bumpRefresh() {
    setRefreshKey((value) => value + 1);
  }

  const openReview = useCallback((user: User) => {
    setReviewUserId(user.id);
    setReviewOpen(true);
  }, []);

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "font-medium text-slate-800",
        cell: (user) => formatUserName(user),
      },
      {
        id: "email",
        header: copy.columns.email,
        cellClassName: "text-slate-500",
        cell: (user) => user.email,
      },
      {
        id: "mobile",
        header: copy.columns.mobile,
        cellClassName: "text-slate-500",
        cell: (user) => user.mobile_number,
      },
      {
        id: "accountType",
        header: copy.columns.accountType,
        cell: (user) =>
          user.requester_profile ? (
            <Badge
              variant="outline"
              className={cn("text-xs", requesterSegmentBadgeClass(user.requester_profile.segment))}
            >
              {copy.requesterSegment[user.requester_profile.segment]}
            </Badge>
          ) : (
            "—"
          ),
      },
      {
        id: "submitted",
        header: copy.columns.submitted,
        cellClassName: "text-slate-500",
        cell: (user) =>
          user.requester_profile?.created_at
            ? new Date(user.requester_profile.created_at).toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "—",
      },
    ],
    [copy, locale],
  );

  const loadRegistrations = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchUsers({
        page,
        limit,
        search: search || undefined,
        has_requester_profile: true,
        ...statusFilters(statusFilter),
      }),
    [statusFilter],
  );

  const renderRowActions = useCallback(
    (user: User, _context: DataTableRowContext<User>) => (
      <RegistrationRowActions
        user={user}
        reviewLabel={copy.actions.review}
        menuLabel={copy.actions.menuLabel}
        onReview={openReview}
      />
    ),
    [copy.actions.menuLabel, copy.actions.review, openReview],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <RegistrationStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={`${locale}-${statusFilter}`}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={columns}
        fetchData={loadRegistrations}
        getRowKey={(user) => user.id}
        showIndexColumn
        renderRowActions={renderRowActions}
        actionsColumnHeader={copy.columns.actions}
        minTableWidth="960px"
        emptyIcon={ClipboardCheck}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey, statusFilter]}
        toolbarActions={
          <Select
            items={REGISTRATION_STATUS_FILTERS.map((status) => ({
              label: copy.filters.statusOptions[status],
              value: status,
            }))}
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter((value as RegistrationStatusFilter | null) ?? "pending");
            }}
          >
            <SelectTrigger
              id="registration-status-filter"
              aria-label={copy.filters.status}
              className="h-10 w-full min-w-[11rem] rounded-lg border-slate-200 bg-white shadow-sm sm:w-[11rem]"
            >
              <SelectValue placeholder={copy.filters.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {REGISTRATION_STATUS_FILTERS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {copy.filters.statusOptions[status]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        }
      />

      <ReviewRegistrationSheet
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        userId={reviewUserId}
        locale={locale}
        canWrite={canWrite}
        onSuccess={bumpRefresh}
      />
    </div>
  );
}
